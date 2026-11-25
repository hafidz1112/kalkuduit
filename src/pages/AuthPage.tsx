import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wallet, Lock, Mail, User as UserIcon, ArrowRight } from 'lucide-react';

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
    <div className="h-[100dvh] overflow-hidden bg-[#F3F1EC] flex justify-center">
      <div className="w-full max-w-[440px] h-[100dvh] overflow-hidden bg-[#113829] text-white flex flex-col justify-start gap-4 px-4 pt-4 pb-8 sm:shadow-2xl">
        {/* Top Hero Branding (Screen 1 Aesthetic) */}
        <div className="space-y-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15">
              <Wallet className="w-3.5 h-3.5 text-[#B8DEC4]" />
              <span className="text-xs font-bold tracking-tight text-white">KalkuDuit</span>
            </div>
            <span className="text-[11px] font-semibold text-[#B8DEC4]">
              Mobile Finance
            </span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-extrabold tracking-tight leading-[1.15] text-white">
              Atur Uang,{' '}
              <span className="text-[#B8DEC4]">Lebih Tenang.</span>
            </h1>
            <p className="text-[11px] text-[#C8DFCE] leading-snug max-w-[300px]">
              Catat pemasukan, bagi pos mingguan & bulanan otomatis, dan pantau tabungan dalam satu genggaman.
            </p>
          </div>
        </div>

        {/* Bottom Auth Card */}
        <div className="p-4 rounded-[24px] bg-[#FAF8F5] text-[#14221C] shadow-2xl space-y-2.5 shrink-0">
          {/* Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#EAE9E1] rounded-2xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`py-2 rounded-xl transition-all ${
                mode === 'login'
                  ? 'bg-[#113829] text-white shadow-xs'
                  : 'text-[#68736E] hover:text-[#14221C]'
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
              className={`py-2 rounded-xl transition-all ${
                mode === 'register'
                  ? 'bg-[#113829] text-white shadow-xs'
                  : 'text-[#68736E] hover:text-[#14221C]'
              }`}
            >
              Daftar Akun
            </button>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-bold text-[#4B5852] mb-0.5">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 text-[#7C8580] absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama Anda"
                    className="w-full pl-9 pr-3.5 py-2 text-xs font-medium rounded-2xl border border-[#E1E0D8] bg-white focus:outline-none focus:border-[#113829]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-[#4B5852] mb-0.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[#7C8580] absolute left-3.5 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-9 pr-3.5 py-2 text-xs font-medium rounded-2xl border border-[#E1E0D8] bg-white focus:outline-none focus:border-[#113829]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#4B5852] mb-0.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#7C8580] absolute left-3.5 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2 text-xs font-medium rounded-2xl border border-[#E1E0D8] bg-white focus:outline-none focus:border-[#113829]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-full text-xs font-bold text-white bg-[#113829] hover:bg-[#0D2D20] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-md shadow-[#113829]/20"
            >
              <span>{isSubmitting ? 'Memproses...' : mode === 'login' ? 'Masuk Sekarang' : 'Buat Akun Baru'}</span>
              {!isSubmitting && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="pt-2 border-t border-[#E6E5DD]">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isSubmitting}
              className="w-full py-2 px-3 rounded-full text-xs font-bold text-[#113829] bg-[#E8EDE4] hover:bg-[#DCE4D7] transition-colors"
            >
              Coba Akun Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
