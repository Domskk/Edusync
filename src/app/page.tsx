'use client'

import { supabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, Loader2, CheckCircle, XCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type View = 'signin' | 'signup' | 'forgot';
type Modal = { type: 'success' | 'error'; message: string } | null;

const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};

const modalAnimation = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.85, transition: { duration: 0.2 } },
};

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<View>('signin');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [modal, setModal] = useState<Modal>(null);

  useEffect(() => setModal(null), []);

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: dbUser } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        const role = dbUser?.role ?? 'student';
        const paths: Record<string, string> = {
          admin: '/dashboard/admin',
          student: '/dashboard/student',
        };
        router.replace(paths[role as keyof typeof paths]);
      }
    };

    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: dbUser } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        const role = dbUser?.role ?? 'student';
        const paths: Record<string, string> = {
          admin: '/dashboard/admin',
          student: '/dashboard/student',
        };
        router.replace(paths[role as keyof typeof paths]);
      }
      if (event === 'SIGNED_OUT') {
        setView('signin');
        router.replace('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const openModal = (type: 'success' | 'error', msg: string) => {
    setModal({ type, message: msg });
    const timer = setTimeout(() => {
      setModal(null);
      if (type === 'success' && view === 'forgot') setView('signin');
    }, 4000);
    return () => clearTimeout(timer);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const mail = email.trim().toLowerCase();

    try {
      if (view === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
        if (error) {
          openModal('error', error.message);
        }
      } else if (view === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: mail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName.trim() || null,
              display_name: displayName.trim(),
            },
          },
        });

        if (error) {
          // More specific error messages
          if (error.message.includes('User already registered')) {
            openModal('error', 'This email is already registered. Try signing in instead!');
          } else {
            openModal('error', error.message);
          }
        } else if (data.user) {
          // Clear form fields
          setEmail('');
          setPassword('');
          setFullName('');
          setDisplayName('');
          
          if (!data.session) {
            // Email confirmation required
            openModal('success', 'Check your email for the confirmation link!');
            setView('signin');
          } else {
            // Auto-confirmed - redirect will happen via auth listener
            openModal('success', 'Welcome! Redirecting to your dashboard...');
          }
        }
      } else if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(mail, {
          redirectTo: `${window.location.origin}/update-password`,
        });
        if (error) {
          openModal('error', error.message);
        } else {
          openModal('success', 'Password-reset link sent! Check your inbox.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen animated-gradient">
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo + Title */}
          <div className="text-center">
            <div className="bg-white rounded-xl shadow-lg p-4 inline-block mb-6">
              <Image src="/images/logo.png" alt="EduSync Logo" width={80} height={80} className="mx-auto" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Welcome to EduSync</h1>
            <p className="text-indigo-100 text-lg">A smart collaborative learning platform</p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
            <motion.form
              key={view}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition"
                />
              </div>

              {/* Password */}
              {view !== 'forgot' && (
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                  >
                    {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              )}

              {/* Full Name & Display Name - Only on Signup */}
              {view === 'signup' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name (optional)</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      minLength={2}
                      maxLength={30}
                      placeholder="e.g. SuperLearner, Alex"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This is how you will appear on leaderboards and badges!
                    </p>
                  </div>
                </>
              )}

              {/* Remember + Forgot */}
              {view === 'signin' && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                    <span className="text-gray-600">Remember me</span>
                  </label>
                  <button type="button" onClick={() => setView('forgot')} className="text-indigo-600 hover:underline">
                    Forgot your password?
                  </button>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={
                  loading ||
                  !email ||
                  (view !== 'forgot' && !password) ||
                  (view === 'signup' && !displayName.trim())
                }
                className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    {view === 'signin' ? 'Signing in…' : view === 'signup' ? 'Creating…' : 'Sending…'}
                  </>
                ) : (
                  <>{view === 'signin' ? 'Sign in' : view === 'signup' ? 'Sign up' : 'Send Reset Link'}</>
                )}
              </button>
            </motion.form>

            {/* Back to Sign-in */}
            {view === 'forgot' && (
              <p className="text-center text-sm text-gray-600">
                <button type="button" onClick={() => setView('signin')} className="text-indigo-600 hover:underline font-medium">
                  Back to Sign in
                </button>
              </p>
            )}

            {/* Toggle Sign-up / Sign-in */}
            {view !== 'forgot' && (
              <p className="text-center text-sm text-gray-600">
                {view === 'signin' ? (
                  <>
                    Don&#39;t have an account?{' '}
                    <button type="button" onClick={() => setView('signup')} className="text-indigo-600 hover:underline font-medium">
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button type="button" onClick={() => setView('signin')} className="text-indigo-600 hover:underline font-medium">
                      Sign in
                    </button>
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </main>

      {/* MODAL */}
      <AnimatePresence>
        {modal && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              variants={backdrop}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={() => setModal(null)}
            />
            <motion.div
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center z-50"
              variants={modalAnimation}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <button
                onClick={() => setModal(null)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
              {modal.type === 'success' ? (
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              ) : (
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              )}
              <h3 className={`text-lg font-semibold ${modal.type === 'success' ? 'text-gray-900' : 'text-red-700'}`}>
                {modal.type === 'success' ? 'Success!' : 'Error'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{modal.message}</p>
              <button
                onClick={() => {
                  setModal(null);
                  if (modal.type === 'success' && view === 'forgot') setView('signin');
                }}
                className={`mt-4 w-full py-2 rounded-lg text-sm font-medium transition ${
                  modal.type === 'success'
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                Got it
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}