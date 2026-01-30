'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { TrophyIcon, StarIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Flame, Camera } from 'lucide-react';
import BadgePopup from '@/components/gamification/BadgePopup';
import { Badge, BadgeData, Rarity } from '@/components/gamification/Badge';
import { checkAndAwardBadges } from '@/lib/utils/awardBadges';

// Type for leaderboard row
interface LeaderboardRow {
  user_id: string;
  points: number;
  current_streak: number;
  global_rank: number;
  email: string | null;
  display_name: string | null;
  raw_user_meta_data: {
    full_name?: string;
    display_name?: string;
    avatar_url?: string;
  } | null;
}

export default function StudentDashboard() {
  const [profile, setProfile] = useState<{ full_name: string; display_name: string; avatar_url: string | null } | null>(null);
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousPointsRef = useRef(0);
  const previousStreakRef = useRef(0);
  const previousBadgeCountRef = useRef(0);


  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUploadingAvatar(true);

    // Optimistic: Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setProfile(prev => prev ? { ...prev, avatar_url: previewUrl } : null);

    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });

    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user.id);
      // Update with real URL
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
    } else {
      // Rollback on error
      setProfile(prev => prev ? { ...prev, avatar_url: profile?.avatar_url || null } : null);
    }

    setUploadingAvatar(false);
  };

  const loadData = useCallback(async (userId: string) => {
    const [profileRes, gamificationRes, badgesRes] = await Promise.all([
      supabase.from('users').select('full_name, display_name, avatar_url').eq('id', userId).single(),
      supabase.from('gamification').select('points, current_streak, first_login_completed').eq('user_id', userId).maybeSingle(),
      supabase.from('user_badges').select('earned_at, badges (id, name, description, icon, rarity)').eq('user_id', userId).order('earned_at', { ascending: false })
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data);
    }

    if (gamificationRes.data) {
      const pts = gamificationRes.data.points ?? 0;
      setPoints(pts);
      setLevel(Math.floor(pts / 100) + 1);
      setStreak(gamificationRes.data.current_streak ?? 0);
      
      previousPointsRef.current = pts;
      previousStreakRef.current = gamificationRes.data.current_streak ?? 0;
    }

    // Get user's rank from the leaderboard function
    const { data: rankRes, error: rankError } = await supabase.rpc('get_leaderboard_with_rank');
    
    if (rankError) {
      console.error('Rank fetch error:', rankError);
    } else if (rankRes && Array.isArray(rankRes)) {
      const userRankData = (rankRes as LeaderboardRow[]).find((row) => row.user_id === userId);
      if (userRankData) {
        setGlobalRank(Number(userRankData.global_rank));
      }
    }

    if (badgesRes.data) {
      type UserBadgeResponse = {
        earned_at: string;
        badges: { id: string; name: string; description: string | null; icon: string; rarity: Rarity };
      };

      const earnedBadges: BadgeData[] = (badgesRes.data as unknown as UserBadgeResponse[]).map(row => ({
        id: row.badges.id,
        name: row.badges.name,
        description: row.badges.description,
        icon: row.badges.icon as keyof typeof import('@/components/gamification/Badge').ICON_MAP,
        rarity: row.badges.rarity as Rarity,
      }));

      setBadges(earnedBadges);
      previousBadgeCountRef.current = earnedBadges.length;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let pollingInterval: NodeJS.Timeout;

    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      await loadData(user.id);
      
      // Check for badges initially
      await checkAndAwardBadges(user.id);

      // Aggressive polling for optimistic feel (every 2 seconds)
      pollingInterval = setInterval(async () => {
        if (!isMounted) return;

        // Quick check for changes
        const { data: gamificationData } = await supabase
          .from('gamification')
          .select('points, current_streak')
          .eq('user_id', user.id)
          .maybeSingle();

        const { count: badgeCount } = await supabase
          .from('user_badges')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        let hasChanges = false;

        // Check if points changed
        if (gamificationData && gamificationData.points !== previousPointsRef.current) {
          setPoints(gamificationData.points);
          setLevel(Math.floor(gamificationData.points / 100) + 1);
          previousPointsRef.current = gamificationData.points;
          hasChanges = true;
        }

        // Check if streak changed
        if (gamificationData && gamificationData.current_streak !== previousStreakRef.current) {
          setStreak(gamificationData.current_streak);
          previousStreakRef.current = gamificationData.current_streak;
          hasChanges = true;
        }

        // Check if badge count changed
        if (badgeCount !== null && badgeCount !== previousBadgeCountRef.current) {
          // Reload badges
          const { data: badgesRes } = await supabase
            .from('user_badges')
            .select('earned_at, badges (id, name, description, icon, rarity)')
            .eq('user_id', user.id)
            .order('earned_at', { ascending: false });

          if (badgesRes) {
            type UserBadgeResponse = {
              earned_at: string;
              badges: { id: string; name: string; description: string | null; icon: string; rarity: Rarity };
            };

            const earnedBadges: BadgeData[] = (badgesRes as unknown as UserBadgeResponse[]).map(row => ({
              id: row.badges.id,
              name: row.badges.name,
              description: row.badges.description,
              icon: row.badges.icon as keyof typeof import('@/components/gamification/Badge').ICON_MAP,
              rarity: row.badges.rarity as Rarity,
            }));

            setBadges(earnedBadges);
            previousBadgeCountRef.current = earnedBadges.length;
          }
          hasChanges = true;
        }

        // If anything changed, check for new badges and update rank
        if (hasChanges) {
          await checkAndAwardBadges(user.id);
          
          // Update rank using RPC
          const { data: rankRes, error: rankError } = await supabase.rpc('get_leaderboard_with_rank');
          if (rankError) {
            console.error('Rank update error:', rankError);
          } else if (rankRes && Array.isArray(rankRes)) {
            const userRankData = (rankRes as LeaderboardRow[]).find((row) => row.user_id === user.id);
            if (userRankData) {
              setGlobalRank(Number(userRankData.global_rank));
            }
          }
        }
      }, 2000); // Poll every 2 seconds for near-instant updates
    };

    initialize();

    // Also use realtime as backup
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gamification' }, async (payload) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;
        
        const newData = payload.new as { user_id?: string; points?: number; current_streak?: number } | null;
        
        if (newData && newData.user_id === user.id) {
          const newPoints = newData.points ?? 0;
          const newStreak = newData.current_streak ?? 0;
          
          setPoints(newPoints);
          setLevel(Math.floor(newPoints / 100) + 1);
          setStreak(newStreak);
          
          previousPointsRef.current = newPoints;
          previousStreakRef.current = newStreak;

          await checkAndAwardBadges(user.id);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_badges' }, async (payload) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        const newBadge = payload.new as { user_id?: string; badge_id?: string } | null;

        if (newBadge && newBadge.user_id === user.id && newBadge.badge_id) {
          // Optimistically fetch and add the new badge
          const { data: badgeData } = await supabase
            .from('badges')
            .select('id, name, description, icon, rarity')
            .eq('id', newBadge.badge_id)
            .single();

          if (badgeData) {
            setBadges(prev => {
              if (prev.some(b => b.id === badgeData.id)) return prev;
              return [
                {
                  id: badgeData.id,
                  name: badgeData.name,
                  description: badgeData.description,
                  icon: badgeData.icon as keyof typeof import('@/components/gamification/Badge').ICON_MAP,
                  rarity: badgeData.rarity as Rarity,
                },
                ...prev
              ];
            });
          }
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      if (pollingInterval) clearInterval(pollingInterval);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const displayName = profile?.display_name || 'Student';

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
                  width={80}
                  height={80}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover ring-4 ring-purple-500/60 shadow-2xl"
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={uploadAvatar}
                className="hidden"
              />
              <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full ring-4 ring-black animate-pulse" />
            </div>
          </div>

          {/* Welcome Message */}
          <motion.h1
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl lg:text-8xl font-black bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent text-center"
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
                  <StarIcon className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 text-yellow-400" />
                </div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={points}
                    initial={{ scale: 1.3, opacity: 0, y: -20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.7, opacity: 0, y: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="text-4xl md:text-5xl lg:text-6xl font-black text-white"
                  >
                    {points.toLocaleString()}
                  </motion.p>
                </AnimatePresence>
                <p className="text-xl text-gray-300 mt-2">Total XP</p>
              </div>

              <div className="text-center">
                <div className="mx-auto w-36 h-36 bg-gradient-to-br from-orange-600/40 to-red-700/40 rounded-3xl border-4 border-orange-500/50 flex items-center justify-center mb-6 shadow-2xl">
                  <Flame className="w-14 h-14 md:w-18 md:h-18 lg:w-24 lg:h-24 text-orange-400 animate-pulse" />
                </div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={streak}
                    initial={{ scale: 1.3, opacity: 0, rotate: -10 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.7, opacity: 0, rotate: 10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="text-4xl md:text-5xl lg:text-6xl font-black bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent"
                  >
                    {streak}
                  </motion.p>
                </AnimatePresence>
                <p className="text-xl text-gray-300 mt-2">Day Streak</p>
                <AnimatePresence>
                  {streak >= 7 && (
                    <motion.p
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="text-orange-400 font-bold animate-pulse mt-2"
                    >
                      ON FIRE!
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="text-center">
                <div className="mx-auto w-36 h-36 bg-gradient-to-br from-purple-600/40 to-pink-700/40 rounded-3xl border-4 border-purple-500/50 flex items-center justify-center mb-6 shadow-2xl">
                  <TrophyIcon className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 text-purple-400" />
                </div>
                <p className="text-4xl md:text-5xl lg:text-6xl font-black text-purple-300">
                  #{globalRank === null ? '—' : globalRank}
                </p>
                <p className="text-xl text-gray-300 mt-2">Global Rank</p>
              </div>
            </div>

            {/* Badge Preview */}
            <Link href="/dashboard/student/badges" className="block">
              <motion.div whileHover={{ scale: 1.02 }} className="text-center">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black mb-8 bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  Your Trophy Room ({badges.length})
                </h2>
                <div className="flex justify-center gap-6 flex-wrap min-h-[120px]">
                  <AnimatePresence mode="popLayout">
                    {badges.length === 0 ? (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-3xl border-4 border-dashed border-white/30 flex items-center justify-center"
                      >
                        <span className="text-white/50 text-5xl">+</span>
                      </motion.div>
                    ) : (
                      badges.slice(0, 8).map((badge, i) => (
                        <motion.div
                          key={badge.id}
                          initial={{ scale: 0, rotate: -180, opacity: 0 }}
                          animate={{ scale: 1, rotate: 0, opacity: 1 }}
                          exit={{ scale: 0, rotate: 180, opacity: 0 }}
                          transition={{ 
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                            delay: i * 0.05
                          }}
                          layout
                        >
                          <Badge badge={badge} size="md" />
                        </motion.div>
                      ))
                    )}
                    {badges.length > 8 && (
                      <motion.div
                        key="overflow"
                        layout
                        className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-3xl border-4 border-dashed border-white/30 flex items-center justify-center"
                      >
                        <span className="text-white/50 text-4xl font-bold">+{badges.length - 8}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white/10 backdrop-blur-3xl border-2 border-white/20 rounded-3xl p-12 text-center hover:bg-white/20 transition-all shadow-2xl flex flex-col justify-center"
              >
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">My Courses</h3>
                <p className="text-xl text-gray-300">Continue your journey</p>
              </motion.div>
            </Link>

            <Link href="/dashboard/student/leaderboard">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 rounded-3xl p-12 text-center shadow-2xl flex flex-col items-center justify-center"
              >
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 text-white">Leaderboard</h3>
                <p className="text-xl text-white/90">See who&#39;s dominating</p>
              </motion.div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}