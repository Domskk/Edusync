'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/student/ProgressBar';
import { Badge } from '@/components/student/Badge';
import SharedBoard from '@/components/collaboration/SharedBoard';
import Link from 'next/link';
import type { Database } from '@/types/supabase';

type StudyPlan = Database['public']['Tables']['ai_study_plans']['Row'];
type Gamification = Database['public']['Tables']['gamification']['Row'];
type SharedBoardType = Database['public']['Tables']['shared_boards']['Row'];

export default function StudentDashboard() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [points, setPoints] = useState<number>(0);
  const [badges, setBadges] = useState<Gamification[]>([]);
  const [boards, setBoards] = useState<SharedBoardType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch study plans
      const { data: studyPlans } = await supabase
        .from('ai_study_plans')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });
      setPlans(studyPlans ?? []);

      // Fetch gamification points & badges
      const { data: gamification } = await supabase
        .from('gamification')
        .select('*')
        .eq('student_id', user.id);
      setPoints(gamification?.[0]?.points ?? 0);
      setBadges(gamification?.filter((g) => g.badge_name) ?? []);

      // Fetch collaboration boards
      const { data: boardsData } = await supabase.from('shared_boards').select('*');
      setBoards(boardsData ?? []);

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  const generateStudyPlan = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const res = await fetch('/api/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Study Plan Overview' }),
      });

      const data = await res.json();
      const summary = data.summary ?? 'No summary available.';

      await supabase.from('ai_study_plans').insert({
        student_id: user.id,
        content: JSON.stringify({ summary }),
      });

      alert('Study plan generated successfully!');
    } catch (error) {
      console.error('Error generating study plan:', error);
      alert('Failed to generate study plan.');
    }
  };

  if (loading)
    return (
      <div className="text-center text-gray-200 mt-10">
        Loading your dashboard...
      </div>
    );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl">
        <h2 className="text-2xl font-bold mb-2 text-white">Student Dashboard</h2>
        <p className="text-gray-200">Welcome back! Let’s continue your learning journey.</p>
      </div>

      {/* STUDY PLANS */}
      <Card className="bg-white/10 border border-white/20 backdrop-blur-xl shadow-lg rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">My Study Plans</h3>
          <button
            onClick={generateStudyPlan}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md text-sm"
          >
            Generate New Plan
          </button>
        </div>

        {plans.length > 0 ? (
          <ul className="space-y-3">
            {plans.map((plan) => (
              <li key={plan.id} className="bg-white/5 p-4 rounded-lg text-gray-200">
                {plan.content ? JSON.parse(plan.content as string)?.summary ?? 'No summary' : 'No summary'}
                <div className="text-xs text-gray-400 mt-1">
                  {plan.created_at ? new Date(plan.created_at).toLocaleString() : 'Date not available'}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-300">No study plans yet. Generate one to start!</p>
        )}
      </Card>

      {/* PROGRESS & BADGES */}
      <Card className="bg-white/10 border border-white/20 backdrop-blur-xl shadow-lg rounded-2xl">
        <h3 className="text-lg font-semibold mb-3 text-white">Progress</h3>
        <ProgressBar points={points} />
        <div className="flex flex-wrap gap-3 mt-4">
          {badges.length > 0 ? (
            badges.map((badge) => <Badge key={badge.id} name={badge.id} />)
          ) : (
            <p className="text-gray-300">No badges earned yet.</p>
          )}
        </div>
      </Card>

      {/* COLLABORATION BOARDS */}
      <Card className="bg-white/10 border border-white/20 backdrop-blur-xl shadow-lg rounded-2xl">
        <h3 className="text-lg font-semibold mb-3 text-white">Collaboration Boards</h3>
        {boards.length > 0 ? (
          boards.map((board) => <SharedBoard key={board.id} boardId={board.id} />)
        ) : (
          <p className="text-gray-300">No boards available yet.</p>
        )}
      </Card>

      {/* LEADERBOARDS */}
      <Card className="bg-white/10 border border-white/20 backdrop-blur-xl shadow-lg rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Leaderboards</h3>
          <Link
            href="/dashboard/student/leaderboard"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md text-sm inline-block"
          >
            View Leaderboard
          </Link>
        </div>
        <div className="flex items-center space-x-2 text-gray-300">
          Check your rank and compete with others!
        </div>
      </Card>
    </div>
  );
}