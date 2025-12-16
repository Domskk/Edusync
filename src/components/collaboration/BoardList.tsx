'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  UserCircleIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

import { Board, PendingInvite, AlertState } from '@/types/collaboration';

import DeleteConfirmModal from './DeleteConfirmModal';
import AlertToast from './AlertToast';
import CreateBoardModal from './CreateBoardModal';

interface BoardListProps {
  boards: Board[];
  pendingInvites: PendingInvite[];
  currentUser: { id: string; email?: string } | null;

  onSelectBoard: (board: Board) => void;
  handleDeleteBoard: (board: Board) => Promise<void>;
  createBoard: (title: string) => Promise<void>;
  acceptInvite: (inviteId: string, boardId: string) => Promise<void>;

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
}

export default function BoardList({
  boards,
  pendingInvites,
  currentUser,
  onSelectBoard,
  handleDeleteBoard,
  createBoard,
  acceptInvite,
  alert,
  setAlert,
  deleteModal,
  openDeleteModal,
  closeDeleteModal,
}: BoardListProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createBoard(newTitle.trim());
    setCreateModalOpen(false);
    setNewTitle('');
  };

  return (
    <div className="fixed inset-0 bg-[#0d0d0f] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10 backdrop-blur-xl bg-black/40">
        <button onClick={() => window.history.back()} className="p-3 hover:bg-white/10 rounded-xl transition">
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
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="bg-white/10 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {invite.invited_by_avatar ? (
                    <Image
                      src={invite.invited_by_avatar}
                      alt={invite.invited_by_name}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                      {invite.invited_by_name[0].toUpperCase()}
                    </div>
                  )}
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
              onClick={() => setCreateModalOpen(true)}
              className="bg-gradient-to-r from-pink-500 to-purple-600 px-8 py-5 rounded-3xl font-bold text-xl shadow-2xl hover:scale-105 transition flex items-center gap-4"
            >
              <PlusIcon className="w-8 h-8" /> New Board
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {boards.map((board) => {
              const isOwner = currentUser?.id === board.owner_id;

              return (
                <div key={board.id} className="relative group transition-all">
                  <div
                    onClick={() => onSelectBoard(board)}
                    className="absolute inset-0 rounded-3xl z-10 cursor-pointer"
                  />

                  {isOwner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteModal(
                          `Delete "${board.title}"?`,
                          'This board and all its content will be permanently deleted.',
                          () => handleDeleteBoard(board)
                        );
                      }}
                      className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-all p-3 bg-red-600/20 hover:bg-red-600/40 backdrop-blur-md rounded-xl border border-red-500/50 hover:scale-110 shadow-lg"
                    >
                      <TrashIcon className="w-6 h-6 text-red-400" />
                    </button>
                  )}

                  <div className="relative bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-purple-500 hover:scale-105 shadow-2xl transition-all group-hover:shadow-purple-500/20">
                    <div
                      className="w-full h-48 rounded-2xl mb-6 overflow-hidden"
                      style={{ backgroundColor: board.background_color }}
                    />
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

      {/* Modals */}
      <CreateBoardModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        onCreate={handleCreate}
      />

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