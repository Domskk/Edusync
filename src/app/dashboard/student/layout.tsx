// src/app/dashboard/student/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  GraduationCap, Bot, NotebookPen, ClipboardList,
  Menu, LogOut, User, Sparkles, X, Calendar,BookOpen
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [loadingName, setLoadingName] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const navItems = [
    { href: '/dashboard/student', label: 'Dashboard', icon: <GraduationCap size={22} /> },
    { href: '/dashboard/student/ai-assistant', label: 'AI Study Buddy', icon: <Bot size={22} /> },
    { href: '/dashboard/student/assignments', label: 'Assignments', icon: <NotebookPen size={22} /> },
    { href: '/dashboard/student/generate-studyplan', label: 'Generate Study Plan', icon: <ClipboardList size={22} /> },
    { href: '/dashboard/student/study-plans', label: 'My Study Plans', icon: <Calendar size={22} /> },
    { href: '/dashboard/student/collaboration', label: 'Collaboration', icon: <User size={22} /> },
    { href: '/dashboard/student/flash-cards', label: 'Flash Cards', icon: <Sparkles size={22} /> },
    { href: '/dashboard/student/quiz', label: 'Quizzes', icon: <BookOpen size={22} /> },

  ];

  const loadProfileAndCheckOnboarding = async () => {
    setIsChecking(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsChecking(false); return; }

    const { data, error } = await supabase
      .from('users')
      .select('display_name, full_name')
      .eq('id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      setShowDisplayNameModal(true);
    } else if (data && !data.display_name?.trim() && !data.full_name?.trim()) {
      setShowDisplayNameModal(true);
    }
    setIsChecking(false);
  };

  useEffect(() => { loadProfileAndCheckOnboarding(); }, []);

  const saveDisplayName = async () => {
    if (!newDisplayName.trim() || newDisplayName.length < 2) return;
    setLoadingName(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('users').update({ display_name: newDisplayName.trim() }).eq('id', user.id);
    setLoadingName(false);
    setShowDisplayNameModal(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <>
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-800/30 via-transparent" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-32 w-96 h-96 bg-cyan-600 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-4000" />
      </div>

      <div className="flex h-screen overflow-hidden">

        {/* SIDEBAR */}
        <aside className={`relative flex flex-col bg-black/40 backdrop-blur-2xl border-r border-white/10 text-white transition-all duration-500 ${isCollapsed ? 'w-20' : 'w-80'}`}>

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 relative">
            {/* Logo - Only visible & interactive when expanded */}
            <motion.h1
              animate={{
                opacity: isCollapsed ? 0 : 1,
                scale: isCollapsed ? 0.8 : 1,
                x: isCollapsed ? -10 : 0
              }}
              transition={{ duration: 0.3 }}
              className={`font-black text-3xl bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent origin-left pointer-events-none ${isCollapsed ? 'invisible' : 'visible'}`}
            >
              EduSync
            </motion.h1>

            {/* Toggle Button - Always on top and clickable */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 z-50 rounded-xl bg-white/10 hover:bg-white/20 transition-all hover:scale-110 p-3.5 flex items-center justify-center`}
            >
              <motion.div
                key={isCollapsed ? 'open' : 'close'}
                initial={{ rotate: isCollapsed ? -90 : 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                {isCollapsed ? <Menu size={26} /> : <X size={26} />}
              </motion.div>
            </button>
          </div>

          {/* NAVIGATION */}
          <nav className={`flex-1 px-4 py-6 space-y-2 ${isCollapsed ? 'px-2' : 'px-4'}`}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ x: isCollapsed ? 0 : 10 }}
                    whileTap={{ scale: 0.96 }}
                    className={`
                      flex items-center rounded-2xl px-5 py-4 transition-all
                      ${isCollapsed ? 'justify-center px-0' : 'gap-5'}
                      ${isActive
                        ? 'bg-gradient-to-r from-pink-500/30 to-purple-500/30 border border-pink-500/40 shadow-xl'
                        : 'hover:bg-white/10'}
                    `}
                  >
                    <div className={isActive ? 'text-pink-400' : 'text-gray-400'}>
                      {item.icon}
                    </div>

                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className={`font-medium text-lg ${isActive ? 'text-white' : 'text-gray-300'}`}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          {/* FOOTER */}
          <div className="border-t border-white/10 mt-auto">
            <div className="px-4 py-3">
              <button
                onClick={() => setShowLogoutModal(true)}
                className={`
                  w-full flex items-center rounded-2xl transition-all group
                  ${isCollapsed 
                    ? 'justify-center px-0 py-4' 
                    : 'px-5 py-4 gap-5 hover:bg-red-500/10'
                  }
                `}
              >
                <LogOut size={22} className="text-gray-400 group-hover:text-red-400" />
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="font-medium text-lg text-gray-300 group-hover:text-red-400"
                  >
                    Logout
                  </motion.span>
                )}
              </button>
            </div>

            <motion.div
              animate={{ opacity: isCollapsed ? 0 : 1, scale: isCollapsed ? 0.9 : 1 }}
              transition={{ duration: 0.3 }}
              className="text-center pb-6"
            >
              <p className="text-xs text-gray-500">@EduSync</p>
              <p className="text-xs text-gray-600 mt-1">Built with passion in 2025</p>
            </motion.div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="min-h-screen">{children}</div>
        </main>
      </div>

      {/* Modals - unchanged */}
      {!isChecking && showDisplayNameModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[100] flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-purple-800/90 via-pink-800/90 to-indigo-900/90 backdrop-blur-3xl rounded-3xl p-10 max-w-md w-full shadow-3xl border border-white/10">
            <div className="text-center mb-10">
              <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
                <Sparkles size={80} className="text-black" />
              </div>
              <h2 className="text-5xl font-black text-white mb-3">Welcome to EduSync!</h2>
              <p className="text-xl text-gray-300">Let’s make it yours</p>
            </div>
            <div className="space-y-6">
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveDisplayName()}
                placeholder="e.g. StudyKing, XPGrinder"
                className="w-full px-8 py-6 bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-gray-400 text-xl focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/30"
                autoFocus
              />
              <button
                onClick={saveDisplayName}
                disabled={!newDisplayName.trim() || loadingName}
                className="w-full py-6 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl font-black text-2xl shadow-2xl hover:scale-105 disabled:opacity-50 transition-all"
              >
                {loadingName ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 backdrop-blur-2xl border border-white/20 rounded-3xl p-10 max-w-md w-full shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-24 h-24 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
                <LogOut size={48} className="text-red-400" />
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">Leave so soon?</h2>
              <p className="text-gray-300 text-lg">Your streak is safe. Come back anytime!</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold transition-all">Stay</button>
              <button onClick={handleLogout} className="flex-1 py-4 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl font-bold hover:scale-105 shadow-lg transition-all">Logout</button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}