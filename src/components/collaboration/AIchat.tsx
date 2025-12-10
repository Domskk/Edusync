  'use client';

  import { useState, useRef, useEffect, useCallback } from 'react';
  import { supabase } from '@/lib/supabase/client';
  import { PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/outline';
  import { format } from 'date-fns';
  import { v4 as uuidv4 } from 'uuid';

  interface Message {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    created_at?: string;
  }

  async function generateTitle(firstMsg: string): Promise<string> {
    const clean = firstMsg.replace(/\s+/g, ' ').trim();
    return clean.length > 40 ? clean.slice(0, 37) + '...' : clean;
  }

  export default function AIChat({
    chatId,
    onTitleUpdate,
    sidebarOpen,
  }: {
    chatId: string | null;
    onTitleUpdate: (id: string, title: string) => void;
    sidebarOpen: boolean;
  }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea like ChatGPT
    useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }, [input]);

    // Smooth scroll to bottom
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadMessages = useCallback(async () => {
      if (!chatId) {
        setMessages([]);
        return;
      }

      const { data } = await supabase
        .from('ai_chats')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(
          data.map(m => ({
            id: m.id,
            sender: m.sender as 'user' | 'ai',
            text: m.message,
            created_at: m.created_at,
          }))
        );
      }
    }, [chatId]);

    useEffect(() => {
      loadMessages();
    }, [chatId, loadMessages]);

    const sendMessage = async () => {
      if (!chatId || !input.trim() || loading) return;

      const text = input.trim();
      setInput('');
      setLoading(true);

      const userMsg: Message = { id: uuidv4(), sender: 'user', text };
      setMessages(prev => [...prev, userMsg]);

      await supabase.from('ai_chats').insert({
        id: userMsg.id,
        chat_id: chatId,
        message: text,
        sender: 'user',
      });

      // Auto-title first message
      if (messages.length === 0) {
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

        if (!res.ok) throw new Error();

        const { reply } = await res.json();
        const aiText = (reply || '').trim();

        if (aiText) {
          const aiMsg: Message = {
            id: uuidv4(),
            sender: 'ai',
            text: aiText,
            created_at: new Date().toISOString(),
          };
          setMessages(prev => [...prev, aiMsg]);

          await supabase.from('ai_chats').insert({
            id: aiMsg.id,
            chat_id: chatId,
            message: aiText,
            sender: 'ai',
          });
        }
      } catch {
        setMessages(prev => [
          ...prev,
          {
            id: uuidv4(),
            sender: 'ai',
            text: 'Sorry, something went wrong. Please try again.',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="flex flex-col h-full bg-[#0a0a0b]">
        {/* MESSAGES AREA - NO SCROLLBAR EVER */}
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-32 scrollbar-hide">
          {messages.length === 0 && !loading && (
            <div className="text-center mt-32 text-gray-500">
              <SparklesIcon className="w-16 h-16 mx-auto mb-6 text-purple-400 opacity-40" />
              <p className="text-lg font-medium">Start a conversation</p>
              <p className="text-sm opacity-70 mt-2">Ask anything about your studies</p>
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex mb-8 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-4 max-w-3xl ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* AI Avatar - only for AI */}
                {msg.sender === 'ai' && (
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-2xl flex-shrink-0 ring-4 ring-purple-500/20">
                    <SparklesIcon className="w-6 h-6 text-white" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`px-6 py-4 rounded-3xl shadow-xl backdrop-blur-xl border ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400/30'
                      : 'bg-white/10 text-gray-100 border-white/10'
                  }`}
                >
                  <p className="text-base leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  {msg.created_at && (
                    <p className="text-xs mt-3 opacity-50 text-right">
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex gap-4 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-2xl ring-4 ring-purple-500/20">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div className="px-6 py-4 rounded-3xl bg-white/10 border border-white/10">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA - EXACTLY LIKE YOUR DESIGN */}
        <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/95 to-transparent pt-12 pb-6 px-6 transition-all duration-300 ${sidebarOpen ? 'md:ml-72' : 'md:ml-0'}`}>
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-4 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Message your AI Study Buddy..."
                  className="w-full resize-none bg-white/10 backdrop-blur-2xl rounded-2xl px-5 py-4 text-white placeholder-gray-400 border border-white/20 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 outline-none transition-all duration-300 scrollbar-hide"
                  rows={1}
                />
              </div>

              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="relative p-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-40 transition-all shadow-2xl shadow-purple-600/50 hover:scale-105 active:scale-95"
              >
                <PaperAirplaneIcon className="w-6 h-6 text-white -rotate-45" />
              </button>
            </div>

            <p className="text-center text-xs text-gray-500 mt-4 opacity-80">
              AI Study Buddy can make mistakes. Always double-check important info.
            </p>
          </div>
        </div>

        {/* HIDE SCROLLBAR EVERYWHERE */}
        <style jsx global>{`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    );
  }