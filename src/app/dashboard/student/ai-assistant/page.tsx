'use client';

import AIChat from '@/components/AiChat/AIchat';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  PlusIcon,
  ChatBubbleLeftEllipsisIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowLeftIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

interface ChatSession {
  id: string;
  title: string | null;
  created_at: string;
  user_id: string;
}

export default function AIAssistantPage() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Load chats for current user only
  const loadChats = useCallback(async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)  // Filter by current user
      .order('created_at', { ascending: false });

    const chatList = data || [];
    setChats(chatList);

    // Auto-select first chat if none selected
    if (chatList.length > 0 && !selectedChatId) {
      setSelectedChatId(chatList[0].id);
    }
  }, [userId, selectedChatId]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Hide sidebar on mobile on mount
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Load on mount + when userId is available
  useEffect(() => {
    if (userId) {
      loadChats();
    }
  }, [userId, loadChats]);

  const startNewChat = useCallback(async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('chat_sessions')
      .insert([{ title: 'New Chat', user_id: userId }])  // Include user_id
      .select()
      .single();

    if (data) {
      setChats(prev => [data, ...prev]);
      setSelectedChatId(data.id);
    }
  }, [userId]);

  const deleteChat = useCallback(
    async (id: string) => {
      await supabase.from('chat_sessions').delete().eq('id', id);
      setChats(prev => prev.filter(c => c.id !== id));

      if (selectedChatId === id) {
        const remainingChats = chats.filter(c => c.id !== id);
        setSelectedChatId(remainingChats[0]?.id ?? null);
      }
    },
    [selectedChatId, chats]
  );

  const updateTitle = useCallback((id: string, title: string) => {
    setChats(prev => prev.map(c => (c.id === id ? { ...c, title } : c)));
  }, []);

  return (
    <div className="fixed inset-0 flex bg-[#0a0a0b] text-white overflow-hidden">
      {/* SIDEBAR */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-black/60 backdrop-blur-3xl border-r border-white/10 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold">History</h2>
          <button
            onClick={startNewChat}
            className="p-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl hover:scale-110 transition-all shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {chats.length === 0 ? (
            <div className="text-center text-gray-400 text-sm mt-8">
              No chats yet. Start a new one!
            </div>
          ) : (
            chats.map(chat => (
              <div
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`group flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all ${
                  selectedChatId === chat.id
                    ? 'bg-white/15 shadow-lg shadow-blue-500/20'
                    : 'hover:bg-white/8'
                }`}
              >
                <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span className="text-sm truncate flex-1">
                  {chat.title || 'New Chat'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this chat?')) deleteChat(chat.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MAIN CHAT */}
      <div className={`flex-1 flex flex-col ${sidebarOpen ? 'ml-72' : 'ml-0'} transition-all duration-300`}>
        {/* Top Bar */}
        <div className="sticky top-0 z-40 bg-black/50 backdrop-blur-3xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-3 hover:bg-white/10 rounded-xl transition"
          >
            {sidebarOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
          </button>

          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            AI Study Buddy
          </h1>

          <button
            onClick={() => router.push('/dashboard/student')}
            className="p-3 hover:bg-white/10 rounded-xl transition"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          {selectedChatId ? (
            <AIChat chatId={selectedChatId} onTitleUpdate={updateTitle} sidebarOpen={sidebarOpen} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <ChatBubbleLeftEllipsisIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a chat or start a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}