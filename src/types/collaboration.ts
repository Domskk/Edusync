// src/lib/types/collaboration.ts
export interface Attachment {
  name: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface CardComment {
  id: string;
  card_id: string;
  board_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    display_name?: string | null;
    avatar_url?: string | null;
  };
}

export interface BoardActivity {
  id: string;
  board_id: string;
  user_id: string;
  action: string;
  details?: Record<string, unknown>;
  created_at: string;
  user?: {
    display_name?: string | null;
    avatar_url?: string | null;
  };
}

export interface Card {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  attachments?: Attachment[];
  dueDate?: string | null;
  labels?: string[];
  comments?: CardComment[];
}

export interface Column {
  id: string;
  title: string;
  cardIds: string[];
}

export interface Board {
  id: string;
  title: string;
  background_color: string;
  columns: Column[];
  cards: Record<string, Card>;
  collaborator_ids: string[];
  owner_id: string;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface PendingInvite {
  id: string;
  board_id: string;
  board_title: string;
  invited_by_name: string;
  invited_by_avatar?: string | null;
}

export interface AlertState {
  open: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
}