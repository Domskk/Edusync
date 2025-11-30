'use client';
import AIChat from '@/components/collaboration/AIchat';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  PlusIcon,
  ChatBubbleLeftEllipsisIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowLeftIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

interface ChatSession {
  id: string;
  title: string | null;
  created_at: string;
}

export default function AIAssistantPage() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    loadChats();
  }, []);

  async function loadChats() {
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    setChats(data || []);
  }

  async function startNewChat() {
    const { data } = await supabase
      .from('chat_sessions')
      .insert([{ title: null }])
      .select()
      .single();

    if (data) {
      setChats(prev => [data, ...prev]);
      setSelectedChatId(data.id);
    }
  }

  async function deleteChat(id: string) {
    await supabase.from('chat_sessions').delete().eq('id', id);
    setChats(prev => prev.filter(c => c.id !== id));
    if (selectedChatId === id) setSelectedChatId(null);
  }

  function updateTitle(id: string, title: string) {
    setChats(prev => prev.map(c => (c.id === id ? { ...c, title } : c)));
  }

  return (
    <div className="fixed inset-0 flex bg-[#0d0d0f] text-white">

      {/* SIDEBAR */}
      <div
        className={`fixed inset-y-0 left-0 z-40 ${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-black/40 backdrop-blur-xl border-r border-white/10 flex flex-col transition-all`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold">History</h2>

          <button
            onClick={startNewChat}
            className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`group flex items-center p-3 rounded-xl cursor-pointer ${
                selectedChatId === chat.id
                  ? 'bg-white/20 border-l-4 border-blue-500'
                  : 'hover:bg-white/10'
              }`}
            >
              <button
                onClick={() => setSelectedChatId(chat.id)}
                className="flex-1 flex items-center gap-2 text-left"
              >
                <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-blue-400" />
                <span className="truncate text-sm">
                  {chat.title || 'New Chat'}
                </span>
              </button>

              <button
                onClick={e => {
                  e.stopPropagation();
                  deleteChat(chat.id);
                }}
                className="p-1 opacity-0 group-hover:opacity-100 text-red-400"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div
        className={`flex-1 flex flex-col transition-all ${
          sidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        {/* HEADER */}
        <div className="sticky top-0 bg-black/30 backdrop-blur-xl px-6 py-4 border-b border-white/10 flex items-center justify-between">
          
          {/* LEFT — Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            {sidebarOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>

          {/* CENTER — Title */}
          <h1 className="text-xl font-bold text-center flex-1 -ml-8">
            AI Study Buddy
          </h1>

          {/* RIGHT — Back */}
          <button
            onClick={() => router.push('/dashboard/student')}
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
        </div>

        {/* CHAT AREA */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="h-full rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
            <AIChat chatId={selectedChatId} onTitleUpdate={updateTitle} />
          </div>
        </div>
      </div>
    </div>
  );
}
