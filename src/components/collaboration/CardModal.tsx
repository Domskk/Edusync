'use client';

import Image from 'next/image';
import {
  XMarkIcon,
  PlusIcon,
  CheckIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/types/collaboration';
import AttachmentItem from './AttachmentItem';

interface CardModalProps {
  isOpen: boolean;
  card: Card | null;
  setCard: (card: Card | null) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  previewImage: string | null;
  setPreviewImage: (url: string | null) => void;
  deleteAttachment: (cardId: string, index: number) => void;
  openDeleteModal: (title: string, message: string, onConfirm: () => void) => void;
}

export default function CardModal({
  isOpen,
  card,
  setCard,
  onClose,
  onSave,
  onDelete,
  fileInputRef,
  handleFileUpload,
  previewImage,
  setPreviewImage,
  deleteAttachment,
  openDeleteModal,
}: CardModalProps) {
  if (!isOpen || !card) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-8"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-[#1a1a1e] rounded-3xl max-w-4xl w-full max-h-screen overflow-y-auto border border-white/20 shadow-2xl"
        >
          <div className="p-8">
            <div className="flex justify-between items-start mb-8">
              <input
                value={card.title}
                onChange={(e) => setCard({ ...card, title: e.target.value })}
                className="text-4xl font-bold bg-transparent outline-none border-b-2 border-transparent hover:border-purple-500 focus:border-purple-500 transition pb-2 w-full"
                placeholder="Card title..."
                autoFocus={!card.title}
              />
              <button onClick={onClose}>
                <XMarkIcon className="w-8 h-8" />
              </button>
            </div>

            <textarea
              value={card.description || ''}
              onChange={(e) => setCard({ ...card, description: e.target.value })}
              placeholder="Add description..."
              className="w-full bg-white/10 rounded-2xl p-6 text-white placeholder-gray-500 resize-none focus:ring-4 focus:ring-purple-500/50 outline-none"
              rows={6}
            />

            <div className="mt-6 flex gap-4 items-center">
              <label className="text-sm font-medium">Due date:</label>
              <input
                type="date"
                value={card.dueDate ? card.dueDate.split('T')[0] : ''}
                onChange={(e) =>
                  setCard({
                    ...card,
                    dueDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                  })
                }
                className="px-4 py-2 rounded-2xl bg-white/5 outline-none text-white"
              />
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <PaperClipIcon className="w-7 h-7 text-pink-400" /> Attachments
                </h3>
                <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium flex items-center gap-2"
                >
                  <PlusIcon className="w-5 h-5" /> Add
                </button>
              </div>

              <div className="space-y-3">
                {(card.attachments || []).map((att, i) => (
                  <AttachmentItem
                    key={i}
                    attachment={att}
                    cardId={card.id}
                    index={i}
                    onPreview={setPreviewImage}
                    onDelete={deleteAttachment}
                    openDeleteModal={openDeleteModal}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button
                onClick={onSave}
                className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl font-bold hover:scale-105 transition flex items-center gap-3"
              >
                <CheckIcon className="w-6 h-6" /> Save Card
              </button>
              <button onClick={onClose} className="px-8 py-4 bg-white/10 rounded-2xl">
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="px-8 py-4 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-2xl font-bold transition"
              >
                Delete Card
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999]"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-8 left-8 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition"
          >
            <XMarkIcon className="w-8 h-8" />
          </button>
          <Image
            src={previewImage}
            alt="Preview"
            width={1200}
            height={800}
            className="object-contain rounded-2xl max-w-full max-h-full"
            unoptimized
          />
        </div>
      )}
    </>
  );
}