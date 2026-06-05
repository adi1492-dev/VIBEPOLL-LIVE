import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onCancel: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onCancel }) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('vibepoll_admin_token', data.token);
        onLoginSuccess();
      } else {
        setError(data.error || 'Invalid password');
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
          <h2 className="text-2xl font-black text-white tracking-tight">Admin Login</h2>
          <p className="text-slate-400 text-xs mt-1">Authenticate to manage your live polls</p>
        </div>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-semibold text-center">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xxs font-bold text-slate-400 uppercase tracking-widest">
            Administrator Password
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
          disabled={isLoading || !password}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <UserCheck className="w-4 h-4" />
              Access Dashboard
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
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
