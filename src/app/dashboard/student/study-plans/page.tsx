'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  TrophyIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  Bars3Icon,
  XMarkIcon,
  TrashIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { FlameIcon } from 'lucide-react';

interface StudyPlan {
  id: string;
  created_at: string;
  course_id: string | null;
  content: {
    title: string;
    duration: string;
    dailyHours: string;
    schedule: Array<{
      day: number;
      focus: string;
      tasks: string[];
      timeEstimate: string;
      motivation: string;
    }>;
  };
}

export default function StudyPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());
  const [streak, setStreak] = useState(0);

  const loadPlans = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('ai_study_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setPlans(data || []);
    if (data?.length && !selectedPlan) {
      setSelectedPlan(data[0]);
      await loadProgress(data[0]);
    }
  }, [selectedPlan]);

  // Load real progress from Supabase progress table
  const loadProgress = async (plan: StudyPlan) => {
    if (!plan.course_id) {
      setCompletedDays(new Set());
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('progress')
      .select('completed_tasks')
      .eq('user_id', user.id)
      .eq('course_id', plan.course_id)
      .maybeSingle(); // Use maybeSingle to avoid error if no row

    const completed = data?.completed_tasks || 0;
    const days = new Set<number>();
    for (let i = 1; i <= completed; i++) days.add(i);
    setCompletedDays(days);
  };

  // Load real streak from gamification table
  const loadStreak = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('gamification')
      .select('current_streak')
      .eq('user_id', user.id)
      .maybeSingle();

    setStreak(data?.current_streak || 0);
  };

  useEffect(() => {
    loadPlans();
    loadStreak();
  }, [loadPlans]);

  // Sync progress + trigger real streak update
  const syncProgress = async () => {
    if (!selectedPlan?.course_id) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const totalDays = selectedPlan.content.schedule.length;
    const completedCount = completedDays.size;

    await supabase.from('progress').upsert({
      user_id: user.id,
      course_id: selectedPlan.course_id,
      completed_tasks: completedCount,
      total_tasks: totalDays,
      progress_percent: Math.round((completedCount / totalDays) * 100),
      updated_at: new Date().toISOString(),
    });

    // This calls your SQL function → real streak
    await supabase.rpc('update_study_streak', { p_user_id: user.id });
    await loadStreak();
  };

  const toggleDay = async (day: number) => {
    if (!selectedPlan) return;

    const newSet = new Set(completedDays);
    const wasCompleted = newSet.has(day);
    const totalDays = selectedPlan.content.schedule.length;
    const willComplete = !wasCompleted && newSet.size + 1 === totalDays;
    const rewardGiven = localStorage.getItem(`plan_reward_${selectedPlan.id}`) === 'true';

    if (wasCompleted) newSet.delete(day);
    else newSet.add(day);

    setCompletedDays(newSet);
    await syncProgress();

    if (willComplete && !rewardGiven) {
      confetti({
        particleCount: 600,
        spread: 130,
        origin: { y: 0.6 },
        colors: ['#ec4899', '#a855f7', '#8b5cf6', '#10b981', '#fbbf24'],
        scalar: 1.4,
      });
      await awardPoints(150);
      localStorage.setItem(`plan_reward_${selectedPlan.id}`, 'true');
    }
  };

  const awardPoints = async (points: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase
      .from('gamification')
      .select('points')
      .eq('user_id', user.id)
      .maybeSingle();

    const newPoints = (existing?.points || 0) + points;

    if (existing) {
      await supabase.from('gamification').update({ points: newPoints }).eq('user_id', user.id);
    } else {
      await supabase.from('gamification').insert({ user_id: user.id, points: newPoints });
    }
  };

  const deletePlan = async (id: string) => {
    await supabase.from('ai_study_plans').delete().eq('id', id);
    setPlans(prev => prev.filter(p => p.id !== id));
    if (selectedPlan?.id === id) {
      setSelectedPlan(plans[0] || null);
      setCompletedDays(new Set());
    }
  };

  const progress = selectedPlan
    ? Math.round((completedDays.size / selectedPlan.content.schedule.length) * 100)
    : 0;
  return (
    <div className="fixed inset-0 flex bg-[#0d0d0f] text-white overflow-hidden">
      {/* MOBILE BACKDROP */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR — NOW 100% SCROLLABLE + MATCHES YOUR DESIGN */}
      <div className={`fixed inset-y-0 left-0 z-40 flex flex-col w-full md:w-80 bg-black/70 backdrop-blur-3xl border-r border-white/5 transition-all duration-500 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4">
          <h2 className="text-xl md:text-2xl font-black text-white">My Study Plans</h2>
          <button
            onClick={() => router.push('/dashboard/student/generate-studyplan')}
            className="p-2 md:p-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl md:rounded-2xl hover:scale-110 transition-all shadow-2xl shadow-purple-600/50"
          >
            <PlusIcon className="w-5 h-5 md:w-7 md:h-7" />
          </button>
        </div>

        {/* Streak Card — Matches your screenshot perfectly */}
        <div className="mx-3 md:mx-5 mb-4 md:mb-6">
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-orange-600/30 via-pink-700/20 to-purple-800/30 border border-orange-500/40 backdrop-blur-xl p-4 md:p-8 text-center shadow-2xl shadow-orange-600/30">
            <div className="absolute inset-0 bg-white/5 rounded-2xl md:rounded-3xl" />
            <FlameIcon className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 text-orange-400 drop-shadow-2xl" />
            <p className="text-4xl md:text-6xl font-black text-orange-300 drop-shadow-lg">{streak}</p>
            <p className="text-base md:text-lg font-bold text-orange-200 mt-1 md:mt-2">Day Streak</p>
            <p className="text-xs md:text-sm text-orange-300 mt-1 font-medium">Keep it burning!</p>
          </div>
        </div>

        {/* SCROLLABLE LIST — THIS IS THE FIX */}
        <div className="flex-1 overflow-y-auto px-3 md:px-5 pb-6 md:pb-10">
          {plans.length === 0 ? (
            <div className="text-center mt-20 text-gray-500">
              <div className="w-28 h-28 mx-auto mb-6 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10">
                <CalendarIcon className="w-14 h-14 text-gray-600" />
              </div>
              <p className="text-xl font-semibold">No plans yet</p>
              <p className="text-sm mt-2">Tap + to create your first one</p>
            </div>
          ) : (
            <div className="space-y-4">
              {plans.map(plan => (
                <div
                  key={plan.id}
                  onClick={async () => {
                    setSelectedPlan(plan);
                  await loadProgress(plan);           // Pass full plan
                  if (plan.course_id) await syncProgress();
                  }}
                  className={`group relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl cursor-pointer transition-all duration-300 hover:bg-white/8 hover:border-pink-500/30 hover:shadow-xl hover:shadow-purple-600/20 ${
                    selectedPlan?.id === plan.id
                      ? 'ring-2 ring-pink-500/70 shadow-2xl shadow-pink-600/40 bg-gradient-to-br from-pink-600/20 via-purple-600/20 to-indigo-700/20 border-pink-500/50'
                      : ''
                  }`}
                >
                  <div className="p-5 flex items-center gap-4">
                    <div className={`p-3.5 rounded-2xl transition-all ${
                      selectedPlan?.id === plan.id
                        ? 'bg-gradient-to-br from-pink-500/40 to-purple-600/40 shadow-lg'
                        : 'bg-white/10'
                    }`}>
                      <CalendarIcon className="w-8 h-8 text-purple-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-lg truncate">
                        {plan.content.title}
                      </h4>
                      <p className="text-sm text-gray-400">
                        {new Date(plan.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    {/* Trash icon — always visible like in your screenshot */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this study plan permanently?')) {
                          deletePlan(plan.id);
                        }
                      }}
                      className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className={`flex-1 flex flex-col ${sidebarOpen ? 'md:ml-80' : 'ml-0'} transition-all duration-500`}>
        <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-2xl px-3 md:px-6 py-3 md:py-5 border-b border-white/10 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg md:rounded-xl transition">
            {sidebarOpen ? <XMarkIcon className="w-5 h-5 md:w-7 md:h-7" /> : <Bars3Icon className="w-5 h-5 md:w-7 md:h-7" />}
          </button>
          <h1 className="text-lg md:text-3xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent truncate">
            {selectedPlan?.content.title || 'My Study Plans'}
          </h1>
          <button onClick={() => router.push('/dashboard/student')} className="p-2 hover:bg-white/10 rounded-lg md:rounded-xl transition">
            <ArrowLeftIcon className="w-5 h-5 md:w-7 md:h-7" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {selectedPlan ? (
            <div className="max-w-6xl mx-auto space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 text-center border border-white/10">
                  <div className="relative inline-block mb-3">
                    <svg className="w-16 h-16 -rotate-90">
                      <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="url(#durationGrad)"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={175.93}
                        strokeDashoffset={175.93 * (1 - 0.8)} // Static 80% for duration as it's not progress-based
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="durationGrad">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#7c3aed" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold text-white">{selectedPlan.content.duration}</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm">Duration</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 text-center border border-white/10">
                  <ClockIcon className="w-12 h-12 mx-auto mb-3 text-pink-400" />
                  <p className="text-gray-400 text-sm">Daily Study</p>
                  <p className="text-3xl font-bold text-white">{selectedPlan.content.dailyHours}h</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 text-center border border-white/10">
                  <div className="relative inline-block mb-3">
                    <svg className="w-24 h-24 -rotate-90">
                      <circle cx="48" cy="48" r="44" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                      <circle
                        cx="48"
                        cy="48"
                        r="44"
                        stroke="url(#progressGrad)"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={276.46}
                        strokeDashoffset={276.46 * (1 - progress / 100)}
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="progressGrad">
                          <stop offset="0%" stopColor="#fbbf24" />
                          <stop offset="100%" stopColor="#f59e0b" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-yellow-300">{progress}%</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm">Progress</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 text-center border border-white/10">
                  <div className="relative inline-block mb-3">
                    <svg className="w-16 h-16 -rotate-90">
                      <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="url(#streakGrad)"
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={175.93}
                        strokeDashoffset={175.93 * (1 - Math.min(streak / 10, 1))} // Dynamic based on streak, max at 10
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="streakGrad">
                          <stop offset="0%" stopColor="#fb923c" />
                          <stop offset="100%" stopColor="#ea580c" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold text-orange-400">{streak}</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm">Current Streak</p>
                </div>
              </div>

              <div className="space-y-6 md:space-y-8">
                {selectedPlan.content.schedule.map(day => {
                  const done = completedDays.has(day.day);
                  return (
                    <div
                      key={day.day}
                      className={`p-4 md:p-8 rounded-2xl md:rounded-3xl border-2 transition-all duration-500 ${
                        done
                          ? 'bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-500/50 shadow-2xl shadow-green-500/20'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4 md:mb-6">
                        <div className="flex items-center gap-4 md:gap-6 mb-4 md:mb-0">
                          <button
                            onClick={() => toggleDay(day.day)}
                            className={`w-12 h-12 md:w-14 md:h-14 rounded-full border-3 md:border-4 flex items-center justify-center transition-all ${
                              done
                                ? 'bg-green-500 border-green-400 shadow-lg shadow-green-500/50'
                                : 'border-white/30 hover:border-pink-500 hover:scale-110'
                            }`}
                          >
                            {done && <CheckCircleIcon className="w-7 h-7 md:w-9 md:h-9 text-white" />}
                          </button>
                          <div>
                            <h3 className="text-xl md:text-3xl font-bold text-pink-300">
                              Day {day.day}: {day.focus}
                            </h3>
                            <p className="text-base md:text-lg text-gray-300">{day.timeEstimate}</p>
                          </div>
                        </div>
                        <p className="italic text-purple-300 text-base md:text-lg max-w-lg text-left md:text-right leading-relaxed">
                          {day.motivation}
                        </p>
                      </div>

                      <ul className="space-y-3 md:space-y-4 ml-12 md:ml-20">
                        {day.tasks.map((task, i) => (
                          <li key={i} className="flex items-start gap-3 md:gap-4">
                            <StarIcon className="w-5 h-5 md:w-6 md:h-6 text-pink-400 mt-1 flex-shrink-0" />
                            <span className="text-gray-100 text-base md:text-lg leading-relaxed">{task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {progress === 100 && (
                <div className="text-center py-24 bg-gradient-to-r from-pink-600/30 via-purple-600/30 to-indigo-600/30 rounded-3xl border-2 border-pink-500/50 backdrop-blur-xl">
                  <TrophyIcon className="w-32 h-32 mx-auto mb-6 text-yellow-400 animate-pulse" />
                  <h2 className="text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
                    Amazing Work!
                  </h2>
                  <p className="text-3xl text-pink-300">You completed your entire study plan</p>
                  <p className="text-2xl text-purple-300 mt-4">+150 points • Streak continues</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="bg-white/5 border-2 border-dashed border-white/20 rounded-2xl md:rounded-3xl w-24 h-24 md:w-32 md:h-32 mx-auto mb-6 md:mb-8 flex items-center justify-center">
                  <CalendarIcon className="w-12 h-12 md:w-16 md:h-16 text-gray-600" />
                </div>
                <h3 className="text-xl md:text-3xl font-bold text-gray-400 mb-2 md:mb-3">No plan selected</h3>
                <p className="text-base md:text-xl text-gray-500">Create or select a study plan to begin</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}