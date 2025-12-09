'use client';
import { motion } from 'framer-motion';
import { 
  Trophy, Flame, Star, Zap, Crown, Gem, 
  Sparkles, Medal, Award, Shield 
} from 'lucide-react';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export const ICON_MAP = {
  Trophy, Flame, Star, Zap, Crown, Gem, 
  Sparkles, Medal, Award, Shield
} as const;

export interface BadgeData {
  id: string;
  name: string;
  description?: string | null;
  icon: keyof typeof ICON_MAP;
  rarity: Rarity;
}

interface BadgeProps {
  badge: BadgeData;
  earned?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export function Badge({ badge, earned = true, size = 'md', animate = true }: BadgeProps) {
  const sizes = { sm: 'w-20 h-20 text-3xl', md: 'w-28 h-28 text-5xl', lg: 'w-36 h-36 text-7xl' };
  const config = {
    common: { gradient: 'from-gray-400 to-gray-600', glow: 'shadow-gray-500/50', border: 'border-gray-400' },
    rare: { gradient: 'from-blue-400 to-cyan-500', glow: 'shadow-cyan-500/70', border: 'border-cyan-400' },
    epic: { gradient: 'from-purple-500 to-pink-500', glow: 'shadow-purple-500/80', border: 'border-purple-400' },
    legendary: { gradient: 'from-orange-500 to-red-600', glow: 'shadow-red-600/90', border: 'border-orange-500' },
    mythic: { gradient: 'from-emerald-400 to-teal-600', glow: 'shadow-emerald-600/90', border: 'border-emerald-400' },
  }[badge.rarity] ?? { gradient: '', glow: '', border: '' };

  const Icon = ICON_MAP[badge.icon] ?? Trophy;

  return (
    <motion.div
      initial={animate ? { scale: 0, rotate: -180 } : false}
      animate={animate ? { scale: 1, rotate: 0 } : false}
      whileHover={{ scale: 1.2, rotate: 8 }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
      className={`relative group ${sizes[size]}`}
    >
      <div className={`absolute inset-0 rounded-3xl blur-3xl opacity-70 group-hover:opacity-100 transition-all ${config.glow} animate-pulse`} />
      <div className={`relative w-full h-full bg-gradient-to-br ${config.gradient} p-2 rounded-3xl shadow-2xl`}>
        <div className={`w-full h-full bg-black/70 backdrop-blur-xl rounded-[20px] flex flex-col items-center justify-center border-4 ${config.border} ${!earned && 'opacity-50 grayscale'}`}>
          <Icon className="text-white drop-shadow-2xl" strokeWidth={2.5} />
          <p className="text-xs font-black text-white mt-2 tracking-wider">{badge.name}</p>
        </div>
      </div>
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <span className={`text-xs font-bold px-3 py-1 rounded-full bg-black/80 text-${badge.rarity === 'mythic' ? 'emerald' : badge.rarity === 'legendary' ? 'orange' : 'purple'}-400`}>
          {badge.rarity.toUpperCase()}
        </span>
      </div>
      {badge.rarity === 'mythic' && earned && (
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute inset-0 pointer-events-none">
          <Sparkles className="absolute top-2 left-2 w-6 h-6 text-yellow-300" />
          <Sparkles className="absolute top-2 right-2 w-8 h-8 text-pink-300" />
          <Sparkles className="absolute bottom-2 left-1/2 -translate-x-1/2 w-10 h-10 text-cyan-300" />
        </motion.div>
      )}
    </motion.div>
  );
}
