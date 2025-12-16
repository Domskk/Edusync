'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  ArrowLeftIcon,
  UserPlusIcon,
  PlusIcon,
  Bars3Icon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

        import { AlertState, Board, Card, UserProfile } from '@/types/collaboration';

import CardItem from './CardItem';
import InviteModal from './InviteModal';
import CardModal from './CardModal';
import ColumnModal from './ColumnModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import AlertToast from './AlertToast';

interface BoardViewProps {
  board: Board;
  onBack: () => void;
  addColumn: (title: string) => void;
  renameColumn: (colId: string, newTitle: string) => void;
  deleteColumn: (colId: string) => void;
  onColumnDrop: (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => void;
  addCard: (columnId: string) => void;
  openCardForEdit: (cardId: string) => void;
  moveCard: (cardId: string, targetColumnId: string) => void;
  editingCard: Card | null;
  setEditingCard: (card: Card | null) => void;
  members: UserProfile[];
  inviteEmail: string;
  setInviteEmail: (email: string) => void;
  searchResults: UserProfile[];
  isSearching: boolean;
  searchUsersByEmail: (email: string) => Promise<void>;
  inviteUser: (userId: string) => Promise<void>;
  fileInputRef: React.RefObject<HTMLInputElement> ;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  previewImage: string | null;
  setPreviewImage: (url: string | null) => void;
  saveCard: () => void;
  deleteCard: (cardId: string) => void;
  deleteAttachment: (cardId: string, index: number) => void;
  alert: AlertState;
  setAlert: (alert: AlertState) => void;
  deleteModal: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  };
  openDeleteModal: (title: string, message: string, onConfirm: () => void) => void;
  closeDeleteModal: () => void;
  currentUserId?: string;
}

export default function BoardView(props: BoardViewProps) {
  const {
    board,
    onBack,
    addColumn,
    renameColumn,
    deleteColumn,
    onColumnDrop,
    addCard,
    openCardForEdit,
    moveCard,
    editingCard,
    setEditingCard,
    members,
    inviteEmail,
    setInviteEmail,
    searchResults,
    isSearching,
    searchUsersByEmail,
    inviteUser,
    fileInputRef,
    handleFileUpload,
    previewImage,
    setPreviewImage,
    saveCard,
    deleteCard,
    deleteAttachment,
    alert,
    setAlert,
    deleteModal,
    openDeleteModal,
    closeDeleteModal,
    currentUserId,
  } = props;

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 bg-[#0d0d0f] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10 backdrop-blur-xl bg-black/40">
        <button onClick={onBack} className="p-3 hover:bg-white/10 rounded-xl transition">
          <ArrowLeftIcon className="w-7 h-7" />
        </button>
        <h1 className="text-4xl font-bold">{board.title}</h1>
        <button
          onClick={() => setInviteModalOpen(true)}
          className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl font-bold hover:scale-105 transition flex items-center gap-3"
        >
          <UserPlusIcon className="w-6 h-6" /> Invite
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-8 ">
        <div className="flex gap-6 pb-20 min-w-max">
          {board.columns.map((column, colIndex) => (
            <div
              key={column.id}
              className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 w-80 flex-shrink-0 border border-white/10"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <div
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('columnId', column.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onColumnDrop(e, colIndex)}
                    className="p-2 rounded hover:bg-white/5 cursor-grab active:cursor-grabbing"
                  >
                    <Bars3Icon className="w-5 h-5 text-gray-500" />
                  </div>

                  {editingColumnId === column.id ? (
                    <input
                      defaultValue={column.title}
                      onBlur={(e) => {
                        renameColumn(column.id, e.target.value.trim() || 'Untitled');
                        setEditingColumnId(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur())}
                      className="bg-white/10 rounded px-3 py-1 outline-none focus:ring-2 focus:ring-purple-500"
                      autoFocus
                    />
                  ) : (
                    <>
                      {column.title}
                      <span className="ml-2 text-white/50">({column.cardIds.length})</span>
                    </>
                  )}
                </h3>

                <div className="flex gap-1 opacity-70">
                  <button
                    onClick={() => setEditingColumnId(column.id)}
                    className="p-1 hover:bg-white/10 rounded transition"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      openDeleteModal(
                        `Delete "${column.title}"?`,
                        'This will permanently delete the column and all its cards.',
                        () => deleteColumn(column.id)
                      )
                    }
                    className="p-1 hover:bg-red-600/20 rounded transition"
                  >
                    <TrashIcon className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>

              {/* Cards */}
              <div
                className="space-y-3 min-h-[20px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const cardId = e.dataTransfer.getData('cardId');
                  if (cardId && cardId !== '') {
                    moveCard(cardId, column.id);
                  }
                }}
              >
                {column.cardIds.map((cardId) => {
                  const card = board.cards[cardId];
                  if (!card) return null;

                  return (
                    <CardItem
                      key={cardId}
                      card={card}
                      onClick={() => openCardForEdit(cardId)}
                      onDragStart={(e) => e.dataTransfer.setData('cardId', cardId)}
                    />
                  );
                })}
              </div>

              {/* Add Card Button */}
              <button
                onClick={() => addCard(column.id)}
                className="mt-4 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-gray-400 hover:text-white transition flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-5 h-5" /> Add a card
              </button>
            </div>
          ))}

          {/* Add Column Button */}
          <button
            onClick={() => setColumnModalOpen(true)}
            className="w-80 flex-shrink-0 bg-white/5 hover:bg-white/10 rounded-3xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-gray-400 hover:text-white transition py-10 gap-3"
          >
            <PlusIcon className="w-10 h-10" />
            <span className="text-lg font-medium">Add another column</span>
          </button>
        </div>
      </div>

      {/* All Modals */}
      <InviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        board={board}
        members={members}
        currentUserId={currentUserId || ''}
        inviteEmail={inviteEmail}
        setInviteEmail={setInviteEmail}
        searchResults={searchResults}
        isSearching={isSearching}
        searchUsersByEmail={searchUsersByEmail}
        inviteUser={inviteUser}
        openDeleteModal={openDeleteModal}
      />

      <CardModal
        isOpen={!!editingCard}
        card={editingCard}
        setCard={setEditingCard}
        onClose={() => setEditingCard(null)}
        onSave={saveCard}
        onDelete={() => editingCard && deleteCard(editingCard.id)}
        fileInputRef={fileInputRef}
        handleFileUpload={handleFileUpload}
        previewImage={previewImage}
        setPreviewImage={setPreviewImage}
        deleteAttachment={deleteAttachment}
        openDeleteModal={openDeleteModal}
      />

      <ColumnModal
        isOpen={columnModalOpen}
        onClose={() => {
          setColumnModalOpen(false);
          setNewColumnTitle('');
        }}
        newTitle={newColumnTitle}
        setNewTitle={setNewColumnTitle}
        onCreate={() => {
          if (newColumnTitle.trim()) {
            addColumn(newColumnTitle.trim());
            setColumnModalOpen(false);
            setNewColumnTitle('');
          }
        }}
      />

      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999]"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-8 left-8 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition"
          >
            <ArrowLeftIcon className="w-8 h-8" />
          </button>
          <Image
            src={previewImage}
            alt="Attachment preview"
            width={1200}
            height={800}
            className="max-w-full max-h-full object-contain rounded-2xl"
            unoptimized
          />
        </div>
      )}

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        message={deleteModal.message}
        onConfirm={deleteModal.onConfirm}
        onCancel={closeDeleteModal}
      />

      <AlertToast
        alert={alert}
        onClose={() => setAlert({ ...alert, open: false })}
      />
    </div>
  );
}