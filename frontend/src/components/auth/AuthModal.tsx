'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { login, register } from '@/services/auth.service';
import { X, Loader2 } from 'lucide-react';

export function AuthModal() {
  const { isAuthModalOpen, setIsAuthModalOpen, setUser, setToken } = useAppStore();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setError('Please provide your name.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'signup') {
        const res = await register({
          name: name.trim(),
          email: email.trim(),
          password,
        });
        setToken(res.access_token);
        setUser(res.user);
      } else {
        const res = await login({
          email: email.trim(),
          password,
        });
        setToken(res.access_token);
        setUser(res.user);
      }
      // Reset form & close modal
      setName('');
      setEmail('');
      setPassword('');
      setError(null);
      setIsAuthModalOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setError(null);
    setMode((prev) => (prev === 'login' ? 'signup' : 'login'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div
        className="absolute inset-0"
        onClick={() => !loading && setIsAuthModalOpen(false)}
      />

      {/* Modal Dialog Card (White Theme) */}
      <div className="relative w-full max-w-[420px] bg-white text-gray-900 rounded-3xl p-7 sm:p-8 shadow-2xl border border-gray-200 z-10 transition-all">
        {/* Close Button */}
        <button
          onClick={() => setIsAuthModalOpen(false)}
          disabled={loading}
          className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center pt-2 pb-6">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            Log in or sign up
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-2 px-2 leading-relaxed">
            You&apos;ll get smarter responses and can upload files, images, and more.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs leading-relaxed">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-xs placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-full bg-[#F3F3F3] hover:bg-[#E5E5E5] text-gray-900 border border-gray-200 font-semibold text-xs transition-colors flex items-center justify-center space-x-2 shadow-xs cursor-pointer disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-700" />}
            <span>
              {loading
                ? mode === 'signup'
                  ? 'Creating account...'
                  : 'Signing in...'
                : 'Continue'}
            </span>
          </button>
        </form>

        {/* Toggle Mode Switch */}
        <div className="mt-6 text-center text-xs text-gray-500">
          {mode === 'login' ? (
            <span>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={toggleMode}
                className="text-[#202123] font-semibold hover:underline cursor-pointer ml-1"
              >
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={toggleMode}
                className="text-[#202123] font-semibold hover:underline cursor-pointer ml-1"
              >
                Log in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
