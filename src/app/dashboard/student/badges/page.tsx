'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { Badge, BadgeData, Rarity } from '@/components/gamification/Badge';
import BadgePopup from '@/components/gamification/BadgePopup';
import { Trophy, Flame, Sparkles, Crown, Gem } from 'lucide-react';

// Filter type: either 'all' or a specific rarity
type Filter = 'all' | Rarity;

// Full shape of the nested data returned from Supabase
type UserBadgeRow = {
  earned_at: string;
  badges: {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    rarity: Rarity;
    requirement_type?: string;
    requirement_value?: number;
  };
};

export default function StudentBadgesPage() {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [stats, setStats] = useState({
    total: 0,
    common: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
    mythic: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBadges = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch user badges with the related badge details (nested select)
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          earned_at,
          badges (
            id,
            name,
            description,
            icon,
            rarity,
            requirement_type,
            requirement_value
          )
        `)
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (error) {
        console.error('Failed to load badges:', error);
        setLoading(false);
        return;
      }

      // Safely map the nested result to BadgeData[]
      const earnedBadges: BadgeData[] = (data as unknown as UserBadgeRow[] || []).map(row => ({
        id: row.badges.id,
        name: row.badges.name,
        description: row.badges.description,
        icon: row.badges.icon as keyof typeof import('@/components/gamification/Badge').ICON_MAP,
        rarity: row.badges.rarity,
      }));

      // Count badges per rarity
      const counts = {
        total: earnedBadges.length,
        common: 0,
        rare: 0,
        epic: 0,
        legendary: 0,
        mythic: 0,
      };

      earnedBadges.forEach(b => {
        counts[b.rarity] += 1;
      });

      setStats(counts);
      setBadges(earnedBadges);
      setLoading(false);
    };

    loadBadges();
  }, []);

  // Apply current filter
  const filteredBadges = filter === 'all' ? badges : badges.filter(b => b.rarity === filter);

  // Visual config for each rarity
  const rarityConfig: Record<Rarity, { color: string; icon: typeof Trophy; label: string }> = {
    common: { color: 'gray', icon: Sparkles, label: 'Common' },
    rare: { color: 'blue', icon: Trophy, label: 'Rare' },
    epic: { color: 'purple', icon: Crown, label: 'Epic' },
    legendary: { color: 'orange', icon: Flame, label: 'Legendary' },
    mythic: { color: 'emerald', icon: Gem, label: 'Mythic' },
  };

  return (
    <>
      <BadgePopup />
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-black to-indigo-950 p-6 md:p-12">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Trophy Room
            </h1>
            <p className="text-2xl text-gray-300 mt-4">Your hard-earned achievements</p>
          </motion.div>

          {/* Stats Bar */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-12">
            {/* Total badge count */}
            <div className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl p-6 text-center shadow-2xl border-4 border-yellow-400">
              <Trophy className="w-12 h-12 mx-auto mb-2 text-black" />
              <p className="text-5xl font-black text-black">{stats.total}</p>
              <p className="text-sm font-bold text-black/80">Total Badges</p>
            </div>

            {/* One card per rarity */}
            {(Object.keys(rarityConfig) as Rarity[]).map(rarity => {
              const config = rarityConfig[rarity];
              const Icon = config.icon;

              return (
                <motion.div
                  key={rarity}
                  whileHover={{ scale: 1.1 }}
                  className={`bg-gradient-to-br from-${config.color}-600/30 to-${config.color}-800/30 backdrop-blur-xl rounded-2xl p-6 text-center border-4 border-${config.color}-500/50 shadow-2xl`}
                >
                  <Icon className={`w-10 h-10 mx-auto mb-2 text-${config.color}-400`} />
                  <p className={`text-4xl font-black text-${config.color}-300`}>{stats[rarity]}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{config.label}</p>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {(['all' as const, ...Object.keys(rarityConfig) as Rarity[]]).map(f => {
              const isActive = filter === f;
              const config = f === 'all'
                ? { color: 'yellow', label: 'All Badges' }
                : rarityConfig[f];

              return (
                <motion.button
                  key={f}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFilter(f)}
                  className={`px-8 py-4 rounded-full font-bold text-lg transition-all ${
                    isActive
                      ? `bg-gradient-to-r from-${config.color}-500 to-${config.color}-600 text-black shadow-2xl ring-4 ring-${config.color}-400/50`
                      : 'bg-white/10 backdrop-blur-xl text-gray-400 hover:bg-white/20 border-2 border-white/20'
                  }`}
                >
                  {config.label}
                </motion.button>
              );
            })}
          </div>

          {/* Badge Grid */}
          {loading ? (
            <div className="text-center py-20">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                <Sparkles className="w-20 h-20 mx-auto text-yellow-400" />
              </motion.div>
              <p className="text-xl text-gray-400 mt-6">Loading your trophies...</p>
            </div>
          ) : filteredBadges.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <div className="w-48 h-48 mx-auto bg-white/5 rounded-3xl border-4 border-dashed border-white/20 flex items-center justify-center mb-8">
                <Trophy className="w-24 h-24 text-white/20" />
              </div>
              <p className="text-3xl font-bold text-gray-400">
                {filter === 'all' ? "No badges yet!" : `No ${rarityConfig[filter]?.label || ''} badges yet!`}
              </p>
              <p className="text-xl text-gray-500 mt-4">Keep studying to unlock legendary rewards!</p>
            </motion.div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 justify-items-center"
            >
              {filteredBadges.map((badge, i) => (
                <motion.div
                  key={badge.id}
                  layout
                  initial={{ opacity: 0, scale: 0, rotate: -180 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -12, rotate: 6 }}
                  className="relative group"
                >
                  <Badge badge={badge} size="lg" animate={true} />
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <p className="text-xs font-bold text-gray-300 whitespace-nowrap bg-black/80 px-3 py-1 rounded-full">
                      {badge.name}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}