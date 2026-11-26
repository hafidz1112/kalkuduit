import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Wallet, Lock, Mail, User as UserIcon, ArrowRight, Loader2, Sparkles } from 'lucide-react';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number;
              locale?: string;
            }
          ) => void;
          disableAutoSelect?: () => void;
        };
      };
    };
  }
}

export const AuthPage: React.FC = () => {
  const { login, register, loginWithGoogle, loginAsDemo } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [googleClientId, setGoogleClientId] = useState<string>(
    ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || ''
  );
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(!googleClientId);
  const [isGsiReady, setIsGsiReady] = useState<boolean>(false);

  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const loginWithGoogleRef = useRef(loginWithGoogle);
  loginWithGoogleRef.current = loginWithGoogle;

  // Fetch client ID from server runtime config if not provided at Vite build time
  useEffect(() => {
    if (googleClientId) {
      setIsLoadingConfig(false);
      return;
    }

    let cancelled = false;
    api
      .getAuthConfig()
      .then((cfg) => {
        if (!cancelled && cfg.googleClientId) {
          setGoogleClientId(cfg.googleClientId);
        }
      })
      .catch(() => {
        // Ignore; handled cleanly in UI
      })
      .finally(() => {
        if (!cancelled) setIsLoadingConfig(false);
      });

    return () => {
      cancelled = true;
    };
  }, [googleClientId]);

  // Initialize and render Google Sign-In button once GSI script & client ID are ready
  useEffect(() => {
    if (!googleClientId) return;

    let attempts = 0;
    const maxAttempts = 60;

    const tryInitGoogle = () => {
      const gsi = window.google?.accounts?.id;
      const container = googleBtnRef.current;
      if (!gsi || !container) return false;

      gsi.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response?.credential) {
            setError('Login Google dibatalkan atau token tidak diterima.');
            return;
          }
          setIsSubmitting(true);
          setError('');
          try {
            await loginWithGoogleRef.current(response.credential);
          } catch (err: any) {
            setError(err?.message || 'Gagal masuk dengan Google.');
            setIsSubmitting(false);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      container.innerHTML = '';
      const width = Math.min(360, Math.max(240, container.clientWidth || 320));
      gsi.renderButton(container, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'center',
        width,
        locale: 'id',
      });

      setIsGsiReady(true);
      return true;
    };

    if (tryInitGoogle()) return;

    const timer = window.setInterval(() => {
      attempts += 1;
      if (tryInitGoogle() || attempts >= maxAttempts) {
        window.clearInterval(timer);
      }
    }, 150);

    return () => window.clearInterval(timer);
  }, [googleClientId]);

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
      setError(err?.message || 'Gagal masuk.');
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await loginAsDemo();
    } catch (err: any) {
      setError(err?.message || 'Gagal masuk akun demo.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#F3F1EC] flex justify-center">
      <div className="w-full max-w-[440px] min-h-[100dvh] bg-[#113829] text-white flex flex-col justify-between gap-4 px-4 pt-4 pb-6 sm:shadow-2xl overflow-y-auto">
        {/* Top Hero Branding */}
        <div className="space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15">
              <Wallet className="w-3.5 h-3.5 text-[#B8DEC4]" />
              <span className="text-xs font-bold tracking-tight text-white">KalkuDuit</span>
            </div>
            <span className="text-[11px] font-semibold text-[#B8DEC4]">
              Mobile Finance
            </span>
          </div>

          <div className="space-y-1">
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
        <div className="p-4 rounded-[24px] bg-[#FAF8F5] text-[#14221C] shadow-2xl space-y-3 shrink-0">
          {/* Tabs Manual: Masuk / Daftar Akun */}
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

          {/* Manual Email/Password Form */}
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

          {/* Divider */}
          <div className="flex items-center gap-2.5">
            <div className="h-px flex-1 bg-[#E6E5DD]" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E9691]">
              atau
            </span>
            <div className="h-px flex-1 bg-[#E6E5DD]" />
          </div>

          {/* Google Sign-In + Demo */}
          <div className="space-y-2">
            {isLoadingConfig ? (
              <div className="h-10 rounded-full bg-[#EAE9E1] flex items-center justify-center gap-2 text-xs font-semibold text-[#5C6660]">
                <Loader2 className="w-4 h-4 animate-spin text-[#113829]" />
                <span>Menyiapkan login Google...</span>
              </div>
            ) : googleClientId ? (
              <div className="relative flex flex-col items-center">
                {!isGsiReady && (
                  <div className="w-full h-10 rounded-full border border-[#E1E0D8] bg-white flex items-center justify-center gap-2 text-xs font-semibold text-[#5C6660]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#113829]" />
                    <span>Memuat tombol Google...</span>
                  </div>
                )}
                <div
                  ref={googleBtnRef}
                  className={`w-full flex justify-center ${!isGsiReady ? 'hidden' : ''} ${
                    isSubmitting ? 'pointer-events-none opacity-60' : ''
                  }`}
                />
              </div>
            ) : (
              <p className="text-[10px] text-center text-[#8E9691]">
                Login Google belum aktif (`GOOGLE_CLIENT_ID` belum diset).
              </p>
            )}

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isSubmitting}
              className="w-full py-2 px-3 rounded-full text-xs font-bold text-[#113829] bg-[#E8EDE4] hover:bg-[#DCE4D7] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Coba Akun Demo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
