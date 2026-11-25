-- ==========================================================
-- SKEMA DATABASE TURSO (SQLITE / LIBSQL) - KALKUDUIT
-- Catatan: Aplikasi juga otomatis menjalankan CREATE TABLE IF NOT EXISTS saat start,
-- atau Anda bisa jalankan manual via: turso db shell <nama-db> < turso/schema.sql
-- ==========================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar TEXT,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS needs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fixed', 'flexible')),
  allocation_mode TEXT CHECK (allocation_mode IN ('nominal', 'percent_income', 'percent_remainder')),
  priority TEXT NOT NULL CHECK (priority IN ('wajib', 'penting', 'keinginan')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('weekly', 'monthly')),
  target_amount REAL NOT NULL DEFAULT 0,
  percentage REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  icon TEXT DEFAULT 'Tag',
  color TEXT DEFAULT '#113829',
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weekly_periods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  label TEXT NOT NULL,
  total_income_target REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  UNIQUE (user_id, start_date, end_date)
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_id TEXT REFERENCES weekly_periods(id) ON DELETE SET NULL,
  need_id TEXT REFERENCES needs(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount REAL NOT NULL CHECK (amount >= 0),
  date TEXT NOT NULL,
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_needs_user_id ON needs (user_id);
CREATE INDEX IF NOT EXISTS idx_periods_user_dates ON weekly_periods (user_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
