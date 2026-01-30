// src/lib/utils/useCollaboration.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  Board,
  Card,
  Attachment,
  PendingInvite,
  UserProfile,
  AlertState,
} from '@/types/collaboration';

export function useCollaboration() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [alert, setAlert] = useState<AlertState>({
    open: false,
    type: 'success',
    title: '',
    message: '',
  });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const openDeleteModal = (title: string, message: string, onConfirm: () => void) => {
    setDeleteModal({ isOpen: true, title, message, onConfirm });
  };

  const closeDeleteModal = () => setDeleteModal(prev => ({ ...prev, isOpen: false }));

  // === Auth ===
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user ? { id: user.id, email: user.email } : null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  // === Load Boards & Invites ===
  const loadBoards = useCallback(async () => {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from("shared_boards")
      .select("*")
      .or(`owner_id.eq.${currentUser.id},collaborator_ids.cs.{${currentUser.id}}`);

    if (error) {
      setAlert({ open: true, type: "error", title: "Error", message: "Failed to load boards" });
      return;
    }

    const typedBoards: Board[] = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title ?? "Untitled Board",
      background_color: row.background_color ?? "#7c3aed",
      owner_id: row.owner_id,
      collaborator_ids: row.collaborator_ids ?? [],
      columns: Array.isArray(row.columns)
        ? row.columns
        : [
            { id: "col1", title: "To Do", cardIds: [] },
            { id: "col2", title: "In Progress", cardIds: [] },
            { id: "col3", title: "Done", cardIds: [] }
          ],
      cards: typeof row.cards === "object" && row.cards !== null ? row.cards : {}
    }));

    setBoards(typedBoards);

    // Load pending invites
    const { data: invites } = await supabase
      .from("board_invites")
      .select(`id, board_id, board:shared_boards!board_id(id, title), inviter:users!invited_by(id, display_name, email, avatar_url)`)
      .eq("invited_user_id", currentUser.id)
      .eq("status", "pending");

    setPendingInvites((invites || []).map((i) => {
      const board = Array.isArray(i.board) ? i.board[0] : i.board;
      const inviter = Array.isArray(i.inviter) ? i.inviter[0] : i.inviter;
      return {
        id: i.id,
        board_id: i.board_id,
        board_title: board?.title || "Unknown Board",
        invited_by_name: inviter?.display_name || inviter?.email?.split("@")[0] || "Someone",
        invited_by_avatar: inviter?.avatar_url || null
      };
    }));
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    loadBoards();

    const channel = supabase
      .channel(`boards_${currentUser.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_boards" }, loadBoards)
      .on("postgres_changes", { event: "*", schema: "public", table: "board_invites" }, loadBoards)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, loadBoards]);

  // === Board Operations ===
  const createBoard = async (title: string) => {
    if (!currentUser || !title.trim()) return;

    try {
      await supabase.from('shared_boards').insert({
        title: title.trim(),
        owner_id: currentUser.id,
        background_color: '#7c3aed',
        columns: [
          { id: "col1", title: "To Do", cardIds: [] },
          { id: "col2", title: "In Progress", cardIds: [] },
          { id: "col3", title: "Done", cardIds: [] }
        ],
        cards: {},
        collaborator_ids: []
      });

      loadBoards();
      setAlert({ open: true, type: "success", title: "Success!", message: `Board "${title}" created!` });
    } catch (err) {
      console.error(err);
      setAlert({ open: true, type: "error", title: "Error", message: "Failed to create board" });
    }
  };

  const saveBoard = async (updates: Partial<Board>) => {
    if (!selectedBoard) return;
    await supabase.from('shared_boards').update(updates).eq('id', selectedBoard.id);
  };

  const handleDeleteBoard = async (board: Board) => {
    try {
      await supabase.from('board_invites').delete().eq('board_id', board.id);
      const { error } = await supabase.from('shared_boards').delete().eq('id', board.id);

      if (error && error.message.includes('permission')) {
        setAlert({ open: true, type: 'error', title: 'Access Denied', message: 'Only the owner can delete the board.' });
        return;
      }

      setBoards(prev => prev.filter(b => b.id !== board.id));
      if (selectedBoard?.id === board.id) setSelectedBoard(null);
      setAlert({ open: true, type: 'success', title: 'Deleted!', message: `"${board.title}" has been deleted.` });
    } catch (err) {
      console.error(err);
      setAlert({ open: true, type: 'error', title: 'Error', message: 'Failed to delete board' });
    }
  };

  // === Column Operations ===
  const addColumn = (title: string) => {
    if (!selectedBoard) return;
    const newCol = { id: `col-${Date.now()}`, title: title || 'New Column', cardIds: [] };
    const updated = { ...selectedBoard, columns: [...selectedBoard.columns, newCol] };
    setSelectedBoard(updated);
    saveBoard({ columns: updated.columns });
  };

  const renameColumn = (colId: string, newTitle: string) => {
    if (!selectedBoard) return;
    const updated = {
      ...selectedBoard,
      columns: selectedBoard.columns.map(c => c.id === colId ? { ...c, title: newTitle } : c)
    };
    setSelectedBoard(updated);
    saveBoard({ columns: updated.columns });
  };

  const deleteColumn = (colId: string) => {
    if (!selectedBoard) return;
    const updated = {
      ...selectedBoard,
      columns: selectedBoard.columns.filter(c => c.id !== colId),
      cards: Object.fromEntries(
        Object.entries(selectedBoard.cards).filter(([, card]) => card.columnId !== colId)
      ),
    };
    setSelectedBoard(updated);
    saveBoard({ columns: updated.columns, cards: updated.cards });
  };

  const onColumnDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('columnId');
    if (!draggedId || !selectedBoard) return;
    const cols = [...selectedBoard.columns];
    const fromIndex = cols.findIndex(c => c.id === draggedId);
    if (fromIndex === -1) return;
    const [moved] = cols.splice(fromIndex, 1);
    cols.splice(targetIndex, 0, moved);
    const updated = { ...selectedBoard, columns: cols };
    setSelectedBoard(updated);
    saveBoard({ columns: updated.columns });
  };

  // === Card Operations ===
  const addCard = (columnId: string) => {
    if (!selectedBoard) return;
    const id = `card-${Date.now()}`;
    setEditingCard({ id, title: '', description: '', columnId, attachments: [], dueDate: null });
  };

  const openCardForEdit = (cardId: string) => {
    if (!selectedBoard) return;
    const card = selectedBoard.cards[cardId];
    if (card) {
      setEditingCard({ ...card });
    }
  };

  const saveCard = () => {
    if (!selectedBoard || !editingCard) return;
    const isNew = !selectedBoard.cards[editingCard.id];
    const newCards = { ...selectedBoard.cards, [editingCard.id]: editingCard };
    const newColumns = selectedBoard.columns.map(c =>
      c.id === editingCard.columnId
        ? { ...c, cardIds: isNew ? [...c.cardIds, editingCard.id] : c.cardIds }
        : c
    );
    const updated = { ...selectedBoard, cards: newCards, columns: newColumns };
    setSelectedBoard(updated);
    saveBoard({ cards: updated.cards, columns: updated.columns });
    setEditingCard(null);
  };

  const deleteCard = (cardId: string) => {
    if (!selectedBoard) return;
    const column = selectedBoard.columns.find(c => c.cardIds.includes(cardId));
    const updated = {
      ...selectedBoard,
      columns: selectedBoard.columns.map(c =>
        c.id === column?.id ? { ...c, cardIds: c.cardIds.filter(id => id !== cardId) } : c
      ),
      cards: Object.fromEntries(Object.entries(selectedBoard.cards).filter(([k]) => k !== cardId)),
    };
    setSelectedBoard(updated);
    saveBoard({ columns: updated.columns, cards: updated.cards });
    setEditingCard(null);
  };

  const moveCard = (cardId: string, targetColumnId: string) => {
    if (!selectedBoard) return;
    const card = selectedBoard.cards[cardId];
    if (!card || card.columnId === targetColumnId) return;
    const updated = {
      ...selectedBoard,
      columns: selectedBoard.columns.map(col => ({
        ...col,
        cardIds: col.id === card.columnId
          ? col.cardIds.filter(id => id !== cardId)
          : col.id === targetColumnId
            ? [...col.cardIds, cardId]
            : col.cardIds
      })),
      cards: { ...selectedBoard.cards, [cardId]: { ...card, columnId: targetColumnId } }
    };
    setSelectedBoard(updated);
    saveBoard({ columns: updated.columns, cards: updated.cards });
  };

  // === Invite & Members ===
  const searchUsersByEmail = async (email: string) => {
    if (!email.includes('@')) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const { data } = await supabase.from('users').select('id, email, display_name, avatar_url').ilike('email', `%${email}%`).limit(5);
    setSearchResults(data || []);
    setIsSearching(false);
  };

  const inviteUser = async (userId: string) => {
    if (!selectedBoard || !currentUser) return;
    try {
      await supabase.from("board_invites").insert({
        board_id: selectedBoard.id,
        invited_user_id: userId,
        invited_by: currentUser.id,
        status: "pending"
      });
      await supabase.from("notifications").insert({
        user_id: userId,
        message: `${currentUser.email} invited you to "${selectedBoard.title}".`,
        read: false
      });
      setAlert({ open: true, type: "success", title: "Success!", message: "Invite sent!" });
      setInviteEmail("");
      setSearchResults([]);
    } catch (err) {
      console.error(err);
      setAlert({ open: true, type: "error", title: "Error", message: "Failed to send invite" });
    }
  };

  const acceptInvite = async (inviteId: string, boardId: string) => {
    if (!currentUser) return;
    try {
      await supabase.from("board_invites").update({ status: "accepted" }).eq("id", inviteId);
      await supabase.rpc("add_collaborator_to_board", { board_id: boardId, user_id: currentUser.id });
      loadBoards();
      setAlert({ open: true, type: "success", title: "Success!", message: "You joined the board!" });
    } catch (err) {
        console.error(err);
      setAlert({ open: true, type: "error", title: "Error", message: "Failed to accept invite" });
    }
  };

  // === File Upload ===
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingCard || !selectedBoard || !currentUser) return;

    const fileExt = file.name.split('.').pop() || '';
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const path = `${selectedBoard.id}/${editingCard.id}/${fileName}`;

    const { error } = await supabase.storage.from('board-attachments').upload(path, file);
    if (error) {
      setAlert({ open: true, type: 'error', title: 'Upload Failed', message: error.message });
      return;
    }

    const { data: urlData } = supabase.storage.from('board-attachments').getPublicUrl(path);
    const publicUrl = urlData?.publicUrl || '';

    const newAtt: Attachment = {
      name: file.name,
      url: publicUrl,
      uploadedBy: currentUser.email || 'You',
      uploadedAt: new Date().toISOString(),
    };

    const updatedCard = { ...editingCard, attachments: [...(editingCard.attachments || []), newAtt] };
    setEditingCard(updatedCard);
    setSelectedBoard(prev => prev ? { ...prev, cards: { ...prev.cards, [editingCard.id]: updatedCard } } : prev);
  };

  const deleteAttachment = (cardId: string, index: number) => {
    if (!selectedBoard) return;
    const card = selectedBoard.cards[cardId];
    if (!card) return;
    const updatedCard = { ...card, attachments: (card.attachments || []).filter((_, i) => i !== index) };
    const updatedBoard = { ...selectedBoard, cards: { ...selectedBoard.cards, [cardId]: updatedCard } };
    setSelectedBoard(updatedBoard);
    saveBoard({ cards: updatedBoard.cards });
    setEditingCard(prev => prev?.id === cardId ? updatedCard : prev);
  };

  // === Members Fetch ===
  useEffect(() => {
    if (!selectedBoard) return;
    const fetchMembers = async () => {
      const ids = Array.from(new Set([selectedBoard.owner_id, ...(selectedBoard.collaborator_ids || [])]));
      const { data } = await supabase.from('users').select('id, email, display_name, avatar_url').in('id', ids);
      if (data) setMembers(data);
    };
    fetchMembers();
  }, [selectedBoard]);

  return {
    // State
    boards,
    selectedBoard,
    setSelectedBoard,
    editingCard,
    setEditingCard,
    currentUser,
    pendingInvites,
    members,
    previewImage,
    setPreviewImage,
    inviteEmail,
    setInviteEmail,
    searchResults,
    isSearching,

    // UI State
    alert,
    setAlert,
    deleteModal,
    openDeleteModal,
    closeDeleteModal,
    fileInputRef,

    // Actions
    loadBoards,
    createBoard,
    saveBoard,
    handleDeleteBoard,
    addColumn,
    renameColumn,
    deleteColumn,
    onColumnDrop,
    addCard,
    openCardForEdit,
    saveCard,
    deleteCard,
    moveCard,
    searchUsersByEmail,
    inviteUser,
    acceptInvite,
    handleFileUpload,
    deleteAttachment,
  };
}