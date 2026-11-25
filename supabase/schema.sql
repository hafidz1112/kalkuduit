-- ==========================================================
-- SKEMA DATABASE SUPABASE (POSTGRESQL) - KALKUDUIT
-- Jalankan script ini di Supabase Dashboard -> SQL Editor
-- ==========================================================

-- 1. Tabel Users
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar TEXT,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabel Needs (Pos Kebutuhan & Tabungan)
CREATE TABLE IF NOT EXISTS public.needs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fixed', 'flexible')),
  allocation_mode TEXT CHECK (allocation_mode IN ('nominal', 'percent_income', 'percent_remainder')),
  priority TEXT NOT NULL CHECK (priority IN ('wajib', 'penting', 'keinginan')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('weekly', 'monthly')),
  target_amount NUMERIC NOT NULL DEFAULT 0,
  percentage NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  icon TEXT DEFAULT 'Tag',
  color TEXT DEFAULT '#10b981',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabel Weekly / Monthly Periods (Periode Keuangan & Target Pemasukan)
CREATE TABLE IF NOT EXISTS public.weekly_periods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  label TEXT NOT NULL,
  total_income_target NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  UNIQUE (user_id, start_date, end_date)
);

-- 4. Tabel Transactions (Pemasukan & Pengeluaran)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period_id TEXT REFERENCES public.weekly_periods(id) ON DELETE SET NULL,
  need_id TEXT REFERENCES public.needs(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  date DATE NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tabel Sessions (Token Login)
CREATE TABLE IF NOT EXISTS public.sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL
);

-- Indexes untuk query cepat per user & tanggal
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_needs_user_id ON public.needs (user_id);
CREATE INDEX IF NOT EXISTS idx_periods_user_dates ON public.weekly_periods (user_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions (user_id);

-- Aktifkan Row Level Security (RLS) agar tabel tidak terbuka bebas lewat anon key publik.
-- Backend Express mengakses menggunakan SUPABASE_SERVICE_ROLE_KEY yang aman di server.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
