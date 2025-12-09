'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';
import {
  PlusIcon, XMarkIcon, PencilIcon, TrashIcon, PaperClipIcon,
  ArrowLeftIcon, UserCircleIcon, UserPlusIcon, ArrowDownTrayIcon,
  EllipsisHorizontalIcon, Bars3Icon, CheckIcon, BellIcon
} from '@heroicons/react/24/outline';

// === Types ===
interface Attachment { name: string; url: string; uploadedBy: string; uploadedAt: string; }
interface Card { id: string; title: string; description?: string; columnId: string; attachments?: Attachment[]; dueDate?: string | null; }
interface Column { id: string; title: string; cardIds: string[]; }
interface Board {
  id: string;
  title: string;
  background_color: string;
  columns: Column[];
  cards: Record<string, Card>;
  collaborator_ids: string[];
  owner_id: string;
}
interface UserProfile { id: string; email: string; display_name?: string; avatar_url?: string | null; }
interface PendingInvite { id: string; board_id: string; board_title: string; invited_by_name: string; invited_by_avatar?: string | null; }

// === Reusable Delete Modal ===
const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={onCancel}>
      <div className="bg-[#1a1a1e] rounded-3xl p-8 border border-white/20 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <p className="text-gray-300 mb-8">{message}</p>
        <div className="flex gap-4 justify-end">
          <button onClick={onCancel} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-medium transition">
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onCancel(); }}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-2xl font-bold transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default function CollaborationPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  // Modals
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [members, setMembers] = useState<UserProfile[]>([]);
  
    // New Board Modal State
  const [createBoardModalOpen, setCreateBoardModalOpen] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  // Feedback
  const [alert, setAlert] = useState<{ open: boolean; type: 'success' | 'error'; title: string; message: string }>({
    open: false, type: 'success', title: '', message: ''
  });

  // Delete Modal
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const openDeleteModal = (title: string, message: string, onConfirm: () => void) => {
    setDeleteModal({ isOpen: true, title, message, onConfirm });
  };

  const closeDeleteModal = () => setDeleteModal(prev => ({ ...prev, isOpen: false }));

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // === FIXED: loadBoards with correct filter ===
  const loadBoards = useCallback(async () => {
    if (!currentUser) return;

    console.log("loadBoards() called for user:", currentUser.id);

    const { data, error } = await supabase
      .from("shared_boards")
      .select("*")
      .or(`owner_id.eq.${currentUser.id},collaborator_ids.cs.{${currentUser.id}}`);

    console.log("Fetched boards:", data);
    console.log("Error:", error);

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

  // === FIXED: useEffect with correct dependencies ===
  useEffect(() => {
    if (!currentUser) return;

    loadBoards();

    const channel = supabase
      .channel(`boards_${currentUser.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_boards" }, () => loadBoards())
      .on("postgres_changes", { event: "*", schema: "public", table: "board_invites" }, () => loadBoards())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, loadBoards]);

   // === Create Board Function ===
  const createBoard = async () => {
    if (!currentUser || !newBoardTitle.trim()) return;

    const title = newBoardTitle.trim();

    try {
      await supabase.from('shared_boards').insert({
        title,
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

      setCreateBoardModalOpen(false);
      setNewBoardTitle('');
      loadBoards();

      setAlert({
        open: true,
        type: "success",
        title: "Success!",
        message: `Board "${title}" created!`
      });
    } catch (err) {
      console.error(err);
      setAlert({
        open: true,
        type: "error",
        title: "Error",
        message: "Failed to create board"
      });
    }
  };
  // === Board Operations ===
  const saveBoard = async (updates: Partial<Board>) => {
    if (!selectedBoard) return;
    await supabase.from('shared_boards').update(updates).eq('id', selectedBoard.id);
  };

  const handleDeleteBoard = (e: React.MouseEvent, board: Board) => {
    e.stopPropagation();
    openDeleteModal(
      `Delete "${board.title}"?`,
      'This board and all its data will be permanently deleted.',
      async () => {
        await supabase.from('board_invites').delete().eq('board_id', board.id);
        await supabase.from('shared_boards').delete().eq('id', board.id);
        setBoards(prev => prev.filter(b => b.id !== board.id));
        if (selectedBoard?.id === board.id) setSelectedBoard(null);
        setAlert({ open: true, type: 'success', title: 'Deleted!', message: 'Board deleted successfully' });
      }
    );
  };

  // === Column Operations ===
  const addColumn = () => {
    if (!selectedBoard) return;
    const title = newColumnTitle.trim() || 'New Column';
    const newCol = { id: `col-${Date.now()}`, title, cardIds: [] };
    const updated = { ...selectedBoard, columns: [...selectedBoard.columns, newCol] };
    setSelectedBoard(updated);
    saveBoard({ columns: updated.columns });
    setNewColumnTitle('');
    setColumnModalOpen(false);
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
    const column = selectedBoard.columns.find(c => c.id === colId);
    if (!column) return;

    openDeleteModal(
      `Delete "${column.title}"?`,
      'This column and all its cards will be permanently deleted.',
      () => {
        const updated = {
          ...selectedBoard,
          columns: selectedBoard.columns.filter(c => c.id !== colId),
          cards: Object.fromEntries(
            Object.entries(selectedBoard.cards).filter(([, card]) => card.columnId !== colId)
          ),
        };
        setSelectedBoard(updated);
        saveBoard({ columns: updated.columns, cards: updated.cards });
      }
    );
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
    setCardModalOpen(true);
  };

  const openCardForEdit = (cardId: string) => {
    if (!selectedBoard) return;
    const card = selectedBoard.cards[cardId];
    if (!card) return;
    setEditingCard({ ...card });
    setCardModalOpen(true);
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
    setCardModalOpen(false);
    setEditingCard(null);
  };

  const deleteCard = (cardId: string) => {
    if (!selectedBoard) return;
    const card = selectedBoard.cards[cardId];
    openDeleteModal(
      `Delete "${card?.title || 'Untitled Card'}"?`,
      'This card and all attachments will be permanently deleted.',
      () => {
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
        setCardModalOpen(false);
        setEditingCard(null);
      }
    );
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

  // === Invite & Accept ===
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
      const { error: inviteError } = await supabase
        .from("board_invites")
        .insert({
          board_id: selectedBoard.id,
          invited_user_id: userId,
          invited_by: currentUser.id,
          status: "pending"
        });

      if (inviteError) throw inviteError;

      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          message: `${currentUser.email} invited you to collaborate on "${selectedBoard.title}".`,
          read: false
        });

      if (notifError) throw notifError;

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
    // 1. Mark invite as accepted
    const { error: inviteError } = await supabase
      .from("board_invites")
      .update({ status: "accepted" })
      .eq("id", inviteId);

    if (inviteError) throw inviteError;

    // 2. Add user to collaborator_ids using PostgreSQL array_append via RPC
    // Create this function in Supabase SQL Editor first!
    const { error: rpcError } = await supabase.rpc("add_collaborator_to_board", {
      board_id: boardId,
      user_id: currentUser.id,
    });

    if (rpcError) {
      console.error("RPC Error:", rpcError);
      throw rpcError;
    }

    // 3. Notify the owner (optional - safe with maybeSingle)
    const { data: boardInfo } = await supabase
      .from("shared_boards")
      .select("owner_id, title")
      .eq("id", boardId)
      .maybeSingle(); // This returns null if not accessible (safe!)

    if (boardInfo && boardInfo.owner_id !== currentUser.id) {
      await supabase.from("notifications").insert({
        user_id: boardInfo.owner_id,
        message: `${currentUser.email} accepted your invite to "${boardInfo.title}".`,
        read: false,
      });
    }

    // 4. Refresh boards - new board will appear!
    loadBoards();

    setAlert({
      open: true,
      type: "success",
      title: "Success!",
      message: "You joined the board!",
    });
  } catch (err) {
    console.error("Accept invite failed:", err);
    setAlert({
      open: true,
      type: "error",
      title: "Error",
      message:(err as Error).message || "Failed to accept invite",
    });
  }
};

  // === Members Fetch ===
  useEffect(() => {
    if (!inviteModalOpen || !selectedBoard) return;

    const fetchMembers = async () => {
      const ids = Array.from(new Set([selectedBoard.owner_id, ...(selectedBoard.collaborator_ids || [])]));
      const { data } = await supabase.from('users').select('id, email, display_name, avatar_url').in('id', ids);
      if (data) setMembers(data);
    };

    fetchMembers();
  }, [inviteModalOpen, selectedBoard]);

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
    await saveBoard({ cards: selectedBoard.cards });
  };

  const deleteAttachment = (cardId: string, index: number) => {
    if (!selectedBoard) return;
    const card = selectedBoard.cards[cardId];
    if (!card) return;

    const newAttachments = (card.attachments || []).filter((_, i) => i !== index);
    const updatedCard = { ...card, attachments: newAttachments };
    const updatedBoard = { ...selectedBoard, cards: { ...selectedBoard.cards, [cardId]: updatedCard } };

    setSelectedBoard(updatedBoard);
    saveBoard({ cards: updatedBoard.cards });
    setEditingCard(prev => prev?.id === cardId ? updatedCard : prev);
  };

  const AttachmentItem = ({ attachment, cardId, index }: { attachment: Attachment; cardId?: string; index?: number }) => {
    const isImage = /\.(jpe?g|png|gif|webp)$/i.test(attachment.name);
    const [menuOpen, setMenuOpen] = useState(false);

    return (
      <div className="group flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
        <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/20">
          {isImage ? (
            <button onClick={() => setPreviewImage(attachment.url)} className="w-full h-full">
              <Image src={attachment.url} alt="" width={48} height={48} className="object-cover" unoptimized />
            </button>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <PaperClipIcon className="w-6 h-6 text-purple-400" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{attachment.name}</p>
          <p className="text-sm text-gray-400">
            {new Date(attachment.uploadedAt).toLocaleDateString()} • by {attachment.uploadedBy}
          </p>
        </div>

        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
          <button onClick={() => {
            const a = document.createElement('a');
            a.href = attachment.url;
            a.download = attachment.name;
            a.click();
          }}>
            <ArrowDownTrayIcon className="w-5 h-5" />
          </button>
          {cardId !== undefined && index !== undefined && (
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)}>
                <EllipsisHorizontalIcon className="w-5 h-5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-[#111116] border border-white/10 rounded-lg shadow-lg z-50">
                  <button
                    onClick={() => {
                      openDeleteModal(`Delete "${attachment.name}"?`, 'This file will be removed.', () => {
                        deleteAttachment(cardId, index); setMenuOpen(false);
                      });
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-red-600/20 text-red-400"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // === Render: Board List ===
  if (!selectedBoard) {
    return (
      <div className="fixed inset-0 bg-[#0d0d0f] text-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 backdrop-blur-xl bg-black/40">
          <button onClick={() => window.history.back()} className="p-3 hover:bg-white/10 rounded-xl">
            <ArrowLeftIcon className="w-7 h-7" />
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Collaborative Boards
          </h1>
          <div className="relative">
            {pendingInvites.length > 0 && (
              <>
                <BellIcon className="w-8 h-8 text-purple-400 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
              </>
            )}
          </div>
        </div>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="p-6 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-b border-white/10">
            <h2 className="text-xl font-bold mb-4">Pending Invites</h2>
            <div className="space-y-3">
              {pendingInvites.map(invite => (
                <div key={invite.id} className="bg-white/10 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                      {invite.invited_by_name[0]}
                    </div>
                    <div>
                      <p className="font-medium">{invite.invited_by_name} invited you</p>
                      <p className="text-purple-300 font-bold">{invite.board_title}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => acceptInvite(invite.id, invite.board_id)}
                    className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-bold hover:scale-105 transition"
                  >
                    Accept
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

          {/* Boards Grid */}
        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-5xl font-bold">Your Boards</h2>
              <button
                onClick={() => {
                  setNewBoardTitle('');
                  setCreateBoardModalOpen(true);
                }}
                className="bg-gradient-to-r from-pink-500 to-purple-600 px-8 py-5 rounded-3xl font-bold text-xl shadow-2xl hover:scale-105 transition flex items-center gap-4"
              >
                <PlusIcon className="w-8 h-8" /> New Board
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {boards.map(board => {
                const isOwner = currentUser?.id === board.owner_id;

                return (
                  <div key={board.id} className="relative group transition-all">
                    <div onClick={() => setSelectedBoard(board)} className="absolute inset-0 rounded-3xl z-10 cursor-pointer" />

                    {isOwner && (
                      <button
                        onClick={(e) => handleDeleteBoard(e, board)}
                        className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-all p-3 bg-red-600/20 hover:bg-red-600/40 backdrop-blur-md rounded-xl border border-red-500/50 hover:scale-110 shadow-lg"
                        title="Delete board"
                      >
                        <TrashIcon className="w-6 h-6 text-red-400" />
                      </button>
                    )}

                    <div className="relative bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-purple-500 hover:scale-105 shadow-2xl transition-all group-hover:shadow-purple-500/20">
                      <div className="w-full h-48 rounded-2xl mb-6 overflow-hidden" style={{ backgroundColor: board.background_color }} />
                      <h3 className="text-3xl font-bold">{board.title}</h3>
                      <p className="text-gray-400 mt-3 flex items-center gap-2">
                        <UserCircleIcon className="w-5 h-5" />
                        {board.collaborator_ids.length + 1} members
                      </p>
                      {isOwner && (
                        <span className="inline-block mt-4 px-4 py-1 text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 rounded-full">
                          Owner
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Create Board Modal */}
        {createBoardModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={() => setCreateBoardModalOpen(false)}>
            <div className="bg-[#1a1a1e] rounded-3xl p-8 border border-white/20 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                Create New Board
              </h2>
              
              <input
                type="text"
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newBoardTitle.trim()) {
                    createBoard();
                  }
                }}
                placeholder="Enter board name..."
                className="w-full px-6 py-4 bg-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/50 text-white placeholder-gray-500 text-xl"
                autoFocus
              />

              <div className="flex gap-4 mt-8 justify-end">
                <button
                  onClick={() => setCreateBoardModalOpen(false)}
                  className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={createBoard}
                  disabled={!newBoardTitle.trim()}
                  className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl font-bold transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                >
                  <PlusIcon className="w-6 h-6" />
                  Create Board
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          title={deleteModal.title}
          message={deleteModal.message}
          onConfirm={deleteModal.onConfirm}
          onCancel={closeDeleteModal}
        />

        {alert.open && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={() => setAlert({ ...alert, open: false })}>
            <div className={`rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in duration-300 ${alert.type === 'success' ? 'bg-gradient-to-br from-purple-600 to-pink-600' : 'bg-gradient-to-br from-red-600 to-orange-600'}`} onClick={e => e.stopPropagation()}>
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-white/20 rounded-full flex items-center justify-center">
                  {alert.type === 'success' ? <CheckIcon className="w-12 h-12 text-white" /> : <XMarkIcon className="w-12 h-12 text-white" />}
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">{alert.title}</h2>
                <p className="text-white/90 text-lg mb-8">{alert.message}</p>
                <button onClick={() => setAlert({ ...alert, open: false })} className="px-8 py-4 bg-white text-purple-600 rounded-2xl font-bold hover:scale-105 transition">
                  {alert.type === 'success' ? 'Awesome!' : 'Try Again'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // === Board View ===
  return (
    <div className="fixed inset-0 bg-[#0d0d0f] text-white flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-white/10 backdrop-blur-xl bg-black/40">
        <button onClick={() => setSelectedBoard(null)} className="p-3 hover:bg-white/10 rounded-xl">
          <ArrowLeftIcon className="w-7 h-7" />
        </button>
        <h1 className="text-4xl font-bold">{selectedBoard.title}</h1>
        <button onClick={() => setInviteModalOpen(true)} className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl font-bold hover:scale-105 transition flex items-center gap-3">
          <UserPlusIcon className="w-6 h-6" /> Invite
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex gap-6 pb-20 min-w-max">
          {selectedBoard.columns.map((column, colIndex) => (
            <div key={column.id} className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 w-80 flex-shrink-0 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <div
                    draggable
                    onDragStart={e => e.dataTransfer.setData('columnId', column.id)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => onColumnDrop(e, colIndex)}
                    className="p-2 rounded hover:bg-white/5 cursor-grab"
                  >
                    <Bars3Icon className="w-5 h-5 text-gray-500" />
                  </div>
                  {column.title}
                  <span className="ml-2 text-white/50">({column.cardIds.length})</span>
                </h3>
                <div className="flex gap-1">
                  <button onClick={() => setEditingColumnId(column.id)} className="p-1 hover:bg-white/10 rounded">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteColumn(column.id)} className="p-1 hover:bg-white/10 rounded">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 min-h-[20px]" onDragOver={e => e.preventDefault()} onDrop={e => {
                e.preventDefault();
                const cardId = e.dataTransfer.getData('cardId');
                if (cardId) moveCard(cardId, column.id);
              }}>
                {column.cardIds.map(cardId => {
                  const card = selectedBoard.cards[cardId];
                  if (!card) return null;
                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={e => e.dataTransfer.setData('cardId', card.id)}
                      onClick={() => openCardForEdit(card.id)}
                      className="bg-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/20 transition border border-white/20"
                    >
                      <h4 className="font-medium">{card.title || 'Untitled'}</h4>
                      {card.attachments?.length ? <div className="mt-2 text-xs text-purple-400 flex items-center gap-1"><PaperClipIcon className="w-3 h-3" /> {card.attachments.length}</div> : null}
                      {card.dueDate && <div className="mt-2 text-xs text-orange-300">Due: {new Date(card.dueDate).toLocaleDateString()}</div>}
                    </div>
                  );
                })}
              </div>

              <button onClick={() => addCard(column.id)} className="mt-4 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-gray-400 hover:text-white transition flex items-center justify-center gap-2">
                <PlusIcon className="w-5 h-5" /> Add a card
              </button>
            </div>
          ))}

          <button onClick={() => setColumnModalOpen(true)} className="w-80 flex-shrink-0 bg-white/5 hover:bg-white/10 rounded-3xl border-2 border-dashed border-white/20 flex items-center justify-center text-gray-400 hover:text-white transition">
            <PlusIcon className="w-8 h-8 mr-2" /> Add another column
          </button>
        </div>
      </div>

      {/* All Modals Below */}
      {cardModalOpen && editingCard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-8" onClick={() => { setCardModalOpen(false); setEditingCard(null); }}>
          <div onClick={e => e.stopPropagation()} className="bg-[#1a1a1e] rounded-3xl max-w-4xl w-full max-h-screen overflow-y-auto border border-white/20 shadow-2xl">
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <input
                  value={editingCard.title}
                  onChange={e => setEditingCard(prev => prev ? { ...prev, title: e.target.value } : prev)}
                  className="text-4xl font-bold bg-transparent outline-none border-b-2 border-transparent hover:border-purple-500 focus:border-purple-500 transition pb-2 w-full"
                  placeholder="Card title..."
                  autoFocus
                />
                <button onClick={() => { setCardModalOpen(false); setEditingCard(null); }}>
                  <XMarkIcon className="w-8 h-8" />
                </button>
              </div>

              <textarea
                value={editingCard.description || ''}
                onChange={e => setEditingCard(prev => prev ? { ...prev, description: e.target.value } : prev)}
                placeholder="Add description..."
                className="w-full bg-white/10 rounded-2xl p-6 text-white placeholder-gray-500 resize-none focus:ring-4 focus:ring-purple-500/50 outline-none"
                rows={6}
              />

              <div className="mt-4 flex gap-4 items-center">
                <label className="text-sm">Due date:</label>
                <input
                  type="date"
                  value={editingCard.dueDate ? editingCard.dueDate.split('T')[0] : ''}
                  onChange={e => setEditingCard(prev => prev ? { ...prev, dueDate: e.target.value ? new Date(e.target.value).toISOString() : null } : prev)}
                  className="px-4 py-2 rounded-2xl bg-white/5 outline-none"
                />
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold flex items-center gap-3"><PaperClipIcon className="w-7 h-7 text-pink-400" /> Attachments</h3>
                  <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" /> Add
                  </button>
                </div>
                <div className="space-y-3">
                  {(editingCard.attachments || []).map((att, i) => (
                    <AttachmentItem key={i} attachment={att} cardId={editingCard.id} index={i} />
                  ))}
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button onClick={saveCard} className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl font-bold hover:scale-105 transition flex items-center gap-3">
                  <CheckIcon className="w-6 h-6" /> Save Card
                </button>
                <button onClick={() => { setCardModalOpen(false); setEditingCard(null); }} className="px-8 py-4 bg-white/10 rounded-2xl">Cancel</button>
                {selectedBoard.cards[editingCard.id] && (
                  <button onClick={() => deleteCard(editingCard.id)} className="px-8 py-4 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-2xl font-bold transition">
                    Delete Card
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999]">
          <button onClick={() => setPreviewImage(null)} className="absolute top-6 left-6 bg-white/10 hover:bg-white/20 p-3 rounded-xl">
            <ArrowLeftIcon className="w-8 h-8 text-white" />
          </button>
          <div className="max-w-5xl max-h-[85vh]">
            <Image src={previewImage} alt="Preview" width={1200} height={800} className="object-contain rounded-2xl" unoptimized />
          </div>
        </div>
      )}

      {columnModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setColumnModalOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-[#1a1a1e] rounded-3xl p-8 border border-white/20">
            <input
              value={newColumnTitle}
              onChange={e => setNewColumnTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addColumn()}
              placeholder="Column title..."
              className="w-96 px-6 py-4 bg-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-purple-500"
              autoFocus
            />
            <div className="flex gap-4 mt-6">
              <button onClick={addColumn} className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl font-bold">Create Column</button>
              <button onClick={() => setColumnModalOpen(false)} className="px-8 py-4 bg-white/10 rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editingColumnId && selectedBoard && (
        <input
          defaultValue={selectedBoard.columns.find(c => c.id === editingColumnId)?.title || ''}
          onBlur={e => { renameColumn(editingColumnId, e.target.value.trim() || 'Untitled'); setEditingColumnId(null); }}
          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
          className="fixed left-1/2 top-20 -translate-x-1/2 bg-white/10 rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-purple-500 text-xl font-bold"
          autoFocus
        />
      )}

      {inviteModalOpen && selectedBoard && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={() => setInviteModalOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-[#1a1a1e] rounded-2xl border border-white/20 w-full max-w-lg mx-4 shadow-2xl">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold">Invite to Board</h2>
              <p className="text-gray-400 mt-1">They will receive a push notification</p>
            </div>

            <div className="p-6">
              <div className="relative">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); searchUsersByEmail(e.target.value); }}
                  placeholder="Enter email address..."
                  className="w-full px-5 py-4 bg-white/10 rounded-xl outline-none focus:ring-4 focus:ring-purple-500/50 text-white placeholder-gray-500"
                  autoFocus
                />
                {inviteEmail && (
                  <div className="absolute top-full mt-2 w-full bg-[#111116] border border-white/20 rounded-xl shadow-2xl z-10">
                    {isSearching ? (
                      <div className="p-4 text-center text-gray-400">Searching...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-4 text-center text-gray-400">No users found</div>
                    ) : (
                      searchResults.map(user => {
                        const isAdded = selectedBoard.collaborator_ids.includes(user.id) || user.id === selectedBoard.owner_id;
                        return (
                          <button
                            key={user.id}
                            onClick={() => !isAdded && inviteUser(user.id)}
                            disabled={isAdded}
                            className={`w-full px-4 py-3 flex items-center gap-4 hover:bg-white/10 transition ${isAdded ? 'opacity-50' : ''}`}
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                              {(user.display_name || user.email)[0].toUpperCase()}
                            </div>
                            <div className="text-left flex-1">
                              <p className="font-medium">{user.display_name || user.email.split('@')[0]}</p>
                              <p className="text-sm text-gray-400">{user.email}</p>
                            </div>
                            {isAdded ? <span className="text-green-400 text-sm">Added</span> : <PlusIcon className="w-5 h-5 text-purple-400" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Members ({selectedBoard.collaborator_ids.length + 1})</h3>
                <div className="space-y-3">
                  {members.map(user => {
                    const isOwner = user.id === selectedBoard.owner_id;
                    const isYou = user.id === currentUser?.id;
                    const canRemove = currentUser?.id === selectedBoard.owner_id && !isOwner && !isYou;
                    const canLeave = !isOwner && isYou;

                    const handleRemoveOrLeave = async () => {
                      const newCollabs = selectedBoard.collaborator_ids.filter(id => id !== user.id);
                      await supabase.from('shared_boards').update({ collaborator_ids: newCollabs }).eq('id', selectedBoard.id);
                      setSelectedBoard(prev => prev ? { ...prev, collaborator_ids: newCollabs } : prev);
                      setMembers(prev => prev.filter(m => m.id !== user.id));
                      if (isYou) { setInviteModalOpen(false); setSelectedBoard(null); }
                    };

                    return (
                      <div key={user.id} className="flex items-center gap-4 px-4 py-3 bg-white/5 rounded-xl group">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                          {(user.display_name || user.email)[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">
                            {isYou ? 'You' : user.display_name || user.email.split('@')[0]}
                            {isOwner && ' (Owner)'}
                          </p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                        {(canRemove || canLeave) && (
                          <button
                            onClick={() => openDeleteModal(
                              canLeave ? 'Leave board?' : `Remove ${user.display_name || user.email.split('@')[0]}?`,
                              canLeave ? "You'll lose access unless invited again." : 'They will lose access to this board.',
                              handleRemoveOrLeave
                            )}
                            className={`p-2 rounded-lg transition ${canRemove ? 'opacity-0 group-hover:opacity-100 hover:bg-red-600/30 text-red-400' : 'text-orange-400 hover:bg-orange-600/20'}`}
                          >
                            {canRemove ? <XMarkIcon className="w-5 h-5" /> : <span className="text-xs font-bold">Leave</span>}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end">
              <button onClick={() => { setInviteModalOpen(false); setInviteEmail(''); setSearchResults([]); }} className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        message={deleteModal.message}
        onConfirm={deleteModal.onConfirm}
        onCancel={closeDeleteModal}
      />

      {alert.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={() => setAlert({ ...alert, open: false })}>
          <div className={`rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in duration-300 ${alert.type === 'success' ? 'bg-gradient-to-br from-purple-600 to-pink-600' : 'bg-gradient-to-br from-red-600 to-orange-600'}`} onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-white/20 rounded-full flex items-center justify-center">
                {alert.type === 'success' ? <CheckIcon className="w-12 h-12 text-white" /> : <XMarkIcon className="w-12 h-12 text-white" />}
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">{alert.title}</h2>
              <p className="text-white/90 text-lg mb-8">{alert.message}</p>
              <button onClick={() => setAlert({ ...alert, open: false })} className="px-8 py-4 bg-white text-purple-600 rounded-2xl font-bold hover:scale-105 transition">
                {alert.type === 'success' ? 'Awesome!' : 'Try Again'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}