import { useState } from 'react';
import Image from 'next/image';
import {
  PaperClipIcon,
  ArrowDownTrayIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import { Attachment } from '@/types/collaboration';

interface Props {
  attachment: Attachment;
  cardId?: string;
  index?: number;
  onPreview: (url: string) => void;
  onDelete?: (cardId: string, index: number) => void;
  openDeleteModal: (title: string, message: string, onConfirm: () => void) => void;
}

export default function AttachmentItem({
  attachment,
  cardId,
  index,
  onPreview,
  onDelete,
  openDeleteModal,
}: Props) {
  const isImage = /\.(jpe?g|png|gif|webp)$/i.test(attachment.name);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="group flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all">
      <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/20">
        {isImage ? (
          <button onClick={() => onPreview(attachment.url)} className="w-full h-full">
            <Image
              src={attachment.url}
              alt=""
              width={48}
              height={48}
              className="object-cover"
              unoptimized
            />
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
        <button
          onClick={() => {
            const a = document.createElement('a');
            a.href = attachment.url;
            a.download = attachment.name;
            a.click();
          }}
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
        </button>

        {cardId !== undefined && index !== undefined && onDelete && (
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)}>
              <EllipsisHorizontalIcon className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-[#111116] border border-white/10 rounded-lg shadow-lg z-50">
                <button
                  onClick={() => {
                    openDeleteModal(
                      `Delete "${attachment.name}"?`,
                      'This file will be removed from the card.',
                      () => {
                        onDelete(cardId, index);
                        setMenuOpen(false);
                      }
                    );
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
}