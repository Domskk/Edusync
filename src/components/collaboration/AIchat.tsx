'use client';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  PaperAirplaneIcon,
  UserIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  id: string;
  sender: 'user' | 'ai' | 'error';
  text: string;
  created_at?: string;
}

async function generateTitle(firstMsg: string): Promise<string> {
  const clean = firstMsg.replace(/\s+/g, ' ').trim();
  return clean.length > 30 ? clean.slice(0, 30) + '...' : clean;
}

export default function AIChat({
  chatId,
  onTitleUpdate,
}: {
  chatId: string | null;
  onTitleUpdate: (id: string, title: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatId) loadMessages();
    else setMessages([]);
  }, [chatId]);

  async function loadMessages() {
    const { data } = await supabase
      .from('ai_chats')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(
        data.map(m => ({
          id: m.id,
          sender: m.sender,
          text: m.message,
          created_at: m.created_at,
        }))
      );
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!chatId || !input.trim() || loading) return;

    const text = input.trim();
    const userId = uuidv4();
    const aiId = uuidv4();

    setInput('');
    setLoading(true);

    // Add user message instantly
    const userMsg: Message = { id: userId, sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);

    // Insert user message
    await supabase
      .from('ai_chats')
      .insert({ id: userId, chat_id: chatId, message: text, sender: 'user' });

    // Generate title only for first user message
    const userAlreadySent = messages.some(m => m.sender === 'user');
    if (!userAlreadySent) {
      const title = await generateTitle(text);
      onTitleUpdate(chatId, title);
      await supabase.from('chat_sessions').update({ title }).eq('id', chatId);
    }

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, chatId }),
      });

      const { reply } = await res.json();
      const cleaned = reply?.trim();

      if (cleaned) {
        const aiMsg: Message = {
          id: aiId,
          sender: 'ai',
          text: cleaned,
        };

        setMessages(prev => [...prev, aiMsg]);

        await supabase
          .from('ai_chats')
          .insert({
            id: aiId,
            chat_id: chatId,
            message: cleaned,
            sender: 'ai',
          });
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: uuidv4(),
            sender: 'error',
            text: 'I did not understand. Try again.',
          },
        ]);
      }
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          id: uuidv4(),
          sender: 'error',
          text: 'Network error.',
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0f]">

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center mt-20 text-gray-400">
            <p className="text-sm">Start a conversation</p>
            <p className="text-xs opacity-70">Ask anything about your studies</p>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="flex gap-3 max-w-[85%]">

              {/* Avatar */}
              <div>
                {msg.sender === 'user' ? (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <SparklesIcon className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              {/* Bubble */}
              <div
                className={`px-4 py-3 rounded-xl shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-gray-100'
                }`}
              >
                <p className="text-sm">{msg.text}</p>
                {msg.created_at && (
                  <p className="text-[10px] mt-1 opacity-50">
                    {format(new Date(msg.created_at), 'h:mm a')}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div className="px-4 py-3 rounded-xl bg-white/10 animate-pulse text-gray-300">
              Thinking…
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Message AI Study Buddy…"
            className="flex-1 resize-none bg-white/10 text-white rounded-xl p-3 border border-white/20 focus:ring-2 focus:ring-blue-500 outline-none"
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40"
          >
            <PaperAirplaneIcon className="w-5 h-5 rotate-90 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
