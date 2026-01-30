import { PlusIcon } from '@heroicons/react/24/outline';

interface ColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  newTitle: string;
  setNewTitle: (title: string) => void;
  onCreate: () => void;
}

export default function ColumnModal({ isOpen, onClose, newTitle, setNewTitle, onCreate }: ColumnModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1a1e] rounded-3xl p-8 border border-white/20 shadow-2xl"
      >
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && newTitle.trim() && onCreate()}
          placeholder="Column title..."
          className="w-96 px-6 py-4 bg-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-purple-500 text-xl"
          autoFocus
        />
        <div className="flex gap-4 mt-6 justify-end">
          <button onClick={onClose} className="px-8 py-4 bg-white/10 rounded-2xl">
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={!newTitle.trim()}
            className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl font-bold flex items-center gap-3 disabled:opacity-50"
          >
            <PlusIcon className="w-6 h-6" />
            Create Column
          </button>
        </div>
      </div>
    </div>
  );
}