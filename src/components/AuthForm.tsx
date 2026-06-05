import React, { useState } from 'react';
import { Lock, Mail, UserCheck, UserPlus, ShieldCheck } from 'lucide-react';

interface AuthFormProps {
  onAuthSuccess: (user: any) => void;
  onCancel: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onAuthSuccess, onCancel }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('vibepoll_admin_token', data.token);
        onAuthSuccess(data.user);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-2xl backdrop-blur-xl mt-12 animate-fade-in">
      <div className="text-center space-y-4 mb-8">
        <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20">
          <ShieldCheck className="w-8 h-8 text-white stroke-[2]" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {isLogin ? 'Log in to manage your polls' : 'Register to start building live polls'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-semibold text-center">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xxs font-bold text-slate-400 uppercase tracking-widest pl-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-slate-950/50 border border-slate-800 text-slate-200 text-sm rounded-xl py-3.5 pl-10 pr-4 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xxs font-bold text-slate-400 uppercase tracking-widest pl-1">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              className="w-full bg-slate-950/50 border border-slate-800 text-slate-200 text-sm rounded-xl py-3.5 pl-10 pr-4 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !password || !email}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 mt-2"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
          ) : isLogin ? (
            <>
              <UserCheck className="w-4 h-4" />
              Log In
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Sign Up
            </>
          )}
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-4">
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer"
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>

        <button
          onClick={onCancel}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
        >
          ← Return to Landing Page
        </button>
      </div>
    </div>
  );
};
