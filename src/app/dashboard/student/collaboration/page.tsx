'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';
import {
  PlusIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  PaperClipIcon,
  ArrowLeftIcon,
  UserCircleIcon,
  UserPlusIcon,
  ArrowDownTrayIcon,
  EllipsisHorizontalIcon,
  Bars3Icon,
  CheckIcon
} from '@heroicons/react/24/outline';

// --- Types ---
interface Attachment {
  name: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface Card {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  attachments?: Attachment[];
  dueDate?: string | null;
}

interface Column {
  id: string;
  title: string;
  cardIds: string[];
}

interface Board {
  id: string;
  title: string;
  background_color: string;
  columns: Column[];
  cards: Record<string, Card>;
  collaborator_ids: string[];
  owner_id: string;
}

// --- Delete Modal Types (fully typed) ---
type DeleteType = 'card' | 'column' | 'attachment';

interface DeletePayload {
  card?: string;
  column?: string;
  attachment?: { cardId: string; index: number };
}

export default function CollaborationPage() {
  // State
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);

  // Modals
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    type: DeleteType | null;
    payload: DeletePayload | null;
    title?: string;
    message?: string;
  }>({
    open: false,
    type: null,
    payload: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Auth ---
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user as { id: string; email?: string } | null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => sub?.subscription.unsubscribe?.();
  }, []);

  // --- Load boards ---
  const loadBoards = useCallback(async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('shared_boards')
      .select('*')
      .or(`owner_id.eq.${currentUser.id},collaborator_ids.cs.{${currentUser.id}}`);

    const fixed: Board[] = (data ?? []).map((b: Board) => ({
      id: b.id,
      title: b.title || 'My Board',
      background_color: b.background_color || '#7c3aed',
      owner_id: b.owner_id,
      collaborator_ids: b.collaborator_ids || [],
      columns: Array.isArray(b.columns) ? b.columns : [
        { id: 'col1', title: 'To Do', cardIds: [] },
        { id: 'col2', title: 'In Progress', cardIds: [] },
        { id: 'col3', title: 'Done', cardIds: [] }
      ],
      cards: typeof b.cards === 'object' && b.cards !== null ? b.cards : {}
    }));
    setBoards(fixed);
  }, [currentUser]);

  const loadSingleBoard = useCallback(async () => {
    if (!selectedBoard) return;
    const { data } = await supabase.from('shared_boards').select('*').eq('id', selectedBoard.id).single();
    if (data) {
      setSelectedBoard({
        ...data,
        columns: Array.isArray(data.columns) ? data.columns : selectedBoard.columns,
        cards: typeof data.cards === 'object' && data.cards !== null ? data.cards : selectedBoard.cards
      });
    }
  }, [selectedBoard]);

  // Real-time subscription
  useEffect(() => {
    loadBoards();
    const channel = supabase
      .channel('boards')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_boards' }, () => {
        loadBoards();
        if (selectedBoard) loadSingleBoard();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadBoards, loadSingleBoard, selectedBoard]);

  // --- Helpers ---
  const saveBoard = async (updates: Partial<Board>) => {
    if (!selectedBoard) return;
    await supabase.from('shared_boards').update(updates).eq('id', selectedBoard.id);
    await loadSingleBoard();
  };

  // --- Delete Modal Helpers ---
  const openDeleteModal = (
    type: DeleteType,
    payload: DeletePayload,
    title?: string,
    message?: string
  ) => {
    setDeleteModal({ open: true, type, payload, title, message });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ open: false, type: null, payload: null });
  };

  // --- Column operations ---
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
    const updated = {
      ...selectedBoard,
      columns: selectedBoard.columns.filter(c => c.id !== colId),
      cards: Object.fromEntries(
        Object.entries(selectedBoard.cards).filter(([, card]) => card.columnId !== colId)
      )
    };
    setSelectedBoard(updated);
    saveBoard({ columns: updated.columns, cards: updated.cards });
    closeDeleteModal();
  };

  const onColumnDragStart = (e: React.DragEvent, colId: string) => {
    e.dataTransfer.setData('columnId', colId);
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

  // --- Card operations ---
  const addCard = (columnId: string) => {
    if (!selectedBoard) return;
    const id = `card-${Date.now()}`;
    const newCard: Card = { id, title: '', description: '', columnId, attachments: [], dueDate: null };
    setEditingCard(newCard);
    setCardModalOpen(true);
  };

  const openCardForEdit = (cardId: string) => {
    if (!selectedBoard) return;
    const c = selectedBoard.cards[cardId];
    if (!c) return;
    setEditingCard({ ...c });
    setCardModalOpen(true);
  };

  const saveCard = () => {
    if (!selectedBoard || !editingCard) return;
    const id = editingCard.id;
    const isNew = !selectedBoard.cards[id];
    const newCards = { ...selectedBoard.cards, [id]: { ...editingCard } };
    const newColumns = selectedBoard.columns.map(c => c.id === editingCard.columnId ?
      { ...c, cardIds: isNew ? [...c.cardIds, id] : c.cardIds } : c
    );
    const updated = { ...selectedBoard, cards: newCards, columns: newColumns };
    setSelectedBoard(updated);
    saveBoard({ cards: updated.cards, columns: updated.columns });
    setCardModalOpen(false);
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
      cards: Object.fromEntries(Object.entries(selectedBoard.cards).filter(([k]) => k !== cardId))
    };
    setSelectedBoard(updated);
    saveBoard({ columns: updated.columns, cards: updated.cards });
    setCardModalOpen(false);
    setEditingCard(null);
    closeDeleteModal();
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

  const onCardDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('cardId', cardId);
    e.stopPropagation();
  };

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingCard || !selectedBoard || !currentUser) return;
    const cardId = editingCard.id;
    const fileExt = file.name.split('.').pop() || '';
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const path = `${selectedBoard.id}/${cardId}/${fileName}`;
    const { error } = await supabase.storage.from('board-attachments').upload(path, file);
    if (error) return alert('Upload failed: ' + error.message);

    const { data: publicData } = supabase.storage.from('board-attachments').getPublicUrl(path);
    const publicUrl = publicData?.publicUrl || '';
    const newAtt: Attachment = {
      name: file.name,
      url: publicUrl,
      uploadedBy: currentUser.email || 'You',
      uploadedAt: new Date().toISOString()
    };

    setEditingCard(prev => prev ? { ...prev, attachments: [...(prev.attachments || []), newAtt] } : prev);

    const updatedCard = { ...(selectedBoard.cards[cardId] || {}), attachments: [...((selectedBoard.cards[cardId]?.attachments) || []), newAtt] } as Card;
    const updatedBoard = { ...selectedBoard, cards: { ...selectedBoard.cards, [cardId]: updatedCard } };
    setSelectedBoard(updatedBoard);
    await saveBoard({ cards: updatedBoard.cards });
  };

  const deleteAttachment = async (cardId: string, index: number) => {
    if (!selectedBoard) return;
    const card = selectedBoard.cards[cardId];
    if (!card) return;
    const newAttachments = (card.attachments || []).filter((_, i) => i !== index);
    const updatedCard = { ...card, attachments: newAttachments };
    const updatedBoard = { ...selectedBoard, cards: { ...selectedBoard.cards, [cardId]: updatedCard } };
    setSelectedBoard(updatedBoard);
    await saveBoard({ cards: updatedBoard.cards });
    setEditingCard(prev => prev && prev.id === cardId ? { ...prev, attachments: newAttachments } : prev);
    closeDeleteModal();
  };

  // Attachment Item
  const AttachmentItem = ({
    attachment,
    cardId,
    index
  }: {
    attachment: Attachment;
    cardId?: string;
    index?: number;
  }) => {
    const isImage = /\.(jpe?g|png|gif|webp)$/i.test(attachment.name);
    const isPDF = attachment.name.toLowerCase().endsWith('.pdf');
    const [menuOpen, setMenuOpen] = useState(false);

    const downloadFile = async (url: string, name: string) => {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    };

    return (
      <div className="group flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all hover:border-purple-500/50">
        <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/20 flex-shrink-0">
          {isImage ? (
            <button onClick={() => setPreviewImage(attachment.url)} className="w-full h-full">
              <Image src={attachment.url} alt={attachment.name} width={48} height={48} className="w-full h-full object-cover" unoptimized />
            </button>
          ) : isPDF ? (
            <div className="w-full h-full bg-red-500/20 flex items-center justify-center">
              <span className="text-xs font-bold text-red-400">PDF</span>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <PaperClipIcon className="w-6 h-6 text-purple-400" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{attachment.name}</p>
          <p className="text-sm text-gray-400">
            Added {new Date(attachment.uploadedAt).toLocaleString()} • by {attachment.uploadedBy}
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => downloadFile(attachment.url, attachment.name)} className="p-2 hover:bg-white/10 rounded" title="Download">
            <ArrowDownTrayIcon className="w-5 h-5" />
          </button>

          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)} className="p-2 hover:bg-white/10 rounded">
              <EllipsisHorizontalIcon className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-[#111116] border border-white/10 rounded-lg shadow-lg z-50">
                <button
                  onClick={() => {
                    if (cardId != null && index != null) {
                      openDeleteModal(
                        'attachment',
                        { attachment: { cardId, index } },
                        `Delete "${attachment.name}"?`,
                        'This file will be removed from the card.'
                      );
                    }
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-red-600/20 text-red-400"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Reset modals when board changes
  useEffect(() => {
    setCardModalOpen(false);
    setEditingCard(null);
  }, [selectedBoard?.id]);

  // --- Delete Confirmation Modal Component ---
  const DeleteConfirmModal = ({
    isOpen,
    title = "Delete this item?",
    message = "This action cannot be undone.",
    onConfirm,
    onCancel,
  }: {
    isOpen: boolean;
    title?: string;
    message?: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={onCancel}>
        <div className="bg-[#1a1a1e] rounded-3xl p-8 border border-white/20 max-w-md w-full" onClick={e => e.stopPropagation()}>
          <h2 className="text-2xl font-bold mb-4">{title}</h2>
          <p className="text-gray-300 mb-8">{message}</p>
          <div className="flex gap-4 justify-end">
            <button onClick={onCancel} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-medium transition">
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-2xl font-bold transition"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- UI ---
  if (!selectedBoard) {
    return (
      <div className="fixed inset-0 bg-[#0d0d0f] text-white flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/10 backdrop-blur-xl bg-black/40">
          <button onClick={() => window.history.back()} className="p-3 hover:bg-white/10 rounded-xl"><ArrowLeftIcon className="w-7 h-7" /></button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">Collaborative Boards</h1>
          <div className="w-14" />
        </div>
        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-5xl font-bold">Your Boards</h2>
              <button onClick={async () => {
                if (!currentUser) return;
                const title = prompt('Board name:') || 'New Board';
                await supabase.from('shared_boards').insert({
                  title,
                  owner_id: currentUser.id,
                  background_color: '#7c3aed',
                  columns: [],
                  cards: {},
                  collaborator_ids: []
                });
                loadBoards();
              }} className="bg-gradient-to-r from-pink-500 to-purple-600 px-8 py-5 rounded-3xl font-bold text-xl shadow-2xl hover:scale-105 transition flex items-center gap-4">
                <PlusIcon className="w-8 h-8" /> New Board
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {boards.map(b => (
                <div key={b.id} onClick={() => setSelectedBoard(b)} className="cursor-pointer group">
                  <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-purple-500 transition-all hover:scale-105 shadow-2xl">
                    <div className="w-full h-48 rounded-2xl mb-6" style={{ backgroundColor: b.background_color }} />
                    <h3 className="text-3xl font-bold">{b.title}</h3>
                    <p className="text-gray-400 mt-3 flex items-center gap-2"><UserCircleIcon className="w-5 h-5" /> {b.collaborator_ids.length + 1} members</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0d0d0f] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10 backdrop-blur-xl bg-black/40">
        <button onClick={() => setSelectedBoard(null)} className="p-3 hover:bg-white/10 rounded-xl"><ArrowLeftIcon className="w-7 h-7" /></button>
        <h1 className="text-4xl font-bold">{selectedBoard.title}</h1>
        <button className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl font-bold hover:scale-105 transition flex items-center gap-3">
          <UserPlusIcon className="w-6 h-6" /> Invite
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex gap-6 pb-20 min-w-max">
          {selectedBoard.columns.map((column, colIndex) => (
            <div key={column.id} className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 w-80 flex-shrink-0 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <div
                    draggable
                    onDragStart={e => onColumnDragStart(e, column.id)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => onColumnDrop(e, colIndex)}
                    className="p-2 rounded hover:bg-white/5 cursor-grab"
                    title="Drag column"
                  >
                    <Bars3Icon className="w-5 h-5 text-gray-500" />
                  </div>
                  {column.title}
                  <span className="ml-2 text-white/50">({column.cardIds.length})</span>
                </h3>
                <div className="flex gap-1">
                  <button onClick={() => setEditingColumnId(column.id)} className="p-1 hover:bg-white/10 rounded"><PencilIcon className="w-4 h-4" /></button>
                  <button
                    onClick={() => openDeleteModal(
                      'column',
                      { column: column.id },
                      `Delete "${column.title}"?`,
                      'This column and all its cards will be permanently deleted.'
                    )}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 min-h-[20px]" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const cardId = e.dataTransfer.getData('cardId'); if (cardId) moveCard(cardId, column.id); }}>
                {column.cardIds.map(cardId => {
                  const card = selectedBoard.cards[cardId];
                  if (!card) return null;
                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={e => onCardDragStart(e, card.id)}
                      onClick={() => openCardForEdit(card.id)}
                      className="bg-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/20 transition border border-white/20"
                    >
                      <h4 className="font-medium">{card.title || 'Untitled'}</h4>
                      {card.attachments?.length ? <div className="mt-2 text-xs text-purple-400 flex items-center gap-1"><PaperClipIcon className="w-3 h-3" /> {card.attachments.length}</div> : null}
                      {card.dueDate ? <div className="mt-2 text-xs text-orange-300">Due: {new Date(card.dueDate).toLocaleDateString()}</div> : null}
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

      {/* Card Modal */}
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
                value={editingCard.description}
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
                  <button
                    onClick={() => openDeleteModal(
                      'card',
                      { card: editingCard.id },
                      'Delete this card?',
                      'All attachments and data will be permanently removed.'
                    )}
                    className="px-8 py-4 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-2xl font-bold transition"
                  >
                    Delete Card
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
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

      {/* Add Column Modal */}
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

      {/* Inline Column Rename */}
      {editingColumnId && selectedBoard && (
        <input
          defaultValue={selectedBoard.columns.find(c => c.id === editingColumnId)?.title || ''}
          onBlur={e => { renameColumn(editingColumnId, e.target.value.trim() || 'Untitled'); setEditingColumnId(null); }}
          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
          className="fixed left-1/2 top-20 transform -translate-x-1/2 bg-white/10 rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-purple-500 text-xl font-bold"
          autoFocus
          onClick={e => e.stopPropagation()}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.open}
        title={deleteModal.title || 'Delete?'}
        message={deleteModal.message || 'This action cannot be undone.'}
        onCancel={closeDeleteModal}
        onConfirm={() => {
          if (!selectedBoard || !deleteModal.payload) return;

          if (deleteModal.type === 'card' && deleteModal.payload.card) {
            deleteCard(deleteModal.payload.card);
          } else if (deleteModal.type === 'column' && deleteModal.payload.column) {
            deleteColumn(deleteModal.payload.column);
          } else if (deleteModal.type === 'attachment' && deleteModal.payload.attachment) {
            const { cardId, index } = deleteModal.payload.attachment;
            deleteAttachment(cardId, index);
          }
        }}
      />
    </div>
  );
}