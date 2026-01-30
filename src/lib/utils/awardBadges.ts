import { supabase } from '@/lib/supabase/client';
import { badgePopup } from '@/components/gamification/BadgePopup';
import { ICON_MAP } from '@/components/gamification/Badge';

type RequirementType =
  | 'points'
  | 'level'
  | 'streak'
  | 'top_10'
  | 'top_1'
  | 'first_login'
  | 'perfect_week';

type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

type DBBadge = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  rarity: Rarity;
  requirement_type: RequirementType;
  requirement_value: number;
};

export async function checkAndAwardBadges(userId: string) {
  try {
    const { data: gamification } = await supabase
      .from('gamification')
      .select('points, current_streak, first_login_completed')
      .eq('user_id', userId)
      .maybeSingle();

    if (!gamification) return { success: false, newBadges: [] };

    const points = gamification.points || 0;
    const level = Math.floor(points / 100) + 1;
    const streak = gamification.current_streak || 0;

    // Get rank efficiently
    const { data: top10 } = await supabase
      .from('gamification')
      .select('user_id')
      .order('points', { ascending: false })
      .limit(10);

    const rank = top10?.findIndex(u => u.user_id === userId) ?? -1;
    const isTop10 = rank >= 0 && rank < 10;
    const isTop1 = rank === 0;

    // Fetch badges and earned ones
    const [{ data: allBadges }, { data: earnedRaw }] = await Promise.all([
      supabase.from('badges').select('*'),
      supabase.from('user_badges').select('badge_id').eq('user_id', userId),
    ]);

    const earnedIds = new Set(earnedRaw?.map(e => e.badge_id) || []);
    const newlyEarned: string[] = [];

    for (const badge of (allBadges as DBBadge[]) || []) {
      if (earnedIds.has(badge.id)) continue;

      let unlocked = false;
      switch (badge.requirement_type) {
        case 'points': unlocked = points >= badge.requirement_value; break;
        case 'level': unlocked = level >= badge.requirement_value; break;
        case 'streak': unlocked = streak >= badge.requirement_value; break;
        case 'top_10': unlocked = isTop10; break;
        case 'top_1': unlocked = isTop1; break;
        case 'first_login': unlocked = !gamification.first_login_completed; break;
        case 'perfect_week': unlocked = streak >= 7; break;
      }

      if (!unlocked) continue;

      // Use upsert with ignoreDuplicates to prevent 409 errors
      const { error: insertError } = await supabase
        .from('user_badges')
        .upsert(
          { user_id: userId, badge_id: badge.id },
          { 
            onConflict: 'user_id,badge_id',
            ignoreDuplicates: true 
          }
        );

      // If there was an error other than duplicate, log it
      if (insertError && insertError.code !== '23505') {
        console.error('Error awarding badge:', insertError);
        continue; // Skip this badge and continue with others
      }

      // If it was a duplicate (23505), skip the popup and notification
      if (insertError?.code === '23505') {
        continue;
      }

      if (badge.requirement_type === 'first_login') {
        await supabase
          .from('gamification')
          .update({ first_login_completed: true })
          .eq('user_id', userId);
      }

      await supabase.from('notifications').insert({
        user_id: userId,
        message: `You unlocked the "${badge.name}" badge!`,
      });

      newlyEarned.push(badge.name);

      const iconKey = badge.icon as keyof typeof ICON_MAP;
      const validIcon = ICON_MAP[iconKey] ? iconKey : 'Trophy';

      badgePopup.dispatchEvent(
        new CustomEvent('badge-unlocked', {
          detail: {
            id: badge.id,
            name: badge.name,
            description: badge.description || 'Amazing work!',
            icon: validIcon,
            rarity: badge.rarity,
          },
        })
      );
    }

    return { success: true, newBadges: newlyEarned };
  } catch (error) {
    console.error('checkAndAwardBadges error:', error);
    return { success: false, newBadges: [] };
  }
}