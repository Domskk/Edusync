// src/app/dashboard/student/study-plans/page.tsx
'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    loadPlans();
    loadStreak();
  }, []);

  async function loadPlans() {
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
      loadProgress(data[0].id);
    }
  }

  function loadProgress(planId: string) {
    const saved = localStorage.getItem(`studyplan_${planId}`);
    if (saved) {
      const days = JSON.parse(saved);
      setCompletedDays(new Set(days));
    }
  }

  function loadStreak() {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem('last_study_date');
    const currentStreak = parseInt(localStorage.getItem('study_streak') || '0', 10);

    if (lastVisit === today) {
      setStreak(currentStreak);
    } else {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (lastVisit === yesterday) {
        const newStreak = currentStreak + 1;
        localStorage.setItem('study_streak', newStreak.toString());
        setStreak(newStreak);
      } else {
        localStorage.setItem('study_streak', '1');
        setStreak(1);
      }
      localStorage.setItem('last_study_date', today);
    }
  }

  // FIXED: Award 150 points + confetti ONLY ONCE per plan
  function toggleDay(day: number) {
    if (!selectedPlan) return;

    const newSet = new Set(completedDays);
    const wasCompleted = newSet.has(day);
    const totalDays = selectedPlan.content.schedule.length;
    const willCompletePlan = !wasCompleted && newSet.size + 1 === totalDays;

    // Check if reward was already given for this plan
    const rewardAlreadyGiven = localStorage.getItem(`plan_completed_reward_${selectedPlan.id}`) === 'true';

    if (wasCompleted) {
      newSet.delete(day);
    } else {
      newSet.add(day);
    }

    setCompletedDays(newSet);
    localStorage.setItem(`studyplan_${selectedPlan.id}`, JSON.stringify([...newSet]));

    // Only trigger reward + confetti if:
    // 1. This action completes the plan
    // 2. Reward has NEVER been given before
    if (willCompletePlan && !rewardAlreadyGiven) {
      confetti({
        particleCount: 500,
        spread: 120,
        origin: { y: 0.6 },
        colors: ['#ec4899', '#a855f7', '#8b5cf6', '#10b981', '#fbbf24', '#f59e0b'],
        scalar: 1.3,
      });

      awardPoints(150, 'Completed entire study plan!');
      localStorage.setItem(`plan_completed_reward_${selectedPlan.id}`, 'true'); // Mark as rewarded
    }
  }

  async function awardPoints(points: number, reason: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase
      .from('gamification')
      .select('points')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      await supabase
        .from('gamification')
        .update({ points: existing.points + points })
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('gamification')
        .insert({ user_id: user.id, points });
    }
  }

  async function deletePlan(id: string) {
    await supabase.from('ai_study_plans').delete().eq('id', id);
    setPlans(prev => prev.filter(p => p.id !== id));
    if (selectedPlan?.id === id) {
      setSelectedPlan(plans[0] || null);
    }
  }

  const progress = selectedPlan
    ? Math.round((completedDays.size / selectedPlan.content.schedule.length) * 100)
    : 0;

  return (
    <div className="fixed inset-0 flex bg-[#0d0d0f] text-white overflow-hidden">
      {/* SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 z-40 ${sidebarOpen ? 'w-72' : 'w-0'} bg-black/50 backdrop-blur-2xl border-r border-white/10 transition-all duration-300 overflow-hidden`}>
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold">My Study Plans</h2>
          <button
            onClick={() => router.push('/dashboard/student/generate-studyplan')}
            className="p-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl hover:scale-110 transition shadow-lg"
          >
            <PlusIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5">
          <div className="bg-gradient-to-br from-orange-500/20 to-pink-600/20 border border-orange-500/30 rounded-2xl p-5 text-center">
            <FlameIcon className="w-12 h-12 mx-auto mb-3 text-orange-400" />
            <p className="text-4xl font-bold text-orange-300">{streak}</p>
            <p className="text-sm text-orange-200">Day Streak</p>
            {streak > 0 && <p className="text-xs text-orange-300 mt-1">Keep it burning!</p>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-20">
          {plans.length === 0 ? (
            <div className="text-center mt-20 text-gray-500">
              <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>No plans yet</p>
              <p className="text-sm">Create your first one!</p>
            </div>
          ) : (
            plans.map(plan => (
              <div
                key={plan.id}
                className={`group mb-3 p-4 rounded-2xl cursor-pointer transition-all ${
                  selectedPlan?.id === plan.id
                    ? 'bg-white/20 border-l-4 border-l-pink-500 shadow-xl'
                    : 'hover:bg-white/10'
                }`}
              >
                <button
                  onClick={() => {
                    setSelectedPlan(plan);
                    loadProgress(plan.id);
                  }}
                  className="flex items-center gap-4 w-full text-left"
                >
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <CalendarIcon className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-pink-200 truncate">
                      {plan.content.title}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(plan.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePlan(plan.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className={`flex-1 flex flex-col ${sidebarOpen ? 'ml-72' : 'ml-0'} transition-all duration-300`}>
        <div className="sticky top-0 z-50 bg-black/40 backdrop-blur-2xl px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-3 hover:bg-white/10 rounded-xl transition">
            {sidebarOpen ? <XMarkIcon className="w-7 h-7" /> : <Bars3Icon className="w-7 h-7" />}
          </button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            {selectedPlan?.content.title || 'My Study Plans'}
          </h1>
          <button onClick={() => router.push('/dashboard/student')} className="p-3 hover:bg-white/10 rounded-xl transition">
            <ArrowLeftIcon className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-8">
          {selectedPlan ? (
            <div className="max-w-6xl mx-auto space-y-10">
              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-6">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 text-center border border-white/10">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-purple-400" />
                  <p className="text-gray-400 text-sm">Duration</p>
                  <p className="text-3xl font-bold text-white">{selectedPlan.content.duration}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 text-center border border-white/10">
                  <ClockIcon className="w-12 h-12 mx-auto mb-3 text-pink-400" />
                  <p className="text-gray-400 text-sm">Daily Study</p>
                  <p className="text-3xl font-bold text-white">{selectedPlan.content.dailyHours}h</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 text-center border border-white/10">
                  <TrophyIcon className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
                  <p className="text-gray-400 text-sm">Progress</p>
                  <p className="text-3xl font-bold text-yellow-300">{progress}%</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 text-center border border-white/10">
                  <FlameIcon className="w-12 h-12 mx-auto mb-3 text-orange-400" />
                  <p className="text-gray-400 text-sm">Current Streak</p>
                  <p className="text-4xl font-bold text-orange-400">{streak}</p>
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-8">
                {selectedPlan.content.schedule.map(day => {
                  const done = completedDays.has(day.day);
                  return (
                    <div
                      key={day.day}
                      className={`p-8 rounded-3xl border-2 transition-all duration-500 ${
                        done
                          ? 'bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-500/50 shadow-2xl shadow-green-500/20'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-6">
                          <button
                            onClick={() => toggleDay(day.day)}
                            className={`w-14 h-14 rounded-full border-4 flex items-center justify-center transition-all ${
                              done
                                ? 'bg-green-500 border-green-400 shadow-lg shadow-green-500/50'
                                : 'border-white/30 hover:border-pink-500 hover:scale-110'
                            }`}
                          >
                            {done && <CheckCircleIcon className="w-9 h-9 text-white" />}
                          </button>
                          <div>
                            <h3 className="text-3xl font-bold text-pink-300">
                              Day {day.day}: {day.focus}
                            </h3>
                            <p className="text-lg text-gray-300">{day.timeEstimate}</p>
                          </div>
                        </div>
                        <p className="italic text-purple-300 text-lg max-w-lg text-right leading-relaxed">
                          "{day.motivation}"
                        </p>
                      </div>

                      <ul className="space-y-4 ml-20">
                        {day.tasks.map((task, i) => (
                          <li key={i} className="flex items-start gap-4">
                            <StarIcon className="w-6 h-6 text-pink-400 mt-1 flex-shrink-0" />
                            <span className="text-gray-100 text-lg leading-relaxed">{task}</span>
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
                <div className="bg-white/5 border-2 border-dashed border-white/20 rounded-3xl w-32 h-32 mx-auto mb-8 flex items-center justify-center">
                  <CalendarIcon className="w-16 h-16 text-gray-600" />
                </div>
                <h3 className="text-3xl font-bold text-gray-400 mb-3">No plan selected</h3>
                <p className="text-xl text-gray-500">Create or select a study plan to begin</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}