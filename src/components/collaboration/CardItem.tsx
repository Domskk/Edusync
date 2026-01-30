import { PaperClipIcon } from '@heroicons/react/24/outline';
import { Card } from '@/types/collaboration';

interface CardItemProps {
  card: Card;
  onClick: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
}

export default function CardItem({ card, onClick, onDragStart }: CardItemProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/20 transition border border-white/20 select-none"
    >
      <h4 className="font-medium mb-2">{card.title || 'Untitled Card'}</h4>
      
      {card.description && (
        <p className="text-sm text-gray-300 line-clamp-3 mb-3">{card.description}</p>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-gray-400">
        {card.attachments && card.attachments.length > 0 && (
          <div className="flex items-center gap-1">
            <PaperClipIcon className="w-4 h-4" />
            {card.attachments.length}
          </div>
        )}
        {card.dueDate && (
          <div className="text-orange-300">
            Due: {new Date(card.dueDate).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}