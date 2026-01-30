'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeftIcon, SparklesIcon, ClockIcon, BookOpenIcon } from '@heroicons/react/24/outline';

export default function GenerateStudyPlanPage() {
  return (
    <Suspense fallback={<div className="text-white p-8">Loading...</div>}>
      <Content />
    </Suspense>
  );
}

function Content() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const urlCourseTitle = searchParams.get('title') || '';
  const urlCourseId = searchParams.get('course_id') || '';
  const isFromExistingCourse = !!urlCourseId;

  const [form, setForm] = useState({
    course: urlCourseTitle,
    examDate: '',
    hoursPerDay: '3',
    topics: '',
    goal: 'exam',
  });

  useEffect(() => {
    if (urlCourseTitle) setForm(prev => ({ ...prev, course: urlCourseTitle }));
  }, [urlCourseTitle]);

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
      if (!user) throw new Error("Not authenticated");

      const courseId = urlCourseId || (
        await supabase.from("courses")
          .select("id").eq("user_id", user.id).eq("title", form.course.trim())
          .maybeSingle()
          .then(async (res) => {
            if (res.data) return res.data.id;
            const { data } = await supabase.from("courses").insert({
              user_id: user.id,
              title: form.course.trim(),
              description: "AI-generated study plan",
              color: 'purple',
            }).select().single();
            return data.id;
          })
      );

      await supabase.from("ai_study_plans").insert({
        user_id: user.id,
        course_id: courseId,
        content: plan,
      });

      await supabase.from("progress").upsert({
        user_id: user.id,
        course_id: courseId,
        completed_tasks: 0,
        total_tasks: plan.schedule?.length || 0,
        progress_percent: 0,
      });

      router.push("/dashboard/student/study-plans");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to generate plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0d0d0f] text-white flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-white/10 backdrop-blur-xl bg-black/40">
        <button onClick={() => router.push('/dashboard/student')} className="p-3 hover:bg-white/10 rounded-xl transition">
          <ArrowLeftIcon className="w-7 h-7" />
        </button>
        <h1 className="text-lg md:text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
          Generate Study Plan
        </h1>
        <div className="w-14" />
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">
              {isFromExistingCourse ? `New Plan for "${urlCourseTitle}"` : 'Your AI Academic Coach'}
            </h2>
            <p className="text-xl text-gray-300">
              {isFromExistingCourse ? 'Create another personalized study schedule' : 'Create a personalized study schedule in seconds'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-pink-200 font-semibold">
                  <BookOpenIcon className="w-6 h-6" /> Course / Subject
                </label>
                <input
                  required type="text" value={form.course}
                  onChange={(e) => !isFromExistingCourse && setForm({ ...form, course: e.target.value })}
                  disabled={isFromExistingCourse}
                  placeholder="e.g. Organic Chemistry"
                  className={`w-full px-6 py-4 rounded-2xl bg-white/10 backdrop-blur border transition outline-none ${isFromExistingCourse ? 'opacity-70 cursor-not-allowed border-white/30' : 'border-white/20 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50'}`}
                />
                {isFromExistingCourse && <p className="text-sm text-purple-300 mt-2">Linked to existing course</p>}
              </div>

              {/* HOURS PER DAY - FIXED */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-pink-200 font-semibold">
                  <ClockIcon className="w-6 h-6" /> Hours per Day
                </label>
                <div className="relative">
                  <select
                    value={form.hoursPerDay}
                    onChange={(e) => setForm({ ...form, hoursPerDay: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-[#1a1a1e] border border-white/20 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none appearance-none cursor-pointer pr-12"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23f472b6' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 1.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '12px',
                    }}
                  >
                    <option value="1">1 hour</option>
                    <option value="2">2 hours</option>
                    <option value="3">3 hours</option>
                    <option value="4">4 hours</option>
                    <option value="5">5+ hours</option>
                  </select>
                </div>
              </div>

              {/* GOAL - FIXED */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-pink-200 font-semibold">Goal</label>
                <div className="relative">
                  <select
                    value={form.goal}
                    onChange={(e) => setForm({ ...form, goal: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-[#1a1a1e] border border-white/20 text-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none appearance-none cursor-pointer pr-12"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23f472b6' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 1.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '12px',
                    }}
                  >
                    <option value="exam">Ace an Exam</option>
                    <option value="understanding">Deep Understanding</option>
                    <option value="revision">Quick Revision</option>
                    <option value="project">Final Project/Thesis</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 text-pink-200 font-semibold">
                Topics/Chapters (optional)
              </label>
              <textarea
                rows={6}
                placeholder="e.g. Thermodynamics, Cell Division..."
                value={form.topics}
                onChange={(e) => setForm({ ...form, topics: e.target.value })}
                className="w-full px-6 py-4 rounded-2xl bg-white/10 backdrop-blur border border-white/20 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/50 outline-none resize-none text-white placeholder-gray-400"
              />
            </div>

            <div className="text-center pt-12">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-semibold text-lg shadow-lg hover:scale-105 transition disabled:opacity-70"
              >
                {loading ? <>Generating...</> : <><SparklesIcon className="w-6 h-6" /> Generate Study Plan</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}