import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wallet, Lock, Mail, User as UserIcon } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, register, loginAsDemo } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email dan kata sandi wajib diisi.');
      return;
    }

    if (mode === 'register' && !name) {
      setError('Nama lengkap wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal masuk.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await loginAsDemo();
    } catch (err: any) {
      setError(err.message || 'Gagal masuk akun demo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 text-white shadow-md mb-1">
            <Wallet className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            KalkuDuit
          </h1>
          <p className="text-xs text-slate-500">
            Pengatur Keuangan Mingguan Adaptif
          </p>
        </div>

        {/* Auth Card */}
        <div className="p-6 sm:p-7 rounded-3xl bg-white shadow-xs border border-slate-200 space-y-5">
          {/* Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Daftar Akun
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama Anda"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Buat Akun'}
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isSubmitting}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Masuk Akun Demo (Fadhil Pratama)
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-1.5">
              Data contoh pos kebutuhan dan transaksi pekan ini sudah terpasang.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
