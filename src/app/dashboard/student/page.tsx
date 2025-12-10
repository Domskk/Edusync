// src/app/dashboard/student/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrophyIcon, StarIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Flame, Camera } from 'lucide-react';
import BadgePopup from '@/components/gamification/BadgePopup';
import { Badge, BadgeData, Rarity } from '@/components/gamification/Badge';
import { checkAndAwardBadges } from '@/lib/utils/awardBadges';

// Type returned by our RPC function
type UserRankRow = {
  global_rank: number;
};

export default function StudentDashboard() {
  const [profile, setProfile] = useState<{ full_name: string; display_name: string; avatar_url: string | null } | null>(null);
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUploadingAvatar(true);
    const previewUrl = URL.createObjectURL(file);
    setProfile(prev => prev ? { ...prev, avatar_url: previewUrl } : null);

    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user.id);
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
    }
    setUploadingAvatar(false);
  };

  const saveDisplayName = async () => {
    if (!newDisplayName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('users').update({ display_name: newDisplayName.trim() }).eq('id', user.id);
    setProfile(prev => prev ? { ...prev, display_name: newDisplayName.trim() } : null);
    setShowNameModal(false);
    setNewDisplayName('');
  };

  const loadData = async (userId: string) => {
    // Profile
    const { data: profileData } = await supabase
      .from('users')
      .select('full_name, display_name, avatar_url')
      .eq('id', userId)
      .single();

    setProfile(profileData);
    if (!profileData?.display_name) setShowNameModal(true);

    // Stats + Badges in parallel
    const [{ data: gamification }, { data: badgeRows }] = await Promise.all([
      supabase.from('gamification').select('points, current_streak').eq('user_id', userId).single(),
      supabase.from('user_badges').select(`
        earned_at,
        badges (
          id, name, description, icon, rarity
        )
      `).eq('user_id', userId)
    ]);

    const pts = gamification?.points || 0;
    setPoints(pts);
    setLevel(Math.floor(pts / 100) + 1);
    setStreak(gamification?.current_streak || 0);

    // ACCURATE GLOBAL RANK — same as leaderboard
    const { data: rankData } = await supabase
      .rpc('get_leaderboard_with_rank')
      .eq('user_id', userId)
      .select('global_rank')
      .single() as { data: UserRankRow | null };

    setGlobalRank(rankData?.global_rank ?? null);

    // Badges (fully typed)
 type UserBadgeResponse = {
            earned_at: string;
            badges: {
              id: string;
              name: string;
              description: string | null;
              icon: string;
              rarity: Rarity;
            };
          };
          
        const earnedBadges: BadgeData[] = (badgeRows as unknown as UserBadgeResponse[] || []).map(row => ({
                id: row.badges.id,
                name: row.badges.name,
                description: row.badges.description,
                icon: row.badges.icon as keyof typeof import('@/components/gamification/Badge').ICON_MAP,
                rarity: row.badges.rarity as Rarity,
              }));
    setBadges(earnedBadges);
  }

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await loadData(user.id);
      await checkAndAwardBadges(user.id);
    };

    init();

    const channel = supabase
      .channel('student-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gamification' }, async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && isMounted) {
          await loadData(user.id);
          await checkAndAwardBadges(user.id);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_badges' }, async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && isMounted) await loadData(user.id);
      })
      .subscribe();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && isMounted) {
        await loadData(session.user.id);
        await checkAndAwardBadges(session.user.id);
      }
    });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const displayName = profile?.display_name || profile?.full_name || 'Student';

  return (
    <>
      <BadgePopup />
      <div className="min-h-screen p-8 md:p-12 lg:p-16 bg-gradient-to-br from-purple-900 via-black to-indigo-900">
        <div className="max-w-7xl mx-auto space-y-12">

          {/* Profile Header */}
          <div className="flex justify-end items-center gap-6 mb-8">
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{displayName}</p>
              <p className="text-lg text-gray-400">
                Level {level} • Rank #{globalRank === null ? '—' : globalRank}
              </p>
            </div>
            <div className="relative group">
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
                <Image
                  src={profile?.avatar_url || '/default-avatar.png'}
                  alt={displayName}
                  width={80} height={80}
                  className="rounded-full object-cover ring-4 ring-purple-500/60 shadow-2xl"
                  priority
                  unoptimized
                />
                <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploadingAvatar ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                      <SparklesIcon className="w-8 h-8 text-white" />
                    </motion.div>
                  ) : (
                    <Camera className="w-8 h-8 text-white" />
                  )}
                </div>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
              <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full ring-4 ring-black animate-pulse" />
            </div>
          </div>

          {/* Welcome Message */}
          <motion.h1
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-black bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent text-center"
          >
            Welcome back, {displayName.split(' ')[0]}!
          </motion.h1>

          {/* Main Stats Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/90 via-pink-900/80 to-indigo-900/90 backdrop-blur-3xl border-2 border-purple-500/30 shadow-3xl p-10 md:p-16"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 mb-16">
              <div className="text-center">
                <div className="mx-auto w-36 h-36 bg-gradient-to-br from-yellow-600/40 to-orange-700/40 rounded-3xl border-4 border-yellow-500/50 flex items-center justify-center mb-6 shadow-2xl">
                  <StarIcon className="w-20 h-20 text-yellow-400" />
                </div>
                <p className="text-6xl font-black text-white">{points.toLocaleString()}</p>
                <p className="text-xl text-gray-300 mt-2">Total XP</p>
              </div>

              <div className="text-center">
                <div className="mx-auto w-36 h-36 bg-gradient-to-br from-orange-600/40 to-red-700/40 rounded-3xl border-4 border-orange-500/50 flex items-center justify-center mb-6 shadow-2xl">
                  <Flame className="w-24 h-24 text-orange-400 animate-pulse" />
                </div>
                <p className="text-6xl font-black bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">{streak}</p>
                <p className="text-xl text-gray-300 mt-2">Day Streak</p>
                {streak >= 7 && <p className="text-orange-400 font-bold animate-pulse mt-2">ON FIRE!</p>}
              </div>

              <div className="text-center">
                <div className="mx-auto w-36 h-36 bg-gradient-to-br from-purple-600/40 to-pink-700/40 rounded-3xl border-4 border-purple-500/50 flex items-center justify-center mb-6 shadow-2xl">
                  <TrophyIcon className="w-20 h-20 text-purple-400" />
                </div>
                <p className="text-6xl font-black text-purple-300">
                  #{globalRank === null ? '—' : globalRank}
                </p>
                <p className="text-xl text-gray-300 mt-2">Global Rank</p>
              </div>
            </div>

            {/* Badge Preview */}
            <Link href="/dashboard/student/badges" className="block">
              <motion.div whileHover={{ scale: 1.02 }} className="text-center">
                <h2 className="text-4xl font-black mb-8 bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  Your Trophy Room ({badges.length})
                </h2>
                <div className="flex justify-center gap-6 flex-wrap">
                  {badges.length === 0 ? (
                    <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-3xl border-4 border-dashed border-white/30 flex items-center justify-center">
                      <span className="text-white/50 text-5xl">+</span>
                    </div>
                  ) : (
                    badges.slice(0, 8).map((badge, i) => (
                      <motion.div
                        key={badge.id}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: i * 0.06 }}
                      >
                        <Badge badge={badge} size="md" />
                      </motion.div>
                    ))
                  )}
                  {badges.length > 8 && (
                    <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-3xl border-4 border-dashed border-white/30 flex items-center justify-center">
                      <span className="text-white/50 text-4xl font-bold">+{badges.length - 8}</span>
                    </div>
                  )}
                </div>
                <p className="mt-8 text-yellow-400 font-bold text-lg hover:underline">
                  View All Badges
                </p>
              </motion.div>
            </Link>
          </motion.div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <Link href="/dashboard/student/courses">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}
                className="bg-white/10 backdrop-blur-3xl border-2 border-white/20 rounded-3xl p-12 text-center hover:bg-white/20 transition-all shadow-2xl">
                <h3 className="text-4xl font-bold mb-4">My Courses</h3>
                <p className="text-xl text-gray-300">Continue your journey</p>
              </motion.div>
            </Link>

            <Link href="/dashboard/student/leaderboard">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 rounded-3xl p-12 text-center shadow-2xl flex flex-col items-center justify-center">
                <h3 className="text-4xl font-bold mb-4 text-white">Leaderboard</h3>
                <p className="text-xl text-white/90">See who’s dominating</p>
              </motion.div>
            </Link>
          </div>
        </div>
      </div>

      {/* First Login Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-6">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-purple-900 to-pink-900 rounded-3xl p-12 max-w-md w-full border-4 border-purple-500 shadow-2xl">
            <h2 className="text-4xl font-black text-white mb-6 text-center">Welcome!</h2>
            <p className="text-xl text-gray-200 text-center mb-8">Choose your display name</p>
            <input
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-6 py-5 bg-white/10 border-2 border-white/20 rounded-2xl text-white text-xl text-center focus:outline-none focus:border-yellow-400"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && saveDisplayName()}
            />
            <button
              onClick={saveDisplayName}
              disabled={!newDisplayName.trim()}
              className="mt-8 w-full py-5 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold text-2xl rounded-2xl hover:scale-105 transition disabled:opacity-50"
            >
              Start Your Journey
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}