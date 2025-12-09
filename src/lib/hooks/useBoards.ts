// lib/hooks/useBoards.ts
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

interface Column { id: string; title: string; cardIds: string[]; }
interface Attachment { name: string; url: string; uploadedBy: string; uploadedAt: string; }
interface Card { id: string; title: string; description?: string; columnId: string; attachments?: Attachment[]; dueDate?: string | null; }
interface Board {
  id: string;
  title: string;
  background_color: string;
  columns: Column[];
  cards: Record<string, Card>;
  collaborator_ids: string[];
  owner_id: string;
}

export function useBoards(currentUserId: string | null | undefined) {
  const [boards, setBoards] = useState<Board[]>([]);

  const loadBoards = useCallback(async () => {
    if (!currentUserId) {
      setBoards([]);
      return;
    }

    const { data, error } = await supabase
      .from('shared_boards')
      .select('*')
      .or(`owner_id.eq.${currentUserId},collaborator_ids.cs.{${currentUserId}}`);

    if (error) {
      console.error('Load boards error:', error);
      return;
    }

    const typedBoards: Board[] = (data ?? []).map((row): Board => ({
      id: row.id,
      title: row.title ?? 'Untitled Board',
      background_color: row.background_color ?? '#7c3aed',
      owner_id: row.owner_id,
      collaborator_ids: row.collaborator_ids ?? [],
      columns: Array.isArray(row.columns) ? row.columns : [
        { id: 'col1', title: 'To Do', cardIds: [] },
        { id: 'col2', title: 'In Progress', cardIds: [] },
        { id: 'col3', title: 'Done', cardIds: [] },
      ],
      cards: typeof row.cards === 'object' && row.cards !== null ? row.cards : {},
    }));

    setBoards(typedBoards);
  }, [currentUserId]);

  return { boards, loadBoards };
}