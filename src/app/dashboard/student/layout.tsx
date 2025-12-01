// src/app/dashboard/student/layout.tsx

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  GraduationCap,
  Bot,
  NotebookPen,
  ClipboardList,
  Menu,
  X,
  LogOut,
  User,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const navItems = [
    { href: '/dashboard/student', label: 'Dashboard', icon: <GraduationCap size={22} /> },
    { href: '/dashboard/student/ai-assistant', label: 'AI Study Buddy', icon: <Bot size={22} /> },
    { href: '/dashboard/student/assignments', label: 'Assignments', icon: <NotebookPen size={22} /> },
    { href: '/dashboard/student/generate-studyplan', label: 'Generate Study Plan', icon: <ClipboardList size={22} /> },
    { href: '/dashboard/student/study-plans', label: 'My Study Plans', icon: <ClipboardList size={22} /> },
    { href: '/dashboard/student/collaboration', label: 'Collaboration', icon: <User size={22} /> },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <>
      {/* Background Blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-800/30 via-transparent" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-32 w-96 h-96 bg-cyan-600 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-4000" />
      </div>

      <div className="flex h-screen overflow-hidden">
        {/* SIDEBAR */}
        <aside className={`relative flex flex-col bg-black/40 backdrop-blur-2xl border-r border-white/10 text-white transition-all duration-500 ease-in-out ${isCollapsed ? 'w-20' : 'w-80'}`}>

          {/* Header: EduSync Text + Toggle */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h1 className={`font-black text-3xl bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent transition-all ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
              EduSync
            </h1>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-3.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-lg transition-all hover:scale-110 active:scale-95 shadow-xl"
            >
              {isCollapsed ? <Menu size={24} /> : <X size={24} />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ x: 10 }}
                    whileTap={{ scale: 0.96 }}
                    className={`flex items-center gap-5 px-5 py-4 rounded-2xl transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-pink-500/30 to-purple-500/30 border border-pink-500/40 shadow-xl shadow-pink-500/30'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <div className={isActive ? 'text-pink-400' : 'text-gray-400'}>
                      {item.icon}
                    </div>
                    {!isCollapsed && (
                      <span className={`font-medium text-lg ${isActive ? 'text-white' : 'text-gray-300'}`}>
                        {item.label}
                      </span>
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </nav>

        {/* LOGOUT + FOOTER */}
        <div className="border-t border-white/10 mt-auto">
          {/* LOGOUT BUTTON — IDENTICAL TO NAV ITEMS */}
          <div className="px-4 py-3"> {/* same as nav items spacing */}
            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center justify-center gap-5 px-5 py-4 rounded-2xl hover:bg-red-500/10 transition-all group"
            >
              <LogOut 
                size={24} 
                className="text-gray-400 group-hover:text-red-400 transition-colors flex-shrink-0" 
              />
              {!isCollapsed && (
                <span className="font-medium text-lg text-gray-300 group-hover:text-red-400 transition-colors">
                  Logout
                </span>
              )}
            </button>
          </div>

          {/* FOOTER — HIDDEN WHEN COLLAPSED */}
          <div className={`text-center pb-6 transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
            <p className="text-xs text-gray-500 font-medium">@EduSync</p>
            <p className="text-xs text-gray-600 mt-1">Built with passion in 2025</p>
          </div>
        </div>

        </aside>  
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-screen">{children}</div>
        </main>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 backdrop-blur-2xl border border-white/20 rounded-3xl p-10 max-w-md w-full shadow-2xl"
          >
            <div className="text-center mb-8">
              <div className="w-24 h-24 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
                <LogOut size={48} className="text-red-400" />
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">Leave so soon?</h2>
              <p className="text-gray-300 text-lg">Your streak is safe. Come back anytime!</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold">
                Stay
              </button>
              <button onClick={handleLogout} className="flex-1 py-4 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl font-bold hover:scale-105 shadow-lg">
                Logout
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}