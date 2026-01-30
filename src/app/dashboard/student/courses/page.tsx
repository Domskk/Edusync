  'use client';

  import { useEffect, useState } from 'react';
  import { supabase } from '@/lib/supabase/client';
  import { useRouter } from 'next/navigation';
  import { Reorder } from 'framer-motion';
  import { format, startOfWeek, addDays, isToday } from 'date-fns';
  import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    CalendarIcon,
    BookOpenIcon,
    ArrowLeftIcon,
    Bars3Icon,
  } from '@heroicons/react/24/outline';

  interface Course {
    id: string;
    title: string;
    description: string | null;
    color: string | null;
  }

  interface Progress {
    course_id: string;
    progress_percent: number;
  }

  const colorMap: Record<string, string> = {
    pink: 'from-pink-500 to-rose-600',
    purple: 'from-purple-500 to-indigo-600',
    blue: 'from-blue-500 to-cyan-600',
    green: 'from-emerald-500 to-teal-600',
    orange: 'from-orange-500 to-amber-600',
    red: 'from-red-500 to-pink-600',
  };

  export default function MyCoursesPage() {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [progressMap, setProgressMap] = useState<Record<string, Progress>>({});
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [form, setForm] = useState({ title: '', description: '', color: 'purple' });

    useEffect(() => {
      loadData();
    }, []);

    async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [coursesRes, plansRes] = await Promise.all([
      supabase.from('courses').select('*').eq('user_id', user.id),
      supabase.from('ai_study_plans').select('course_id, id, content').eq('user_id', user.id),
    ]);

    setCourses(coursesRes.data || []);

    const progressMap: Record<string, number> = {};

    coursesRes.data?.forEach(course => {
      const coursePlans = plansRes.data?.filter(p => p.course_id === course.id) || [];
      let total = 0;
      let completed = 0;

      coursePlans.forEach(plan => {
        total += plan.content.schedule.length;
        const saved = localStorage.getItem(`studyplan_${plan.id}`);
        if (saved) {
          try {
            completed += JSON.parse(saved).length;
          } catch {}
        }
      });

      progressMap[course.id] = total > 0 ? Math.round((completed / total) * 100) : 0;
    });

    setProgressMap(Object.fromEntries(
      Object.entries(progressMap).map(([k, v]) => [k, { course_id: k, progress_percent: v }])
    ));

    setLoading(false);
  }

    async function saveCourse() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !form.title.trim()) return;

      const payload = {
        user_id: user.id,
        title: form.title,
        description: form.description || null,
        color: form.color,
      };

      if (editingCourse) {
        await supabase.from('courses').update(payload).eq('id', editingCourse.id);
      } else {
        await supabase.from('courses').insert(payload);
      }

      setShowModal(false);
      setEditingCourse(null);
      setForm({ title: '', description: '', color: 'purple' });
      loadData();
    }

    async function deleteCourse(id: string) {
      if (!confirm('Delete this course?')) return;
      await supabase.from('courses').delete().eq('id', id);
      loadData();
    }

    const weekDays = Array.from({ length: 7 }, (_, i) =>
      addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i)
    );

    if (loading) {
      return (
        <div className="fixed inset-0 bg-[#0d0d0f] flex items-center justify-center">
          <div className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Loading...
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-[#0d0d0f] text-white flex flex-col">

        {/* HEADER */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10 backdrop-blur-xl bg-black/50">
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            My Courses
          </h1>

          <div className="flex items-center gap-3 md:gap-6">
            <button
              onClick={() => router.push('/dashboard/student')}
              className="p-2 md:p-3 hover:bg-white/10 rounded-lg md:rounded-xl transition"
            >
              <ArrowLeftIcon className="w-5 h-5 md:w-7 md:h-7" />
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 md:gap-3 px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full font-bold text-base md:text-lg hover:scale-105 transition shadow-2xl shadow-purple-500/50"
            >
              <PlusIcon className="w-5 h-5 md:w-7 md:h-7" />
              New Course
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8 md:space-y-16">

            {/* This Week Calendar */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl md:rounded-3xl border border-white/10 p-6 md:p-10">
              <h2 className="text-2xl md:text-4xl font-bold mb-6 md:mb-10 flex items-center gap-3 md:gap-4">
                <CalendarIcon className="w-8 h-8 md:w-12 md:h-12 text-pink-400" />
                This Week
              </h2>
              <div className="grid grid-cols-7 gap-3 md:gap-6">
                {weekDays.map(day => (
                  <div
                    key={day.toString()}
                    className={`p-4 md:p-8 rounded-2xl md:rounded-3xl text-center transition-all ${
                      isToday(day)
                        ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-2xl shadow-pink-500/50'
                        : 'bg-white/5 text-gray-300'
                    }`}
                  >
                    <p className="text-sm md:text-lg opacity-80">{format(day, 'EEE')}</p>
                    <p className="text-3xl md:text-5xl font-bold mt-2 md:mt-4">{format(day, 'd')}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Courses List */}
            {courses.length === 0 ? (
              <div className="text-center py-32">
                <div className="inline-flex items-center justify-center w-48 h-48 bg-white/5 rounded-full border-4 border-dashed border-white/20 mb-10">
                  <BookOpenIcon className="w-24 h-24 text-gray-600" />
                </div>
                <h3 className="text-5xl font-bold text-gray-400 mb-4">No courses yet</h3>
                <p className="text-2xl text-gray-500">Create your first course to get started!</p>
              </div>
            ) : (
              <Reorder.Group axis="y" values={courses} onReorder={setCourses}>
                <div className="space-y-8">
                  {courses.map((course) => {
                    const prog = progressMap[course.id]?.progress_percent || 0;
                    const gradient = colorMap[course.color || 'purple'];

                    return (
                      <Reorder.Item key={course.id} value={course}>
                        <div className="group bg-white/5 backdrop-blur-2xl rounded-3xl overflow-hidden border border-white/10 hover:border-pink-500/50 transition-all">
                          {/* Course Card */}
                          <div className="flex flex-col">
                            {/* Color Bar */}
                            <div className={`h-12 md:h-16 bg-gradient-to-r ${gradient} flex items-center justify-between px-4 md:px-6`}>
                              <h3 className="text-lg md:text-2xl font-bold text-white whitespace-nowrap">
                                {course.title}
                              </h3>
                              <Bars3Icon className="w-6 h-6 md:w-8 md:h-8 text-white/50 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 p-6 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between">
                              <div className="flex-1 mb-6 md:mb-0">
                                {/* Progress Circle */}
                                <div className="relative inline-block">
                                  <svg className="w-32 h-32 md:w-40 md:h-40 -rotate-90">
                                    <circle cx="64" cy="64" r="58" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
                                    <circle
                                      cx="64"
                                      cy="64"
                                      r="58"
                                      stroke="url(#grad)"
                                      strokeWidth="12"
                                      fill="none"
                                      strokeDasharray={362}
                                      strokeDashoffset={362 * (1 - prog / 100)}
                                      className="transition-all duration-1000"
                                    />
                                    <defs>
                                      <linearGradient id="grad">
                                        <stop offset="0%" stopColor="#ec4899" />
                                        <stop offset="100%" stopColor="#a855f7" />
                                      </linearGradient>
                                    </defs>
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-3xl md:text-5xl font-bold">{Math.round(prog)}%</span>
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                                <button
                                  onClick={() => router.push(`/dashboard/student/generate-studyplan?course_id=${course.id}&title=${encodeURIComponent(course.title)}`)}
                                  className="px-6 py-3 md:px-8 md:py-5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full font-bold text-base md:text-lg hover:scale-105 transition shadow-xl"
                                >
                                  Study Plan
                                </button>

                                <div className="flex gap-3 md:gap-4">
                                  <button
                                    onClick={() => {
                                      setEditingCourse(course);
                                      setForm({
                                        title: course.title,
                                        description: course.description || '',
                                        color: course.color || 'purple',
                                      });
                                      setShowModal(true);
                                    }}
                                    className="p-3 md:p-5 bg-white/10 rounded-xl md:rounded-2xl hover:bg-white/20 transition"
                                  >
                                    <PencilIcon className="w-5 h-5 md:w-7 md:h-7" />
                                  </button>

                                  <button
                                    onClick={() => deleteCourse(course.id)}
                                    className="p-3 md:p-5 bg-red-500/20 rounded-xl md:rounded-2xl hover:bg-red-500/40 transition"
                                  >
                                    <TrashIcon className="w-5 h-5 md:w-7 md:h-7 text-red-400" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Reorder.Item>
                    );
                  })}
                </div>
              </Reorder.Group>
            )}
          </div>
        </div>

        {/* Modal - Same as before */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-4 md:p-6">
            <div className="bg-[#1a1a1e] border border-white/20 rounded-2xl md:rounded-3xl p-6 md:p-10 max-w-2xl w-full shadow-2xl">
              <h2 className="text-2xl md:text-4xl font-bold mb-6 md:mb-10 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                {editingCourse ? 'Edit Course' : 'New Course'}
              </h2>

              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Course title"
                className="w-full px-4 md:px-6 py-4 md:py-5 mb-4 md:mb-6 bg-white/10 border border-white/20 rounded-xl md:rounded-2xl focus:border-pink-500 outline-none text-base md:text-lg"
              />

              <div className="grid grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-10">
                {Object.keys(colorMap).map(key => (
                  <button
                    key={key}
                    onClick={() => setForm({ ...form, color: key })}
                    className={`h-16 md:h-20 rounded-xl md:rounded-2xl bg-gradient-to-br ${colorMap[key]} transition-all ${
                      form.color === key ? 'ring-4 ring-white/60 scale-110' : ''
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-3 md:gap-5">
                <button
                  onClick={saveCourse}
                  disabled={!form.title.trim()}
                  className="flex-1 py-4 md:py-5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl md:rounded-2xl font-bold hover:scale-105 transition disabled:opacity-50"
                >
                  {editingCourse ? 'Save' : 'Create'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 md:px-10 py-4 md:py-5 bg-white/10 rounded-xl md:rounded-2xl hover:bg-white/20 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }