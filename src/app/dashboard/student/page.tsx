// src/app/dashboard/student/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrophyIcon, StarIcon,  SparklesIcon } from '@heroicons/react/24/outline';
import { Flame, CrownIcon } from 'lucide-react';

export default function StudentDashboard() {
  const [points, setPoints] = useState(2250);
  const [streak, setStreak] = useState(2);
  const [level, setLevel] = useState(23);
  const [, setLoading] = useState(false);

  useEffect(() => {
    loadAllData();
    loadStreak();
  }, []);

  async function loadAllData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('gamification')
      .select('points')
      .eq('user_id', user.id)
      .single();

    const pts = data?.points || 2250;
    const lvl = Math.floor(pts / 100) + 1;

    setPoints(pts);
    setLevel(lvl);
    setLoading(false);
  }

  function loadStreak() {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem('last_study_date') || '';
    const currentStreak = parseInt(localStorage.getItem('study_streak') || '0', 10);

    if (lastVisit !== today) {
      const newStreak = lastVisit === new Date(Date.now() - 86400000).toDateString() ? currentStreak + 1 : 1;
      localStorage.setItem('study_streak', String(newStreak));
      localStorage.setItem('last_study_date', today);
      setStreak(newStreak);
    } else {
      setStreak(currentStreak);
    }
  }

  const currentXP = points % 100;
  const nextLevelXP = (level) * 100;

  return (
    <div className="min-h-screen p-6 md:p-8 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* WELCOME CARD */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-600/40 via-pink-600/40 to-indigo-600/40 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl"
        >
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent">
            Welcome back, Student!
          </h1>
          <p className="text-xl text-gray-200 mt-3">Ready to crush it today?</p>
        </motion.div>

        {/* MAIN JOURNEY CARD — FULLY RESPONSIVE */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/90 via-pink-900/80 to-indigo-900/90 backdrop-blur-2xl border border-white/20 shadow-3xl"
        >
          {/* Animated background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 animate-pulse" />

          <div className="relative z-10 p-8 md:p-10 lg:p-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
              <div className="flex items-center gap-4">
                <CrownIcon className="w-12 h-12 text-yellow-400 drop-shadow-xl" />
                <h2 className="text-4xl font-black text-white">Your Journey</h2>
              </div>
              <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-8 py-4 rounded-2xl font-black text-2xl shadow-2xl">
                Lvl {level}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-12">
              <div className="flex justify-between text-gray-300 mb-4">
                <span className="text-lg">Level {level}</span>
                <span className="text-cyan-300 font-bold text-lg">
                  {points} / {nextLevelXP} XP
                </span>
              </div>
              <div className="relative h-16 bg-black/40 rounded-3xl overflow-hidden border-2 border-white/20">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentXP / 100) * 100}%` }}
                  transition={{ duration: 1.8, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-3xl"
                />
                <div className="absolute inset-0 bg-white/10 animate-shimmer" />
                <SparklesIcon className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 text-white/70 animate-pulse" />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12">
              <motion.div whileHover={{ scale: 1.08 }} className="text-center">
                <div className="mx-auto w-28 h-28 bg-gradient-to-br from-yellow-500/30 to-orange-600/30 rounded-3xl border-2 border-yellow-500/40 flex items-center justify-center mb-4">
                  <StarIcon className="w-16 h-16 text-yellow-400" />
                </div>
                <p className="text-5xl font-black text-white">{points.toLocaleString()}</p>
                <p className="text-gray-300 text-lg">Total XP</p>
              </motion.div>

              <motion.div whileHover={{ scale: 1.08 }} className="text-center">
                <div className="mx-auto w-28 h-28 bg-gradient-to-br from-orange-500/30 to-red-600/30 rounded-3xl border-2 border-orange-500/40 flex items-center justify-center mb-4">
                  <Flame className={`w-16 h-16 text-orange-400 ${streak > 0 ? 'animate-pulse' : ''}`} />
                </div>
                <p className="text-5xl font-black bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                  {streak}
                </p>
                <p className="text-gray-300 text-lg">Day Streak</p>
                {streak >= 7 && <p className="text-orange-300 text-sm mt-1">ON FIRE!</p>}
              </motion.div>

              <motion.div whileHover={{ scale: 1.08 }} className="text-center">
                <div className="mx-auto w-28 h-28 bg-gradient-to-br from-purple-500/30 to-pink-600/30 rounded-3xl border-2 border-purple-500/40 flex items-center justify-center mb-4">
                  <TrophyIcon className="w-16 h-16 text-purple-400" />
                </div>
                <p className="text-5xl font-black text-purple-300">#{Math.max(1, 50 - level + 5)}</p>
                <p className="text-gray-300 text-lg">Global Rank</p>
              </motion.div>
            </div>

            {/* Badges */}
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-200 mb-8">Legendary Badges</p>
              <div className="flex justify-center items-center gap-6 flex-wrap">
                {['Foot', '7', '1K', 'Fire'].map((badge, i) => (
                  <motion.div
                    key={badge}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-amber-500/60 font-black text-2xl text-black"
                  >
                    {badge === 'Foot' ? 'Foot' : badge === '7' ? '7' : badge === '1K' ? '1K' : 'Fire'}
                  </motion.div>
                ))}
                <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-3xl border-2 border-dashed border-white/30 rounded-3xl flex items-center justify-center">
                  <span className="text-white/40 text-4xl">+</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link href="/dashboard/student/courses">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 text-center hover:bg-white/20 transition-all"
            >
              <h3 className="text-3xl font-bold text-white mb-3">My Courses</h3>
              <p className="text-gray-300 text-lg">Continue your subjects</p>
            </motion.div>
          </Link>

          <Link href="/dashboard/student/leaderboard">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-10 text-center shadow-2xl hover:shadow-pink-500/50 transition-all"
            >
              <h3 className="text-3xl font-bold text-white mb-3">View Leaderboard</h3>
              <p className="text-white/90 text-lg">See who&apos;s dominating</p>
            </motion.div>
          </Link>
        </div>

      </div>
    </div>
  );
}