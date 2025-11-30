'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function SharedBoard({ boardId }: { boardId: string }) {
  const [content, setContent] = useState('');

  useEffect(() => {
    const subscription = supabase
      .channel(`board:${boardId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shared_boards', filter: `id=eq.${boardId}` }, (payload) => {
        setContent(payload.new.content);
      })
      .subscribe();

    const fetchBoard = async () => {
      const { data } = await supabase.from('shared_boards').select('content').eq('id', boardId).single();
      setContent(data?.content || '');
    };
    fetchBoard();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [boardId]);

  const updateBoard = async () => {
    await supabase.from('shared_boards').update({ content }).eq('id', boardId);
  };

  return (
    <div className="p-4 border rounded">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full p-2 border rounded h-64"
      />
      <button onClick={updateBoard} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
        Save
      </button>
    </div>
  );
}