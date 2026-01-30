import { motion } from 'framer-motion';
import { Crown, Flame, Zap, Trophy, Gem, Star } from 'lucide-react';

const RANK_CONFIG = {
  Rookie: { color: 'from-gray-400 to-gray-600', icon: Star, border: 'border-gray-500' },
  Warrior: { color: 'from-yellow-400 to-amber-600', icon: Zap, border: 'border-yellow-500' },
  Elite: { color: 'from-purple-500 to-pink-500', icon: Trophy, border: 'border-purple-500' },
  Master: { color: 'from-orange-600 to-red-700', icon: Flame, border: 'border-red-600' },
  Legend: { color: 'from-emerald-500 to-teal-600', icon: Gem, border: 'border-emerald-500' },
  Mythic: { color: 'from-cyan-400 to-blue-600', icon: Crown, border: 'border-cyan-400' },
};

interface RankBorderProps {
  rank: keyof typeof RANK_CONFIG;
  level: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children?: React.ReactNode;
}

export function RankBorder({ rank, level, size = 'xl', children }: RankBorderProps) {
  const config = RANK_CONFIG[rank];
  const Icon = config.icon;

  const sizes = {
    sm: 'w-32 h-32',
    md: 'w-48 h-48',
    lg: 'w-64 h-64',
    xl: 'w-80 h-80'
  };

  return (
    <motion.div
      initial={{ scale: 0.8, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ duration: 1, type: "spring", stiffness: 100 }}
      className={`relative ${sizes[size]} group`}
    >
      {/* Outer Glow */}
      <div className={`absolute inset-0 rounded-3xl blur-3xl opacity-70 group-hover:opacity-100 animate-pulse bg-gradient-to-r ${config.color}`} />

      {/* Triangle Border - Valorant Style */}
      <div className="absolute inset-0">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id={`grad-${rank}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className={`text-${config.border.split('-')[1]}-400`} />
              <stop offset="100%" className={`text-${config.border.split('-')[1]}-600`} />
            </linearGradient>
          </defs>
          <path
            d="M50,5 L90,35 L90,75 L50,95 L10,75 L10,35 Z"
            fill="none"
            stroke={`url(#grad-${rank})`}
            strokeWidth="4"
            className="drop-shadow-2xl"
          />
        </svg>
      </div>

      {/* Inner Glow */}
      <div className={`absolute inset-4 rounded-3xl bg-gradient-to-br ${config.color} opacity-20 blur-xl`} />

      {/* Content */}
      <div className="absolute inset-8 bg-black/80 backdrop-blur-2xl rounded-3xl border-4 border-white/20 flex flex-col items-center justify-center">
        {children || (
          <>
            <Icon className={`w-20 h-20 text-white mb-4 drop-shadow-2xl`} />
            <p className="text-5xl font-black text-white drop-shadow-2xl">{rank}</p>
            <p className="text-7xl font-black bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              {level}
            </p>
          </>
        )}
      </div>

      {/* Corner Decorations */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full blur-xl" />
      </div>
    </motion.div>
  );
}