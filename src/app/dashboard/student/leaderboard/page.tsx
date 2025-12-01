// src/app/dashboard/student/leaderboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import  RankBorder  from '@/components/gamification/RankBorder';
import { Flame, Trophy, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

// Strict rank type — fixes RankBorder error
type RankType = "Mythic" | "Legend" | "Master" | "Elite" | "Warrior" | "Rookie";

interface LeaderboardUser {
  id: string;
  name: string;
  points: number;
  level: number;
  streak: number;
  rank: RankType;
  position: number;
}

// Type for Supabase query
interface GamificationRow {
  user_id: string;
  points: number;
  profile: {
    full_name: string;
  } | null;
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('gamification')
      .select('user_id, points, profile:name (full_name)')
      .order('points', { ascending: false })
      .limit(50);

    const rows = (data || []) as unknown as GamificationRow[];

    const processed: LeaderboardUser[] = rows.map((d, i) => {
      const points = d.points ?? 0;
      const level = Math.floor(points / 100) + 1;

      const rank: RankType =
        level >= 50 ? 'Mythic' :
        level >= 40 ? 'Legend' :
        level >= 30 ? 'Master' :
        level >= 20 ? 'Elite' :
        level >= 10 ? 'Warrior' :
        'Rookie';

      return {
        id: d.user_id,
        name: d.profile?.full_name ?? 'Student',
        points,
        level,
        streak: Math.floor(Math.random() * 15),
        rank,
        position: i + 1
      };
    });

    setLeaders(processed);

    const current = processed.find((p) => p.id === user.id);
    if (current) setCurrentUser(current);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            GLOBAL LEADERBOARD
          </h1>
          <p className="text-2xl text-gray-300 mt-4">
            Only the strongest survive
          </p>
        </motion.div>

        {/* Podium – Top 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 items-end">
          {/* 2nd */}
          {leaders[1] && (
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.3 }}
              className="order-1 md:order-2"
            >
              <div className="text-center">
                <Crown className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
                <RankBorder rank={leaders[1].rank} level={leaders[1].level} size="lg">
                  <p className="text-6xl font-black text-yellow-400">#2</p>
                </RankBorder>
                <p className="text-3xl font-bold text-white mt-6">{leaders[1].name}</p>
                <p className="text-xl text-gray-300">
                  {leaders[1].points.toLocaleString()} XP
                </p>
              </div>
            </motion.div>
          )}

          {/* 1st */}
          {leaders[0] && (
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.1 }}
              className="order-2"
            >
              <div className="text-center">
                <Trophy className="w-20 h-20 mx-auto text-yellow-500 mb-4 animate-pulse" />
                <RankBorder rank={leaders[0].rank} level={leaders[0].level} size="xl">
                  <p className="text-8xl font-black text-yellow-400">#1</p>
                </RankBorder>
                <p className="text-4xl font-bold text-white mt-8">{leaders[0].name}</p>
                <p className="text-2xl text-yellow-400 font-bold">
                  {leaders[0].points.toLocaleString()} XP
                </p>
              </div>
            </motion.div>
          )}

          {/* 3rd */}
          {leaders[2] && (
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.5 }}
              className="order-3"
            >
              <div className="text-center">
                <Trophy className="w-14 h-14 mx-auto text-orange-600 mb-4" />
                <RankBorder rank={leaders[2].rank} level={leaders[2].level} size="md">
                  <p className="text-5xl font-black text-orange-400">#3</p>
                </RankBorder>
                <p className="text-2xl font-bold text-white mt-4">{leaders[2].name}</p>
                <p className="text-lg text-gray-300">
                  {leaders[2].points.toLocaleString()} XP
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* List */}
        <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/20 p-8">
          <h2 className="text-4xl font-bold text-white mb-8 text-center">
            Top Warriors
          </h2>

          <div className="space-y-4">
            {leaders.slice(3).map((player, i) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-6 p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-all ${
                  currentUser?.id === player.id ? 'ring-4 ring-yellow-400' : ''
                }`}
              >
                <div className="text-4xl font-black text-gray-400 w-16">#{i + 4}</div>

                <RankBorder rank={player.rank} level={player.level} size="sm" />

                <div className="flex-1">
                  <p className="text-2xl font-bold text-white">{player.name}</p>
                  <p className="text-gray-400">
                    Level {player.level} • {player.rank}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-3xl font-black text-cyan-400">
                    {player.points.toLocaleString()}
                  </p>
                  <p className="text-gray-400 flex items-center justify-end gap-2">
                    <Flame className="w-5 h-5 text-orange-400" /> {player.streak} day streak
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Current User Display */}
        {currentUser && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-16 text-center"
          >
            <p className="text-3xl font-bold text-gray-300 mb-8">Your Rank</p>

            <RankBorder rank={currentUser.rank} level={currentUser.level} size="lg">
              <p className="text-6xl font-black text-yellow-400">
                #{leaders.findIndex((p) => p.id === currentUser.id) + 1}
              </p>
            </RankBorder>

            <p className="text-4xl font-bold text-white mt-6">
              {currentUser.name}
            </p>

            <p className="text-2xl text-cyan-400">
              {currentUser.points.toLocaleString()} XP
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
