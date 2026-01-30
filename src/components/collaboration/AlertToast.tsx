import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { AlertState } from '@/types/collaboration';

interface Props {
  alert: AlertState;
  onClose: () => void;
}

export default function AlertToast({ alert, onClose }: Props) {
  if (!alert.open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]"
      onClick={onClose}
    >
      <div
        className={`rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in fade-in zoom-in duration-300 ${
          alert.type === 'success'
            ? 'bg-gradient-to-br from-purple-600 to-pink-600'
            : 'bg-gradient-to-br from-red-600 to-orange-600'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-white/20 rounded-full flex items-center justify-center">
            {alert.type === 'success' ? (
              <CheckIcon className="w-12 h-12 text-white" />
            ) : (
              <XMarkIcon className="w-12 h-12 text-white" />
            )}
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">{alert.title}</h2>
          <p className="text-white/90 text-lg mb-8">{alert.message}</p>
          <button
            onClick={onClose}
            className="px-8 py-4 bg-white text-purple-600 rounded-2xl font-bold hover:scale-105 transition"
          >
            {alert.type === 'success' ? 'Awesome!' : 'Try Again'}
          </button>
        </div>
      </div>
    </div>
  );
}