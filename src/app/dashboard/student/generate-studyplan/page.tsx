'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  ArrowLeftIcon,
  SparklesIcon,
  CalendarIcon,
  ClockIcon,
  BookOpenIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export default function GenerateStudyPlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [form, setForm] = useState({
    course: '',
    examDate: '',
    hoursPerDay: '3',
    topics: '',
    goal: 'exam',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.course.trim()) return;

    setLoading(true);

    try {
      const res = await fetch('/api/study-plans', {  
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Failed');

      const { plan } = await res.json();

      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('ai_study_plans')
        .insert({
          user_id: user?.id,
          content: plan,
        });

      router.push('/dashboard/student/study-plans');
      router.refresh();
    } catch (err) {
      alert('Failed to generate plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex bg-[#0d0d0f] text-white">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold">Generate Study Plan</h2>
        </div>
        <div className="border-r border-white/10 p-4">
          </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h1 className="text-xl font-bold text-center flex-1 -ml-8">
            Generate Study Plan
          </h1>

          <button
            onClick={() => router.push('/dashboard/student')}
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
        </div>

        {/* FORM CONTENT */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-3">
                Your AI Academic Coach
              </h2>
              <p className="text-lg text-gray-300">Create a personalized study schedule in seconds</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Course */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 text-pink-200 font-semibold">
                    <BookOpenIcon className="w-6 h-6" />
                    Course / Subject
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Organic Chemistry, AP Biology, Calculus II"
                    value={form.course}
                    onChange={(e) => setForm({ ...form, course: e.target.value })}
                    className="w-full px-6 py-4 bg-white/10 backdrop-blur border border-white/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 placeholder-gray-400 text-white"
                  />
                </div>

                {/* Exam Date 
                <div className="space-y-3">
                  <label className="flex items-center gap-3 text-pink-200 font-semibold">
                    <CalendarIcon className="w-6 h-6" />
                    Exam Date (optional)
                  </label>
                  <input
                    type="date"
                    value={form.examDate}
                    onChange={(e) => setForm({ ...form, examDate: e.target.value })}
                    className="w-full px-6 py-4 bg-white/10 backdrop-blur border border-white/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-white"
                  />
                </div>

                {/* Hours per day */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 text-pink-200 font-semibold">
                    <ClockIcon className="w-6 h-6" />
                    Hours per Day
                  </label>
                  <select
                    value={form.hoursPerDay}
                    onChange={(e) => setForm({ ...form, hoursPerDay: e.target.value })}
                    className="w-full px-6 py-4 bg-white/10 backdrop-blur border border-white/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-white"
                  >
                    <option value="1">1 hour</option>
                    <option value="2">2 hours</option>
                    <option value="3">3 hours</option>
                    <option value="4">4 hours</option>
                    <option value="5">5+ hours</option>
                  </select>
                </div>

                {/* Goal */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 text-pink-200 font-semibold">
                    Goal
                  </label>
                  <select
                    value={form.goal}
                    onChange={(e) => setForm({ ...form, goal: e.target.value })}
                    className="w-full px-6 py-4 bg-white/10 backdrop-blur border border-white/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-white"
                  >
                    <option value="exam">Ace an Exam</option>
                    <option value="understanding">Deep Understanding</option>
                    <option value="revision">Quick Revision</option>
                    <option value="project">Final Project/Thesis</option>
                  </select>
                </div>
              </div>

              {/* Topics */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-pink-200 font-semibold">
                  Topics/Chapters (optional)
                </label>
                <textarea
                  rows={6}
                  placeholder="e.g. Thermodynamics, Cell Division, Derivatives, World War II..."
                  value={form.topics}
                  onChange={(e) => setForm({ ...form, topics: e.target.value })}
                  className="w-full px-6 py-4 bg-white/10 backdrop-blur border border-white/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 placeholder-gray-400 resize-none text-white"
                />
              </div>

              {/* Submit Button */}
              <div className="text-center pt-10">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-4 px-12 py-6 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl font-bold text-xl shadow-2xl hover:scale-105 transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>Generating your perfect plan...</>
                  ) : (
                    <>
                      <SparklesIcon className="w-8 h-8" />
                      Generate My Study Plan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}