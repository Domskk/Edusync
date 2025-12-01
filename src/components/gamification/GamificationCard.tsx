'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { TrophyIcon,  StarIcon } from '@heroicons/react/24/outline';
import { FlameIcon } from 'lucide-react';

export default function GamificationCard() {
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    loadGamification();
    loadStreak();
  }, []);

  async function loadGamification() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('gamification')
      .select('points')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setPoints(data.points || 0);
      setLevel(Math.floor((data.points || 0) / 100) + 1);
    }
  }

  function loadStreak() {
    const last = localStorage.getItem('study_streak_date');
    const current = new Date().toDateString();
    const count = parseInt(localStorage.getItem('study_streak_count') || '0');
    setStreak(last === current ? count : 0);
  }

  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
      <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-3">
        <TrophyIcon className="w-7 h-7 text-yellow-400" />
        Your Progress
      </h3>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <StarIcon className="w-12 h-12 mx-auto mb-2 text-yellow-400" />
          <p className="text-3xl font-bold text-white">{points}</p>
          <p className="text-sm text-gray-400">Points</p>
        </div>
        <div className="text-center">
          <FlameIcon className="w-12 h-12 mx-auto mb-2 text-orange-400" />
          <p className="text-3xl font-bold text-orange-400">{streak}</p>
          <p className="text-sm text-gray-400">Day Streak</p>
        </div>
        <div className="text-center">
          <TrophyIcon className="w-12 h-12 mx-auto mb-2 text-purple-400" />
          <p className="text-3xl font-bold text-purple-300">Lvl {level}</p>
          <p className="text-sm text-gray-400">Level</p>
        </div>
      </div>
    </div>
  );
}