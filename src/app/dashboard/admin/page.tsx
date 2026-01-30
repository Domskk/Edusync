'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Badge, ICON_MAP } from '@/components/gamification/Badge';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

type User = {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  role: 'admin' | 'student';
  avatar_url: string | null;
  created_at: string;
};

type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
type RequirementType =
  | 'points'
  | 'level'
  | 'streak'
  | 'top_10'
  | 'top_1'
  | 'first_login'
  | 'perfect_week';

export type DBBadge = {
  id: string;
  name: string;
  description?: string | null;
  icon: keyof typeof ICON_MAP;
  rarity: Rarity;
  requirement_type: RequirementType;
  requirement_value: number;
  created_at?: string;
};

const initialForm: DBBadge = {
  id: '',
  name: '',
  description: '',
  icon: 'Trophy',
  rarity: 'common',
  requirement_type: 'points',
  requirement_value: 50,
};

export default function AdminDashboard() {
  const [badges, setBadges] = useState<DBBadge[]>([]);
  const [form, setForm] = useState<DBBadge>(initialForm);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [activeTab, setActiveTab] = useState<'badges' | 'users'>('badges');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load users');
      setLoadingUsers(false);
      return;
    }

    setUsers(data || []);
    setLoadingUsers(false);
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'student') => {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      toast.error('Failed to update user role');
    } else {
      toast.success('User role updated');
      loadUsers();
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Delete user "${email}" permanently? This action cannot be undone.`)) return;

    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) {
      toast.error('Failed to delete user');
    } else {
      toast.success('User deleted');
      loadUsers();
    }
  };

  const loadBadges = async () => {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load badges');
      return;
    }

    const normalized: DBBadge[] = (data || []).map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description ?? null,
      icon: (b.icon in ICON_MAP ? b.icon : 'Trophy') as keyof typeof ICON_MAP,
      rarity: b.rarity as Rarity,
      requirement_type: b.requirement_type as RequirementType,
      requirement_value: b.requirement_value,
      created_at: b.created_at,
    }));

    setBadges(normalized);
  };

  useEffect(() => {
    loadBadges();
    loadUsers();
  }, []);

  const saveBadge = async () => {
    if (!form.name.trim()) return toast.error('Badge name is required!');

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        icon: form.icon,
        rarity: form.rarity,
        requirement_type: form.requirement_type,
        requirement_value: form.requirement_value,
      };

      if (form.id) {
        const { error } = await supabase.from('badges').update(payload).eq('id', form.id);
        if (error) throw error;
        toast.success(`"${form.name}" updated!`, { icon: 'Success' });
      } else {
        const { error } = await supabase.from('badges').insert(payload);
        if (error) throw error;
        toast.success(`"${form.name}" created!`, { icon: 'New' });
      }

      setForm(initialForm);
      await loadBadges();
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message || 'Failed to save badge');
    } finally {
      setSaving(false);
    }
  };

  const deleteBadge = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" permanently?`)) return;

    const { error } = await supabase.from('badges').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success(`"${name}" deleted`);
      await loadBadges();
    }
  };

  const previewBadge = {
    id: 'preview',
    name: form.name || 'New Badge',
    description: form.description || 'Preview badge',
    icon: form.icon,
    rarity: form.rarity,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-black to-indigo-950 p-8">
      <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl md:text-3xl font-black bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent"
        >
          Admin Dashboard
        </motion.h1>
        <button
          onClick={handleLogout}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-2 shadow-2xl">
          <button
            onClick={() => setActiveTab('badges')}
            className={`px-6 py-3 rounded-2xl font-bold transition-colors ${
              activeTab === 'badges'
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black'
                : 'text-white hover:bg-white/20'
            }`}
          >
            Badge Management
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-2xl font-bold transition-colors ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black'
                : 'text-white hover:bg-white/20'
            }`}
          >
            User Management
          </button>
        </div>
      </div>

      {activeTab === 'badges' && (
        <>
          {/* Form + Live Preview */}
          <div className="grid lg:grid-cols-2 gap-12 mb-16">
            {/* Form */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">
                {form.id ? 'Edit Badge' : 'Create New Badge'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <input
                  placeholder="Badge Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400"
                />
                <input
                  placeholder="Description (optional)"
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400"
                />

                {/* Icon Dropdown */}
                <select
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value as keyof typeof ICON_MAP })}
                  className="px-4 py-3 bg-black/80 border border-white/30 rounded-xl text-white focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50"
                >
                  {Object.keys(ICON_MAP).map((key) => (
                    <option key={key} value={key} className="bg-black text-white">
                      {key}
                    </option>
                  ))}
                </select>

                {/* Rarity Dropdown */}
                <select
                  value={form.rarity}
                  onChange={(e) => setForm({ ...form, rarity: e.target.value as Rarity })}
                  className="px-4 py-3 bg-black/80 border border-white/30 rounded-xl text-white focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50"
                >
                  <option value="common" className="bg-black text-white">Common</option>
                  <option value="rare" className="bg-black text-white">Rare</option>
                  <option value="epic" className="bg-black text-white">Epic</option>
                  <option value="legendary" className="bg-black text-white">Legendary</option>
                  <option value="mythic" className="bg-black text-white">Mythic</option>
                </select>

                {/* Requirement Type */}
                <select
                  value={form.requirement_type}
                  onChange={(e) => setForm({ ...form, requirement_type: e.target.value as RequirementType })}
                  className="px-4 py-3 bg-black/80 border border-white/30 rounded-xl text-white focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50"
                >
                  <option value="points" className="bg-black text-white">Points</option>
                  <option value="level" className="bg-black text-white">Level</option>
                  <option value="streak" className="bg-black text-white">Streak</option>
                  <option value="top_10" className="bg-black text-white">Top 10</option>
                  <option value="top_1" className="bg-black text-white">Rank #1</option>
                  <option value="first_login" className="bg-black text-white">First Login</option>
                  <option value="perfect_week" className="bg-black text-white">Perfect Week</option>
                </select>

                <input
                  type="number"
                  placeholder="Requirement Value"
                  value={form.requirement_value}
                  onChange={(e) => setForm({ ...form, requirement_value: parseInt(e.target.value) || 0 })}
                  className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={saveBadge}
                  disabled={saving || !form.name}
                  className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl shadow-lg hover:shadow-yellow-500/50 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : form.id ? 'Update Badge' : 'Create Badge'}
                </button>
                {form.id && (
                  <button
                    onClick={() => setForm(initialForm)}
                    className="px-6 py-4 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Live Preview */}
            <div className="flex items-center justify-center">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-10 shadow-2xl">
                <p className="text-xl text-gray-300 mb-6 text-center">Live Preview</p>
                <div className="flex justify-center">
                  <Badge badge={previewBadge} size="lg" />
                </div>
              </div>
            </div>
          </div>

          {/* All Badges Grid */}
          <h2 className="text-4xl font-black text-white mb-8 text-center">
            All Badges ({badges.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
            {badges.map((badge) => (
              <motion.div
                key={badge.id}
                whileHover={{ y: -10 }}
                className="relative group cursor-pointer"
              >
                <Badge badge={badge} size="lg" />
                <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 transition rounded-3xl flex flex-col justify-end p-4">
                  <button
                    onClick={() => setForm(badge)}
                    className="mb-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-bold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteBadge(badge.id, badge.name)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg text-sm font-bold"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <>
          {/* User Management Section */}
          <h2 className="text-4xl font-black text-white mb-8 text-center">
            User Management ({users.length})
          </h2>
          {loadingUsers ? (
            <div className="text-center text-white">Loading users...</div>
          ) : (
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-4 px-4">Email</th>
                      <th className="text-left py-4 px-4">Full Name</th>
                      <th className="text-left py-4 px-4">Display Name</th>
                      <th className="text-left py-4 px-4">Role</th>
                      <th className="text-left py-4 px-4">Created At</th>
                      <th className="text-left py-4 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-white/10">
                        <td className="py-4 px-4">{user.email}</td>
                        <td className="py-4 px-4">{user.full_name || 'N/A'}</td>
                        <td className="py-4 px-4">{user.display_name || 'N/A'}</td>
                        <td className="py-4 px-4">
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.id, e.target.value as 'admin' | 'student')}
                            className="px-2 py-1 bg-black/80 border border-white/30 rounded text-white text-sm"
                          >
                            <option value="student">Student</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-4 px-4">{new Date(user.created_at).toLocaleDateString()}</td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => deleteUser(user.id, user.email)}
                            className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg text-sm font-bold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}