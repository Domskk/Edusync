import { XMarkIcon } from '@heroicons/react/24/outline';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({ isOpen, title, message, onConfirm, onCancel }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={onCancel}>
      <div
        className="bg-[#1a1a1e] rounded-3xl p-8 border border-white/20 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/10 rounded-xl transition"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <p className="text-gray-300 mb-8">{message}</p>
        <div className="flex gap-4 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-medium transition"
          >
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
}