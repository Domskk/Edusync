import { PlusIcon } from '@heroicons/react/24/outline';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  newTitle: string;
  setNewTitle: (title: string) => void;
  onCreate: () => void;
}

export default function CreateBoardModal({
  isOpen,
  onClose,
  newTitle,
  setNewTitle,
  onCreate,
}: CreateBoardModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999]"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1e] rounded-3xl p-8 border border-white/20 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
          Create New Board
        </h2>

        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newTitle.trim()) {
              onCreate();
            }
          }}
          placeholder="Enter board name..."
          className="w-full px-6 py-4 bg-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-purple-500/50 text-white placeholder-gray-500 text-xl"
          autoFocus
        />

        <div className="flex gap-4 mt-8 justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={!newTitle.trim()}
            className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl font-bold transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
          >
            <PlusIcon className="w-6 h-6" />
            Create Board
          </button>
        </div>
      </div>
    </div>
  );
}