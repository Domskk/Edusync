'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { RankBorder } from '@/components/gamification/RankBorder';
import { Flame, Trophy, Crown, Search, ArrowLeft, Zap } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion'; // This is correct

// === Types ===
type RankType = 'Mythic' | 'Legend' | 'Master' | 'Elite' | 'Warrior' | 'Rookie';

type LeaderboardRow = {
  user_id: string;
  points: number;
  current_streak: number;
  email: string | null;
  raw_user_meta_data: {
    full_name?: string;
    display_name?: string;
    avatar_url?: string;
  } | null;
};

interface LeaderboardUser {
  id: string;
  name: string;
  avatar_url: string | null;
  points: number;
  level: number;
  current_streak: number;
  rank: RankType;
  position: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [filtered, setFiltered] = useState<LeaderboardUser[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const getRank = (level: number): RankType =>
    level >= 50 ? 'Mythic' :
    level >= 40 ? 'Legend' :
    level >= 30 ? 'Master' :
    level >= 20 ? 'Elite' :
    level >= 10 ? 'Warrior' : 'Rookie';

  const loadLeaderboard = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .rpc('get_leaderboard_with_profiles')
      .select('*');

    if (error || !data) {
      console.error('Leaderboard error:', error);
      return;
    }

    const processed: LeaderboardUser[] = (data as LeaderboardRow[]).map((row, index) => {
      const points = row.points ?? 0;
      const level = Math.floor(points / 100) + 1;
      const meta = row.raw_user_meta_data;
      return {
        id: row.user_id,
        name: meta?.display_name || meta?.full_name || row.email?.split('@')[0] || 'Student',
        avatar_url: meta?.avatar_url || null,
        points,
        level,
        current_streak: row.current_streak || 0,
        rank: getRank(level),
        position: index + 1,
      };
    });

    setLeaders(processed);
    setFiltered(processed);
    setCurrentUser(processed.find(p => p.id === user.id) || null);
  }, []);

  useEffect(() => {
    loadLeaderboard();

    const channel = supabase
      .channel('leaderboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gamification' }, loadLeaderboard)
      .on('postgres_changes', { event: '*', schema: 'auth', table: 'users' }, loadLeaderboard)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadLeaderboard]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(leaders.filter(u => u.name.toLowerCase().includes(q)));
    setPage(1);
  }, [search, leaders]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const getRankGradient = (rank: RankType) => {
    const map: Record<RankType, string> = {
      Mythic: 'from-purple-500 to-pink-500',
      Legend: 'from-red-500 to-orange-500',
      Master: 'from-cyan-400 to-blue-600',
      Elite: 'from-green-400 to-emerald-600',
      Warrior: 'from-yellow-400 to-amber-600',
      Rookie: 'from-gray-400 to-gray-600',
    };
    return map[rank];
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#0a0a0d] via-[#0f0f1a] to-[#1a0033] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="relative p-4 sm:p-6 border-b border-white/10 backdrop-blur-2xl bg-black/50 z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-transparent to-cyan-900/20" />
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
          <button onClick={() => router.push('/dashboard/student')} className="p-3 hover:bg-white/10 rounded-2xl transition self-start sm:self-auto">
            <ArrowLeft className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              GLOBAL LEADERBOARD
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Top Scholars • Season 1</p>
          </div>
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search warriors..."
              className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-2xl bg-white/5 border border-white/20 backdrop-blur-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition text-sm sm:text-base"
            />
            <Search className="absolute right-3 sm:right-4 top-3 sm:top-4.5 w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8 space-y-12">

          {/* Podium */}
          {leaders.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 items-end justify-center px-4 sm:px-12">
              {/* #2 */}
              {leaders[1] && (
                <motion.div initial={{ y: 80 }} animate={{ y: 0 }} transition={{ delay: 0.4 }} className="order-2 sm:order-1">
                  <div className="relative group">
                    <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 rounded-3xl blur-xl" />
                    <div className="relative bg-black/60 backdrop-blur-2xl border border-white/20 rounded-3xl p-4 sm:p-8 text-center">
                      <Crown className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-yellow-400 mb-2 sm:mb-4" />
                      <RankBorder rank={leaders[1].rank} level={leaders[1].level} size="xl">
                        <div className="text-5xl sm:text-7xl font-black text-yellow-400">#2</div>
                      </RankBorder>
                      <Image
                        src={leaders[1].avatar_url ?? "/default-avatar.png"}
                        alt={leaders[1].name}
                        width={80} height={80}
                        className="mx-auto mt-4 sm:mt-6 rounded-full ring-4 sm:ring-8 ring-yellow-500/50"
                        unoptimized
                      />
                      <p className="text-lg sm:text-2xl font-bold mt-2 sm:mt-4">{leaders[1].name}</p>
                      <p className="text-2xl sm:text-4xl font-black text-yellow-400 mt-1 sm:mt-2">{leaders[1].points.toLocaleString()}</p>
                      <div className="flex items-center justify-center gap-1 sm:gap-2 mt-2 sm:mt-3">
                        <Flame className="w-4 h-4 sm:w-6 sm:h-6 text-orange-500" />
                        <span className="text-sm sm:text-base text-orange-400 font-bold">{leaders[1].current_streak} day streak</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* #1 */}
              {leaders[0] && (
                <motion.div initial={{ y: 120 }} animate={{ y: 0 }} transition={{ delay: 0.2 }} className="transform scale-100 sm:scale-110 order-1 sm:order-2">
                  <div className="relative group">
                    <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-500 rounded-full blur-3xl animate-pulse" />
                    <div className="relative bg-black/80 backdrop-blur-3xl border-2 sm:border-4 border-yellow-500/80 rounded-3xl p-6 sm:p-10 text-center shadow-2xl">
                      <Trophy className="w-16 h-16 sm:w-24 sm:h-24 mx-auto text-yellow-400 mb-4 sm:mb-6 animate-pulse" />
                      <RankBorder rank={leaders[0].rank} level={leaders[0].level} size="xl">
                        <div className="text-6xl sm:text-9xl font-black text-yellow-300 drop-shadow-2xl">#1</div>
                      </RankBorder>
                      <Image
                        src={leaders[0].avatar_url ?? "/default-avatar.png"}
                        alt={leaders[0].name}
                        width={120} height={120}
                        className="mx-auto mt-4 sm:mt-8 rounded-full ring-6 sm:ring-8 ring-yellow-400 shadow-2xl"
                        unoptimized
                      />
                      <p className="text-2xl sm:text-4xl font-black mt-4 sm:mt-6 bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
                        {leaders[0].name}
                      </p>
                      <p className="text-4xl sm:text-6xl font-black text-yellow-400 mt-2 sm:mt-4">{leaders[0].points.toLocaleString()}</p>
                      <div className="flex items-center justify-center gap-2 sm:gap-3 mt-2 sm:mt-4">
                        <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 animate-pulse" />
                        <span className="text-lg sm:text-2xl font-bold text-yellow-400">{leaders[0].current_streak} day streak</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* #3 */}
              {leaders[2] && (
                <motion.div initial={{ y: 80 }} animate={{ y: 0 }} transition={{ delay: 0.6 }} className="order-3">
                  <div className="relative group">
                    <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-orange-500/30 to-red-500/30 rounded-3xl blur-xl" />
                    <div className="relative bg-black/60 backdrop-blur-2xl border border-white/20 rounded-3xl p-4 sm:p-8 text-center">
                      <Trophy className="w-10 h-10 sm:w-14 sm:h-14 mx-auto text-orange-500 mb-2 sm:mb-4" />
                      <RankBorder rank={leaders[2].rank} level={leaders[2].level} size="lg">
                        <div className="text-4xl sm:text-6xl font-black text-orange-400">#3</div>
                      </RankBorder>
                      <Image
                        src={leaders[2].avatar_url ?? "/default-avatar.png"}
                        alt={leaders[2].name}
                        width={60} height={60}
                        className="mx-auto mt-4 sm:mt-6 rounded-full ring-4 sm:ring-8 ring-orange-500/50"
                        unoptimized
                      />
                      <p className="text-lg sm:text-2xl font-bold mt-2 sm:mt-4">{leaders[2].name}</p>
                      <p className="text-2xl sm:text-4xl font-black text-orange-400 mt-1 sm:mt-2">{leaders[2].points.toLocaleString()}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Leaderboard List */}
          <div className="space-y-3 sm:space-y-4">
            {paginated.map((player, i) => {
              const globalRank = (page - 1) * pageSize + i + 1;
              const isCurrentUser = currentUser?.id === player.id;

              return (
                <motion.div
                  key={`${player.id}-${i}`}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`relative overflow-hidden rounded-2xl transition-all ${
                    isCurrentUser ? 'ring-2 sm:ring-4 ring-yellow-400 scale-105 shadow-2xl' : 'hover:scale-[1.02]'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${getRankGradient(player.rank)} opacity-20`} />
                  <div className="relative bg-black/70 backdrop-blur-xl border border-white/10 p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    <div className={`text-2xl sm:text-4xl font-black w-full sm:w-20 text-center ${globalRank <= 3 ? 'text-yellow-400' : 'text-gray-400'}`}>
                      #{globalRank}
                    </div>
                    <Image
                      src={player.avatar_url ?? "/default-avatar.png"}
                      alt={player.name}
                      width={60} height={60}
                      className="rounded-full ring-2 sm:ring-4 ring-white/20"
                      unoptimized
                    />
                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-lg sm:text-2xl font-bold">{player.name}</p>
                      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-1">
                        <RankBorder rank={player.rank} level={player.level} size="sm" />
                        <span className="text-sm sm:text-base text-gray-400">Level {player.level}</span>
                      </div>
                    </div>
                    <div className="text-center sm:text-right">
                      <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                        {player.points.toLocaleString()}
                      </p>
                      <div className="flex items-center justify-center sm:justify-end gap-1 sm:gap-2 mt-1 sm:mt-2">
                        <Flame className={`w-4 h-4 sm:w-6 sm:h-6 ${player.current_streak >= 10 ? 'text-red-500' : 'text-orange-400'}`} />
                        <span className="text-sm sm:text-base font-bold">{player.current_streak} day streak</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 pt-8 sm:pt-12">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-full sm:w-auto px-6 sm:px-10 py-3 sm:py-4 rounded-2xl bg-white/10 disabled:opacity-50 hover:bg-white/20 transition text-base sm:text-lg font-bold"
              >
                Previous
              </button>
              <span className="px-6 sm:px-8 py-3 sm:py-4 bg-purple-900/50 rounded-2xl border border-purple-500/50 font-bold text-sm sm:text-base">
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-full sm:w-auto px-6 sm:px-10 py-3 sm:py-4 rounded-2xl bg-white/10 disabled:opacity-50 hover:bg-white/20 transition text-base sm:text-lg font-bold"
              >
                Next
              </button>
            </div>
          )}

          {/* Your Rank */}
          {currentUser && (
            <div className="mt-12 sm:mt-20 text-center">
              <p className="text-lg sm:text-2xl text-gray-400 mb-4 sm:mb-6">Your Current Rank</p>
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                <div className="relative inline-block">
                  <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-r from-yellow-500 to-purple-600 rounded-full blur-3xl opacity-70" />
                  <RankBorder rank={currentUser.rank} level={currentUser.level} size="xl">
                    <div className="text-6xl sm:text-9xl font-black text-yellow-300">
                      #{leaders.findIndex(p => p.id === currentUser.id) + 1}
                    </div>
                  </RankBorder>
                </div>
                <p className="text-3xl sm:text-5xl font-black mt-4 sm:mt-8 bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
                  {currentUser.name}
                </p>
                <p className="text-2xl sm:text-4xl font-bold text-cyan-400 mt-2 sm:mt-4">
                  {currentUser.points.toLocaleString()} Points
                </p>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};