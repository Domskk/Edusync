'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ICON_MAP, Rarity } from './Badge';

export type PopupBadge = {
  id: string;
  name: string;
  description?: string | null;
  icon: keyof typeof ICON_MAP;
  rarity: Rarity;
};

export const badgePopup = new EventTarget();

export default function BadgePopup() {
  const [badge, setBadge] = useState<PopupBadge | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<PopupBadge>;
      setBadge(customEvent.detail);
      setTimeout(() => setBadge(null), 5000);
    };
    badgePopup.addEventListener('badge-unlocked', handler);
    return () => badgePopup.removeEventListener('badge-unlocked', handler);
  }, []);

  if (!badge) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[9999] p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.3, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0.3, rotate: 30 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-600 rounded-3xl p-12 text-center border-8 border-yellow-600 shadow-[0_0_60px_#facc15] max-w-lg"
        >
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-9xl mb-6"
          >
            Trophy
          </motion.div>
          <h2 className="text-5xl font-black text-black mb-4">Badge Unlocked!</h2>
          <p className="text-3xl font-bold text-black mb-2">{badge.name}</p>
          <p className="text-xl text-black/80">{badge.description || 'Keep up the great work!'}</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}