'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  GraduationCap,
  MessageCircle,
  Bot,
  NotebookPen,
  ClipboardList,
  Menu,
  X,
} from 'lucide-react';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { href: '/dashboard/student', label: 'Dashboard', icon: <GraduationCap size={18} /> },
    { href: '/dashboard/student/ai-assistant', label: 'AI Study Buddy', icon: <Bot size={18} /> },
    { href: '/dashboard/student/assignments', label: 'Assignments', icon: <NotebookPen size={18} /> },
    { href: '/dashboard/student/generate-studyplan', label: 'Generate Study Plan', icon: <ClipboardList size={18} /> },
    { href: '/dashboard/student/study-plans', label: 'My Study Plans', icon: <ClipboardList size={18} /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`relative flex flex-col bg-gradient-to-b from-blue-600 to-indigo-700 text-white transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          {!isCollapsed && <h2 className="text-2xl font-extrabold tracking-wide">EduSync</h2>}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-md hover:bg-blue-500 transition"
          >
            {isCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className="block relative">
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-white text-blue-700 font-semibold'
                      : 'hover:bg-blue-500 hover:translate-x-1'
                  }`}
                >
                  {item.icon}
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-0 h-full w-1 bg-white rounded-r"
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto pt-8 border-t border-white/20 px-3 pb-4 text-center">
          {!isCollapsed ? (
            <p className="text-sm text-gray-200">© 2025 EduSync</p>
          ) : (
            <p className="text-xs text-gray-300">©</p>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gradient-to-br from-[#16265e] to-[#1e3a8a] overflow-y-auto p-8 text-white transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
