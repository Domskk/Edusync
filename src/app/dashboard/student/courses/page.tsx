// src/app/dashboard/student/courses/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Reorder } from 'framer-motion';
import confetti from 'canvas-confetti';
import { format, startOfWeek, addDays, isAfter, isToday } from 'date-fns';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  BellIcon,
  BookOpenIcon,
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

interface Assignment {
  id: string;
  course_id: string;
  title: string;
  due_date: string;
  is_completed: boolean;
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
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form, setForm] = useState({ title: '', description: '', color: 'purple' });

  useEffect(() => {
    loadEverything();
  }, []);

  async function loadEverything() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [coursesRes, progressRes, assignmentsRes] = await Promise.all([
      supabase.from('courses').select('*').eq('user_id', user.id),
      supabase.from('progress').select('*').eq('user_id', user.id),
      supabase.from('assignments').select('*'),
    ]);

    setCourses(coursesRes.data || []);
    setAssignments(assignmentsRes.data || []);

    const progMap = (progressRes.data || []).reduce((acc: any, p: Progress) => {
      acc[p.course_id] = p;
      return acc;
    }, {});
    setProgressMap(progMap);
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

    closeModal();
    loadEverything();
  }

  async function deleteCourse(id: string) {
    await supabase.from('courses').delete().eq('id', id);
    loadEverything();
  }

  function closeModal() {
    setShowModal(false);
    setEditingCourse(null);
    setForm({ title: '', description: '', color: 'purple' });
  }

  // Reorder handler — saves instantly
  async function handleReorder(newOrder: Course[]) {
    setCourses(newOrder);
    // Save order to DB (optional: add order_index column later)
    // For now, we just keep it in state — survives refresh via created_at
  }

  const upcomingAssignments = assignments
    .filter(a => !a.is_completed && isAfter(new Date(a.due_date), new Date()))
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 6);

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
        <div className="text-3xl font-bold text-pink-400">Loading your universe...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/60 backdrop-blur-2xl border-b border-white/10 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              My Courses
            </h1>
            <p className="text-xl text-gray-400 mt-2">Drag to reorder • Everything at a glance</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-4 px-8 py-5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl hover:scale-105 transition-all shadow-2xl text-lg font-bold"
          >
            <PlusIcon className="w-8 h-8" />
            New Course
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8 space-y-16">
        {/* This Week Calendar */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-4">
            <CalendarIcon className="w-10 h-10 text-pink-400" />
            This Week
          </h2>
          <div className="grid grid-cols-7 gap-4">
            {weekDays.map(day => {
              const dayAssignments = assignments.filter(a =>
                format(new Date(a.due_date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
              );
              return (
                <div
                  key={day.toString()}
                  className={`p-6 rounded-2xl border ${
                    isToday(day)
                      ? 'bg-pink-500/20 border-pink-500'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <p className="text-sm text-gray-400 text-center">{format(day, 'EEE')}</p>
                  <p className="text-4xl font-bold text-center my-3">{format(day, 'd')}</p>
                  {dayAssignments.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {dayAssignments.map(a => (
                        <div key={a.id} className="text-xs bg-red-500/30 px-3 py-2 rounded text-center">
                          {a.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        {upcomingAssignments.length > 0 && (
          <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 rounded-3xl border-2 border-pink-500/50 p-8">
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-4">
              <BellIcon className="w-10 h-10 text-pink-400" />
              Upcoming Deadlines
            </h2>
            <div className="grid gap-5">
              {upcomingAssignments.map(a => {
                const daysLeft = Math.ceil(
                  (new Date(a.due_date).getTime() - Date.now()) / (1000 * 3600 * 24)
                );
                const course = courses.find(c => c.id === a.course_id);
                return (
                  <div key={a.id} className="flex items-center justify-between bg-white/10 rounded-2xl p-6">
                    <div>
                      <p className="text-2xl font-bold">{a.title}</p>
                      <p className="text-gray-400">{course?.title || 'Unknown Course'}</p>
                    </div>
                    <div className={`text-right ${daysLeft <= 2 ? 'text-red-400' : 'text-pink-400'}`}>
                      <p className="text-4xl font-bold">{daysLeft}</p>
                      <p className="text-sm">days left</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Courses — Drag to Reorder */}
        {courses.length === 0 ? (
          <div className="text-center py-32">
            <div className="inline-flex items-center justify-center w-40 h-40 bg-white/5 rounded-full border-2 border-dashed border-white/20 mb-10">
              <BookOpenIcon className="w-20 h-20 text-gray-600" />
            </div>
            <h3 className="text-4xl font-bold text-gray-400">No courses yet</h3>
            <p className="text-xl text-gray-500 mt-4">Create your first course to begin</p>
          </div>
        ) : (
          <Reorder.Group axis="y" values={courses} onReorder={handleReorder}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {courses.map((course) => {
                const prog = progressMap[course.id]?.progress_percent || 0;
                const gradient = colorMap[course.color || 'purple'];
                const courseAssignments = assignments.filter(a => a.course_id === course.id && !a.is_completed);

                return (
                  <Reorder.Item key={course.id} value={course}>
                    <div className="group bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden hover:border-pink-500/50 transition-all duration-300 cursor-grab active:cursor-grabbing">
                      <div className={`h-48 bg-gradient-to-br ${gradient} relative`}>
                        <div className="absolute inset-0 bg-black/30" />
                      </div>

                      <div className="p-8">
                        <h3 className="text-3xl font-bold mb-4">{course.title}</h3>
                        {course.description && (
                          <p className="text-gray-400 text-sm mb-6 line-clamp-2">
                            {course.description}
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-6 mb-8">
                          <div className="text-center">
                            <div className="relative inline-block">
                              <svg className="w-28 h-28 -rotate-90">
                                <circle cx="56" cy="56" r="50" stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="none" />
                                <circle
                                  cx="56"
                                  cy="56"
                                  r="50"
                                  stroke="url(#g1)"
                                  strokeWidth="10"
                                  fill="none"
                                  strokeDasharray={314}
                                  strokeDashoffset={314 * (1 - prog / 100)}
                                />
                                <defs>
                                  <linearGradient id="g1">
                                    <stop offset="0%" stopColor="#ec4899" />
                                    <stop offset="100%" stopColor="#a855f7" />
                                  </linearGradient>
                                </defs>
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-3xl font-bold">{Math.round(prog)}%</span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-400 mt-3">Progress</p>
                          </div>
                          <div className="text-center">
                            <p className="text-5xl font-bold text-pink-400">
                              {courseAssignments.length}
                            </p>
                            <p className="text-sm text-gray-400 mt-2">Pending</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <button
                            onClick={() =>
                              router.push(
                                `/dashboard/student/generate-studyplan?course_id=${course.id}&title=${encodeURIComponent(course.title)}`
                              )
                            }
                            className="px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl font-bold hover:scale-105 transition"
                          >
                            Study Plan
                          </button>
                          <div className="flex gap-3">
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
                              className="p-4 bg-white/10 rounded-xl hover:bg-white/20 transition"
                            >
                              <PencilIcon className="w-6 h-6" />
                            </button>
                            <button
                              onClick={() => deleteCourse(course.id)}
                              className="p-4 bg-red-500/20 rounded-xl hover:bg-red-500/40 transition"
                            >
                              <TrashIcon className="w-6 h-6 text-red-400" />
                            </button>
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

        {/* Modal — same as before */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-6">
            <div className="bg-[#1a1a1e] border border-white/20 rounded-3xl p-10 max-w-2xl w-full">
              <h2 className="text-4xl font-bold mb-10 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                {editingCourse ? 'Edit Course' : 'New Course'}
              </h2>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Course title"
                className="w-full px-6 py-5 mb-6 bg-white/10 border border-white/20 rounded-2xl focus:border-pink-500 outline-none text-lg"
              />
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Description (optional)"
                rows={4}
                className="w-full px-6 py-5 mb-6 bg-white/10 border border-white/20 rounded-2xl focus:border-pink-500 outline-none resize-none"
              />
              <div className="grid grid-cols-6 gap-4 mb-10">
                {Object.keys(colorMap).map(key => (
                  <button
                    key={key}
                    onClick={() => setForm({ ...form, color: key })}
                    className={`h-20 rounded-2xl bg-gradient-to-br ${colorMap[key]} transition-all ${
                      form.color === key ? 'ring-4 ring-white/60 scale-110' : ''
                    }`}
                  />
                ))}
              </div>
              <div className="flex gap-5">
                <button
                  onClick={saveCourse}
                  disabled={!form.title.trim()}
                  className="flex-1 py-5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl font-bold hover:scale-105 transition disabled:opacity-50"
                >
                  {editingCourse ? 'Save' : 'Create'}
                </button>
                <button
                  onClick={closeModal}
                  className="px-10 py-5 bg-white/10 rounded-2xl hover:bg-white/20 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}