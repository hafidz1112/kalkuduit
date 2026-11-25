import { Need, Transaction, User, WeeklyPeriod } from '../types';
import {
  readDb,
  writeDb,
  getDefaultSeedData,
  getRecommendedTemplateNeeds,
  resetUserData as resetJsonUserData,
  loadTemplateData as loadJsonTemplateData,
} from './db';
import { getDatabaseConfig } from './env';
import { createSupabaseClient, SupabaseClient, SupabaseFilter } from './supabase';
import { createTursoClient, TursoClient, TursoParam } from './turso';

export type StoredUser = User & { password_hash: string };
export type DatabaseMode = 'turso' | 'supabase' | 'local-json';

export interface SessionRecord {
  token: string;
  user_id: string;
  expires_at: number;
}

export interface TransactionFilterParams {
  period_id?: string;
  need_id?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
}

export interface DatabaseRepository {
  getMode(): DatabaseMode;
  checkHealth(): Promise<{ ok: boolean; database: DatabaseMode; detail?: string }>;

  findUserById(id: string): Promise<StoredUser | null>;
  findUserByEmail(email: string): Promise<StoredUser | null>;
  getFallbackDemoUser(): Promise<StoredUser | null>;
  createUser(user: StoredUser): Promise<StoredUser>;

  findValidSession(token: string): Promise<SessionRecord | null>;
  createSession(session: SessionRecord): Promise<void>;

  getNeedsByUser(userId: string): Promise<Need[]>;
  createNeed(need: Need): Promise<Need>;
  updateNeed(id: string, userId: string, patch: Partial<Need>): Promise<Need | null>;
  deleteNeed(id: string, userId: string): Promise<boolean>;

  getTransactionsByUser(userId: string, filters?: TransactionFilterParams): Promise<Transaction[]>;
  createTransaction(tx: Transaction): Promise<Transaction>;
  updateTransaction(id: string, userId: string, patch: Partial<Transaction>): Promise<Transaction | null>;
  deleteTransaction(id: string, userId: string): Promise<boolean>;

  getPeriodsByUser(userId: string): Promise<WeeklyPeriod[]>;
  createOrGetPeriod(period: WeeklyPeriod): Promise<WeeklyPeriod>;
  updatePeriod(id: string, userId: string, patch: Partial<WeeklyPeriod>): Promise<WeeklyPeriod | null>;

  resetUserData(userId: string): Promise<void>;
  loadTemplateData(userId: string): Promise<Need[]>;
}

// --- LOCAL JSON REPOSITORY ---

class JsonDatabaseRepository implements DatabaseRepository {
  getMode(): 'local-json' {
    return 'local-json';
  }

  async checkHealth() {
    if (process.env.VERCEL) {
      return {
        ok: false,
        database: 'local-json' as const,
        detail: 'TURSO_DATABASE_URL atau TURSO_AUTH_TOKEN belum terbaca di environment Vercel.',
      };
    }
    readDb();
    return { ok: true, database: 'local-json' as const };
  }

  async findUserById(id: string): Promise<StoredUser | null> {
    const db = readDb();
    return db.users.find((u) => u.id === id) || null;
  }

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    const db = readDb();
    return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async getFallbackDemoUser(): Promise<StoredUser | null> {
    const db = readDb();
    return db.users[0] || null;
  }

  async createUser(user: StoredUser): Promise<StoredUser> {
    if (process.env.VERCEL) {
      throw new Error(
        'Database Turso belum aktif di Vercel. Pastikan TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN sudah diset di Vercel Environment Variables lalu Redeploy.'
      );
    }
    const db = readDb();
    db.users.push(user);
    writeDb(db);
    return user;
  }

  async findValidSession(token: string): Promise<SessionRecord | null> {
    const db = readDb();
    return db.sessions.find((s) => s.token === token && s.expires_at > Date.now()) || null;
  }

  async createSession(session: SessionRecord): Promise<void> {
    const db = readDb();
    db.sessions.push(session);
    writeDb(db);
  }

  async getNeedsByUser(userId: string): Promise<Need[]> {
    const db = readDb();
    return db.needs.filter((n) => n.user_id === userId);
  }

  async createNeed(need: Need): Promise<Need> {
    const db = readDb();
    db.needs.push(need);
    writeDb(db);
    return need;
  }

  async updateNeed(id: string, userId: string, patch: Partial<Need>): Promise<Need | null> {
    const db = readDb();
    const index = db.needs.findIndex((n) => n.id === id && n.user_id === userId);
    if (index === -1) return null;
    const updated: Need = {
      ...db.needs[index],
      ...patch,
      id,
      user_id: userId,
    };
    db.needs[index] = updated;
    writeDb(db);
    return updated;
  }

  async deleteNeed(id: string, userId: string): Promise<boolean> {
    const db = readDb();
    const initialLen = db.needs.length;
    db.needs = db.needs.filter((n) => !(n.id === id && n.user_id === userId));
    if (db.needs.length === initialLen) return false;
    writeDb(db);
    return true;
  }

  async getTransactionsByUser(userId: string, filters?: TransactionFilterParams): Promise<Transaction[]> {
    const db = readDb();
    let list = db.transactions.filter((t) => t.user_id === userId);

    if (filters?.period_id) list = list.filter((t) => t.period_id === filters.period_id);
    if (filters?.need_id) list = list.filter((t) => t.need_id === filters.need_id);
    if (filters?.type) list = list.filter((t) => t.type === filters.type);
    if (filters?.start_date && filters?.end_date) {
      list = list.filter((t) => t.date >= filters.start_date! && t.date <= filters.end_date!);
    }

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }

  async createTransaction(tx: Transaction): Promise<Transaction> {
    const db = readDb();
    db.transactions.push(tx);
    writeDb(db);
    return tx;
  }

  async updateTransaction(id: string, userId: string, patch: Partial<Transaction>): Promise<Transaction | null> {
    const db = readDb();
    const index = db.transactions.findIndex((t) => t.id === id && t.user_id === userId);
    if (index === -1) return null;
    const updated: Transaction = {
      ...db.transactions[index],
      ...patch,
      id,
      user_id: userId,
      amount: Number(patch.amount ?? db.transactions[index].amount),
    };
    db.transactions[index] = updated;
    writeDb(db);
    return updated;
  }

  async deleteTransaction(id: string, userId: string): Promise<boolean> {
    const db = readDb();
    const initialLen = db.transactions.length;
    db.transactions = db.transactions.filter((t) => !(t.id === id && t.user_id === userId));
    if (db.transactions.length === initialLen) return false;
    writeDb(db);
    return true;
  }

  async getPeriodsByUser(userId: string): Promise<WeeklyPeriod[]> {
    const db = readDb();
    return db.weekly_periods.filter((p) => p.user_id === userId);
  }

  async createOrGetPeriod(period: WeeklyPeriod): Promise<WeeklyPeriod> {
    const db = readDb();
    const existing = db.weekly_periods.find(
      (p) =>
        p.user_id === period.user_id &&
        p.start_date === period.start_date &&
        p.end_date === period.end_date
    );
    if (existing) return existing;

    db.weekly_periods.push(period);
    writeDb(db);
    return period;
  }

  async updatePeriod(id: string, userId: string, patch: Partial<WeeklyPeriod>): Promise<WeeklyPeriod | null> {
    const db = readDb();
    const index = db.weekly_periods.findIndex((p) => p.id === id && p.user_id === userId);
    if (index === -1) return null;
    const updated: WeeklyPeriod = {
      ...db.weekly_periods[index],
      ...(patch.total_income_target !== undefined && {
        total_income_target: Number(patch.total_income_target) || 0,
      }),
      ...(patch.notes !== undefined && { notes: patch.notes }),
      id,
      user_id: userId,
    };
    db.weekly_periods[index] = updated;
    writeDb(db);
    return updated;
  }

  async resetUserData(userId: string): Promise<void> {
    resetJsonUserData(userId);
  }

  async loadTemplateData(userId: string): Promise<Need[]> {
    return loadJsonTemplateData(userId);
  }
}

// --- SUPABASE REPOSITORY ---

function mapNeedRow(row: any): Need {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    type: row.type,
    allocation_mode: row.allocation_mode || undefined,
    priority: row.priority,
    billing_cycle: row.billing_cycle,
    target_amount: Number(row.target_amount) || 0,
    percentage: Number(row.percentage) || 0,
    is_active: Boolean(row.is_active),
    icon: row.icon || undefined,
    color: row.color || undefined,
    note: row.note || '',
    created_at: String(row.created_at),
  };
}

function mapPeriodRow(row: any): WeeklyPeriod {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    start_date: String(row.start_date),
    end_date: String(row.end_date),
    label: String(row.label),
    total_income_target: Number(row.total_income_target) || 0,
    notes: row.notes || '',
  };
}

function mapTransactionRow(row: any): Transaction {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    period_id: row.period_id || undefined,
    need_id: row.need_id ?? null,
    type: row.type,
    amount: Number(row.amount) || 0,
    date: String(row.date),
    note: row.note || '',
    created_at: String(row.created_at),
  };
}

class SupabaseDatabaseRepository implements DatabaseRepository {
  constructor(private readonly client: SupabaseClient) {}

  getMode(): 'supabase' {
    return 'supabase';
  }

  async checkHealth() {
    try {
      await this.client.select('users', [], { select: 'id', limit: 1 });
      return { ok: true, database: 'supabase' as const };
    } catch (err: any) {
      return { ok: false, database: 'supabase' as const, detail: err.message };
    }
  }

  private async ensureDemoUserExists(): Promise<StoredUser | null> {
    const seed = getDefaultSeedData();
    const demo = seed.users[0];
    if (!demo) return null;

    const rows = await this.client.upsert<StoredUser>(
      'users',
      {
        id: demo.id,
        name: demo.name,
        email: demo.email.toLowerCase(),
        avatar: demo.avatar || null,
        password_hash: demo.password_hash,
        created_at: demo.created_at,
      },
      'email'
    );
    return rows[0] || demo;
  }

  async findUserById(id: string): Promise<StoredUser | null> {
    const rows = await this.client.select<StoredUser>(
      'users',
      [{ column: 'id', op: 'eq', value: id }],
      { limit: 1 }
    );
    return rows[0] || null;
  }

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    const cleanEmail = email.toLowerCase();
    const rows = await this.client.select<StoredUser>(
      'users',
      [{ column: 'email', op: 'ilike', value: cleanEmail }],
      { limit: 1 }
    );
    if (rows[0]) return rows[0];

    if (cleanEmail === 'demo@kalkuduit.id') {
      return this.ensureDemoUserExists();
    }
    return null;
  }

  async getFallbackDemoUser(): Promise<StoredUser | null> {
    const rows = await this.client.select<StoredUser>('users', [], {
      order: 'created_at.asc',
      limit: 1,
    });
    if (rows[0]) return rows[0];
    return this.ensureDemoUserExists();
  }

  async createUser(user: StoredUser): Promise<StoredUser> {
    const rows = await this.client.insert<StoredUser>('users', {
      id: user.id,
      name: user.name,
      email: user.email.toLowerCase(),
      avatar: user.avatar || null,
      password_hash: user.password_hash,
      created_at: user.created_at,
    });
    return rows[0] || user;
  }

  async findValidSession(token: string): Promise<SessionRecord | null> {
    const rows = await this.client.select<any>(
      'sessions',
      [
        { column: 'token', op: 'eq', value: token },
        { column: 'expires_at', op: 'gt', value: Date.now() },
      ],
      { limit: 1 }
    );
    if (!rows[0]) return null;
    return {
      token: String(rows[0].token),
      user_id: String(rows[0].user_id),
      expires_at: Number(rows[0].expires_at),
    };
  }

  async createSession(session: SessionRecord): Promise<void> {
    await this.client.insert('sessions', {
      token: session.token,
      user_id: session.user_id,
      expires_at: session.expires_at,
    });
  }

  async getNeedsByUser(userId: string): Promise<Need[]> {
    const rows = await this.client.select<any>(
      'needs',
      [{ column: 'user_id', op: 'eq', value: userId }],
      { order: 'created_at.asc' }
    );
    return rows.map(mapNeedRow);
  }

  async createNeed(need: Need): Promise<Need> {
    const rows = await this.client.insert<any>('needs', {
      id: need.id,
      user_id: need.user_id,
      name: need.name,
      type: need.type,
      allocation_mode: need.allocation_mode || 'nominal',
      priority: need.priority,
      billing_cycle: need.billing_cycle,
      target_amount: Number(need.target_amount) || 0,
      percentage: Number(need.percentage) || 0,
      is_active: Boolean(need.is_active),
      icon: need.icon || 'Tag',
      color: need.color || '#10b981',
      note: need.note || '',
      created_at: need.created_at,
    });
    return mapNeedRow(rows[0] || need);
  }

  async updateNeed(id: string, userId: string, patch: Partial<Need>): Promise<Need | null> {
    const cleanPatch: Record<string, unknown> = { ...patch };
    delete cleanPatch.id;
    delete cleanPatch.user_id;

    const rows = await this.client.update<any>(
      'needs',
      [
        { column: 'id', op: 'eq', value: id },
        { column: 'user_id', op: 'eq', value: userId },
      ],
      cleanPatch
    );
    return rows[0] ? mapNeedRow(rows[0]) : null;
  }

  async deleteNeed(id: string, userId: string): Promise<boolean> {
    const existing = await this.client.select<any>(
      'needs',
      [
        { column: 'id', op: 'eq', value: id },
        { column: 'user_id', op: 'eq', value: userId },
      ],
      { select: 'id', limit: 1 }
    );
    if (existing.length === 0) return false;

    await this.client.remove('needs', [
      { column: 'id', op: 'eq', value: id },
      { column: 'user_id', op: 'eq', value: userId },
    ]);
    return true;
  }

  async getTransactionsByUser(userId: string, filters?: TransactionFilterParams): Promise<Transaction[]> {
    const queryFilters: SupabaseFilter[] = [{ column: 'user_id', op: 'eq', value: userId }];

    if (filters?.period_id) queryFilters.push({ column: 'period_id', op: 'eq', value: filters.period_id });
    if (filters?.need_id) queryFilters.push({ column: 'need_id', op: 'eq', value: filters.need_id });
    if (filters?.type) queryFilters.push({ column: 'type', op: 'eq', value: filters.type });
    if (filters?.start_date) queryFilters.push({ column: 'date', op: 'gte', value: filters.start_date });
    if (filters?.end_date) queryFilters.push({ column: 'date', op: 'lte', value: filters.end_date });

    const rows = await this.client.select<any>('transactions', queryFilters, {
      order: 'date.desc,created_at.desc',
    });
    return rows.map(mapTransactionRow);
  }

  async createTransaction(tx: Transaction): Promise<Transaction> {
    const rows = await this.client.insert<any>('transactions', {
      id: tx.id,
      user_id: tx.user_id,
      period_id: tx.period_id || null,
      need_id: tx.need_id || null,
      type: tx.type,
      amount: Number(tx.amount) || 0,
      date: tx.date,
      note: tx.note || '',
      created_at: tx.created_at,
    });
    return mapTransactionRow(rows[0] || tx);
  }

  async updateTransaction(id: string, userId: string, patch: Partial<Transaction>): Promise<Transaction | null> {
    const cleanPatch: Record<string, unknown> = { ...patch };
    delete cleanPatch.id;
    delete cleanPatch.user_id;
    if (cleanPatch.period_id === undefined) delete cleanPatch.period_id;

    const rows = await this.client.update<any>(
      'transactions',
      [
        { column: 'id', op: 'eq', value: id },
        { column: 'user_id', op: 'eq', value: userId },
      ],
      cleanPatch
    );
    return rows[0] ? mapTransactionRow(rows[0]) : null;
  }

  async deleteTransaction(id: string, userId: string): Promise<boolean> {
    const existing = await this.client.select<any>(
      'transactions',
      [
        { column: 'id', op: 'eq', value: id },
        { column: 'user_id', op: 'eq', value: userId },
      ],
      { select: 'id', limit: 1 }
    );
    if (existing.length === 0) return false;

    await this.client.remove('transactions', [
      { column: 'id', op: 'eq', value: id },
      { column: 'user_id', op: 'eq', value: userId },
    ]);
    return true;
  }

  async getPeriodsByUser(userId: string): Promise<WeeklyPeriod[]> {
    const rows = await this.client.select<any>(
      'weekly_periods',
      [{ column: 'user_id', op: 'eq', value: userId }],
      { order: 'start_date.asc' }
    );
    return rows.map(mapPeriodRow);
  }

  async createOrGetPeriod(period: WeeklyPeriod): Promise<WeeklyPeriod> {
    const existing = await this.client.select<any>(
      'weekly_periods',
      [
        { column: 'user_id', op: 'eq', value: period.user_id },
        { column: 'start_date', op: 'eq', value: period.start_date },
        { column: 'end_date', op: 'eq', value: period.end_date },
      ],
      { limit: 1 }
    );
    if (existing[0]) return mapPeriodRow(existing[0]);

    try {
      const rows = await this.client.insert<any>('weekly_periods', {
        id: period.id,
        user_id: period.user_id,
        start_date: period.start_date,
        end_date: period.end_date,
        label: period.label,
        total_income_target: Number(period.total_income_target) || 0,
        notes: period.notes || '',
      });
      return mapPeriodRow(rows[0] || period);
    } catch {
      const retry = await this.client.select<any>(
        'weekly_periods',
        [
          { column: 'user_id', op: 'eq', value: period.user_id },
          { column: 'start_date', op: 'eq', value: period.start_date },
          { column: 'end_date', op: 'eq', value: period.end_date },
        ],
        { limit: 1 }
      );
      if (retry[0]) return mapPeriodRow(retry[0]);
      throw new Error('Gagal membuat periode keuangan.');
    }
  }

  async updatePeriod(id: string, userId: string, patch: Partial<WeeklyPeriod>): Promise<WeeklyPeriod | null> {
    const cleanPatch: Record<string, unknown> = {};
    if (patch.total_income_target !== undefined) {
      cleanPatch.total_income_target = Number(patch.total_income_target) || 0;
    }
    if (patch.notes !== undefined) {
      cleanPatch.notes = patch.notes;
    }

    const rows = await this.client.update<any>(
      'weekly_periods',
      [
        { column: 'id', op: 'eq', value: id },
        { column: 'user_id', op: 'eq', value: userId },
      ],
      cleanPatch
    );
    return rows[0] ? mapPeriodRow(rows[0]) : null;
  }

  async resetUserData(userId: string): Promise<void> {
    await this.client.remove('transactions', [{ column: 'user_id', op: 'eq', value: userId }]);
    await this.client.remove('needs', [{ column: 'user_id', op: 'eq', value: userId }]);
    await this.client.update(
      'weekly_periods',
      [{ column: 'user_id', op: 'eq', value: userId }],
      { total_income_target: 0 }
    );
  }

  async loadTemplateData(userId: string): Promise<Need[]> {
    await this.client.remove('transactions', [{ column: 'user_id', op: 'eq', value: userId }]);
    await this.client.remove('needs', [{ column: 'user_id', op: 'eq', value: userId }]);

    const templateNeeds = getRecommendedTemplateNeeds(userId);
    const rows = await this.client.insert<any>(
      'needs',
      templateNeeds.map((n) => ({
        id: n.id,
        user_id: n.user_id,
        name: n.name,
        type: n.type,
        allocation_mode: n.allocation_mode || 'nominal',
        priority: n.priority,
        billing_cycle: n.billing_cycle,
        target_amount: Number(n.target_amount) || 0,
        percentage: Number(n.percentage) || 0,
        is_active: Boolean(n.is_active),
        icon: n.icon || 'Tag',
        color: n.color || '#10b981',
        note: n.note || '',
        created_at: n.created_at,
      }))
    );

    await this.client.update(
      'weekly_periods',
      [{ column: 'user_id', op: 'eq', value: userId }],
      { total_income_target: 160000 }
    );

    return rows.map(mapNeedRow);
  }
}

// --- TURSO (LIBSQL) REPOSITORY ---

class TursoDatabaseRepository implements DatabaseRepository {
  private schemaInitialized = false;
  private schemaPromise: Promise<void> | null = null;

  constructor(private readonly client: TursoClient) {}

  getMode(): 'turso' {
    return 'turso';
  }

  private async ensureSchema(): Promise<void> {
    if (this.schemaInitialized) return;
    if (!this.schemaPromise) {
      this.schemaPromise = this.client
        .batch([
          {
            sql: `CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              email TEXT NOT NULL UNIQUE,
              avatar TEXT,
              password_hash TEXT NOT NULL,
              created_at TEXT NOT NULL
            )`,
          },
          {
            sql: `CREATE TABLE IF NOT EXISTS needs (
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
            )`,
          },
          {
            sql: `CREATE TABLE IF NOT EXISTS weekly_periods (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              start_date TEXT NOT NULL,
              end_date TEXT NOT NULL,
              label TEXT NOT NULL,
              total_income_target REAL NOT NULL DEFAULT 0,
              notes TEXT DEFAULT '',
              UNIQUE (user_id, start_date, end_date)
            )`,
          },
          {
            sql: `CREATE TABLE IF NOT EXISTS transactions (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              period_id TEXT REFERENCES weekly_periods(id) ON DELETE SET NULL,
              need_id TEXT REFERENCES needs(id) ON DELETE SET NULL,
              type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
              amount REAL NOT NULL CHECK (amount >= 0),
              date TEXT NOT NULL,
              note TEXT DEFAULT '',
              created_at TEXT NOT NULL
            )`,
          },
          {
            sql: `CREATE TABLE IF NOT EXISTS sessions (
              token TEXT PRIMARY KEY,
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              expires_at INTEGER NOT NULL
            )`,
          },
          { sql: `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)` },
          { sql: `CREATE INDEX IF NOT EXISTS idx_needs_user_id ON needs (user_id)` },
          { sql: `CREATE INDEX IF NOT EXISTS idx_periods_user_dates ON weekly_periods (user_id, start_date, end_date)` },
          { sql: `CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions (user_id, date DESC)` },
          { sql: `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id)` },
        ])
        .then(() => {
          this.schemaInitialized = true;
        })
        .catch((err) => {
          this.schemaPromise = null;
          throw err;
        });
    }
    return this.schemaPromise;
  }

  async checkHealth() {
    try {
      await this.ensureSchema();
      await this.client.execute('SELECT 1');
      return { ok: true, database: 'turso' as const };
    } catch (err: any) {
      return { ok: false, database: 'turso' as const, detail: err.message };
    }
  }

  private async ensureDemoUserExists(): Promise<StoredUser | null> {
    await this.ensureSchema();
    const seed = getDefaultSeedData();
    const demo = seed.users[0];
    if (!demo) return null;

    await this.client.execute(
      `INSERT OR IGNORE INTO users (id, name, email, avatar, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        demo.id,
        demo.name,
        demo.email.toLowerCase(),
        demo.avatar || null,
        demo.password_hash,
        demo.created_at,
      ]
    );
    const { rows } = await this.client.execute<StoredUser>(
      'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [demo.email]
    );
    return rows[0] || demo;
  }

  async findUserById(id: string): Promise<StoredUser | null> {
    await this.ensureSchema();
    const { rows } = await this.client.execute<StoredUser>(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  }

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    await this.ensureSchema();
    const cleanEmail = email.toLowerCase();
    const { rows } = await this.client.execute<StoredUser>(
      'SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1',
      [cleanEmail]
    );
    if (rows[0]) return rows[0];
    if (cleanEmail === 'demo@kalkuduit.id') {
      return this.ensureDemoUserExists();
    }
    return null;
  }

  async getFallbackDemoUser(): Promise<StoredUser | null> {
    await this.ensureSchema();
    const { rows } = await this.client.execute<StoredUser>(
      'SELECT * FROM users ORDER BY created_at ASC LIMIT 1'
    );
    if (rows[0]) return rows[0];
    return this.ensureDemoUserExists();
  }

  async createUser(user: StoredUser): Promise<StoredUser> {
    await this.ensureSchema();
    await this.client.execute(
      `INSERT INTO users (id, name, email, avatar, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.name,
        user.email.toLowerCase(),
        user.avatar || null,
        user.password_hash,
        user.created_at,
      ]
    );
    return user;
  }

  async findValidSession(token: string): Promise<SessionRecord | null> {
    await this.ensureSchema();
    const { rows } = await this.client.execute<any>(
      'SELECT * FROM sessions WHERE token = ? AND expires_at > ? LIMIT 1',
      [token, Date.now()]
    );
    if (!rows[0]) return null;
    return {
      token: String(rows[0].token),
      user_id: String(rows[0].user_id),
      expires_at: Number(rows[0].expires_at),
    };
  }

  async createSession(session: SessionRecord): Promise<void> {
    await this.ensureSchema();
    await this.client.execute(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
      [session.token, session.user_id, session.expires_at]
    );
  }

  async getNeedsByUser(userId: string): Promise<Need[]> {
    await this.ensureSchema();
    const { rows } = await this.client.execute<any>(
      'SELECT * FROM needs WHERE user_id = ? ORDER BY created_at ASC',
      [userId]
    );
    return rows.map(mapNeedRow);
  }

  async createNeed(need: Need): Promise<Need> {
    await this.ensureSchema();
    await this.client.execute(
      `INSERT INTO needs (
        id, user_id, name, type, allocation_mode, priority, billing_cycle,
        target_amount, percentage, is_active, icon, color, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        need.id,
        need.user_id,
        need.name,
        need.type,
        need.allocation_mode || 'nominal',
        need.priority,
        need.billing_cycle,
        Number(need.target_amount) || 0,
        Number(need.percentage) || 0,
        need.is_active ? 1 : 0,
        need.icon || 'Tag',
        need.color || '#113829',
        need.note || '',
        need.created_at,
      ]
    );
    return need;
  }

  async updateNeed(id: string, userId: string, patch: Partial<Need>): Promise<Need | null> {
    await this.ensureSchema();
    const allowed: (keyof Need)[] = [
      'name', 'type', 'allocation_mode', 'priority', 'billing_cycle',
      'target_amount', 'percentage', 'is_active', 'icon', 'color', 'note',
    ];
    const sets: string[] = [];
    const args: TursoParam[] = [];

    for (const key of allowed) {
      if (patch[key] !== undefined) {
        sets.push(`${key} = ?`);
        if (key === 'is_active') {
          args.push(patch[key] ? 1 : 0);
        } else if (key === 'target_amount' || key === 'percentage') {
          args.push(Number(patch[key]) || 0);
        } else {
          args.push(patch[key] as TursoParam);
        }
      }
    }

    if (sets.length > 0) {
      args.push(id, userId);
      await this.client.execute(
        `UPDATE needs SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
        args
      );
    }

    const { rows } = await this.client.execute<any>(
      'SELECT * FROM needs WHERE id = ? AND user_id = ? LIMIT 1',
      [id, userId]
    );
    return rows[0] ? mapNeedRow(rows[0]) : null;
  }

  async deleteNeed(id: string, userId: string): Promise<boolean> {
    await this.ensureSchema();
    const { affectedRowCount } = await this.client.execute(
      'DELETE FROM needs WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return affectedRowCount > 0;
  }

  async getTransactionsByUser(userId: string, filters?: TransactionFilterParams): Promise<Transaction[]> {
    await this.ensureSchema();
    const where: string[] = ['user_id = ?'];
    const args: TursoParam[] = [userId];

    if (filters?.period_id) {
      where.push('period_id = ?');
      args.push(filters.period_id);
    }
    if (filters?.need_id) {
      where.push('need_id = ?');
      args.push(filters.need_id);
    }
    if (filters?.type) {
      where.push('type = ?');
      args.push(filters.type);
    }
    if (filters?.start_date) {
      where.push('date >= ?');
      args.push(filters.start_date);
    }
    if (filters?.end_date) {
      where.push('date <= ?');
      args.push(filters.end_date);
    }

    const { rows } = await this.client.execute<any>(
      `SELECT * FROM transactions WHERE ${where.join(' AND ')} ORDER BY date DESC, created_at DESC`,
      args
    );
    return rows.map(mapTransactionRow);
  }

  async createTransaction(tx: Transaction): Promise<Transaction> {
    await this.ensureSchema();
    await this.client.execute(
      `INSERT INTO transactions (id, user_id, period_id, need_id, type, amount, date, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tx.id,
        tx.user_id,
        tx.period_id || null,
        tx.need_id || null,
        tx.type,
        Number(tx.amount) || 0,
        tx.date,
        tx.note || '',
        tx.created_at,
      ]
    );
    return tx;
  }

  async updateTransaction(id: string, userId: string, patch: Partial<Transaction>): Promise<Transaction | null> {
    await this.ensureSchema();
    const allowed: (keyof Transaction)[] = ['period_id', 'need_id', 'type', 'amount', 'date', 'note'];
    const sets: string[] = [];
    const args: TursoParam[] = [];

    for (const key of allowed) {
      if (patch[key] !== undefined) {
        sets.push(`${key} = ?`);
        if (key === 'amount') {
          args.push(Number(patch[key]) || 0);
        } else {
          args.push((patch[key] ?? null) as TursoParam);
        }
      }
    }

    if (sets.length > 0) {
      args.push(id, userId);
      await this.client.execute(
        `UPDATE transactions SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
        args
      );
    }

    const { rows } = await this.client.execute<any>(
      'SELECT * FROM transactions WHERE id = ? AND user_id = ? LIMIT 1',
      [id, userId]
    );
    return rows[0] ? mapTransactionRow(rows[0]) : null;
  }

  async deleteTransaction(id: string, userId: string): Promise<boolean> {
    await this.ensureSchema();
    const { affectedRowCount } = await this.client.execute(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return affectedRowCount > 0;
  }

  async getPeriodsByUser(userId: string): Promise<WeeklyPeriod[]> {
    await this.ensureSchema();
    const { rows } = await this.client.execute<any>(
      'SELECT * FROM weekly_periods WHERE user_id = ? ORDER BY start_date ASC',
      [userId]
    );
    return rows.map(mapPeriodRow);
  }

  async createOrGetPeriod(period: WeeklyPeriod): Promise<WeeklyPeriod> {
    await this.ensureSchema();
    const { rows: existing } = await this.client.execute<any>(
      'SELECT * FROM weekly_periods WHERE user_id = ? AND start_date = ? AND end_date = ? LIMIT 1',
      [period.user_id, period.start_date, period.end_date]
    );
    if (existing[0]) return mapPeriodRow(existing[0]);

    await this.client.execute(
      `INSERT OR IGNORE INTO weekly_periods (id, user_id, start_date, end_date, label, total_income_target, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        period.id,
        period.user_id,
        period.start_date,
        period.end_date,
        period.label,
        Number(period.total_income_target) || 0,
        period.notes || '',
      ]
    );

    const { rows: saved } = await this.client.execute<any>(
      'SELECT * FROM weekly_periods WHERE user_id = ? AND start_date = ? AND end_date = ? LIMIT 1',
      [period.user_id, period.start_date, period.end_date]
    );
    return saved[0] ? mapPeriodRow(saved[0]) : period;
  }

  async updatePeriod(id: string, userId: string, patch: Partial<WeeklyPeriod>): Promise<WeeklyPeriod | null> {
    await this.ensureSchema();
    const sets: string[] = [];
    const args: TursoParam[] = [];

    if (patch.total_income_target !== undefined) {
      sets.push('total_income_target = ?');
      args.push(Number(patch.total_income_target) || 0);
    }
    if (patch.notes !== undefined) {
      sets.push('notes = ?');
      args.push(patch.notes || '');
    }

    if (sets.length > 0) {
      args.push(id, userId);
      await this.client.execute(
        `UPDATE weekly_periods SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
        args
      );
    }

    const { rows } = await this.client.execute<any>(
      'SELECT * FROM weekly_periods WHERE id = ? AND user_id = ? LIMIT 1',
      [id, userId]
    );
    return rows[0] ? mapPeriodRow(rows[0]) : null;
  }

  async resetUserData(userId: string): Promise<void> {
    await this.ensureSchema();
    await this.client.batch([
      { sql: 'DELETE FROM transactions WHERE user_id = ?', args: [userId] },
      { sql: 'DELETE FROM needs WHERE user_id = ?', args: [userId] },
      { sql: 'UPDATE weekly_periods SET total_income_target = 0 WHERE user_id = ?', args: [userId] },
    ]);
  }

  async loadTemplateData(userId: string): Promise<Need[]> {
    await this.ensureSchema();
    const templateNeeds = getRecommendedTemplateNeeds(userId);
    await this.client.batch([
      { sql: 'DELETE FROM transactions WHERE user_id = ?', args: [userId] },
      { sql: 'DELETE FROM needs WHERE user_id = ?', args: [userId] },
      ...templateNeeds.map((n) => ({
        sql: `INSERT INTO needs (
          id, user_id, name, type, allocation_mode, priority, billing_cycle,
          target_amount, percentage, is_active, icon, color, note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          n.id,
          n.user_id,
          n.name,
          n.type,
          n.allocation_mode || 'nominal',
          n.priority,
          n.billing_cycle,
          Number(n.target_amount) || 0,
          Number(n.percentage) || 0,
          n.is_active ? 1 : 0,
          n.icon || 'Tag',
          n.color || '#113829',
          n.note || '',
          n.created_at,
        ],
      })),
      { sql: 'UPDATE weekly_periods SET total_income_target = 160000 WHERE user_id = ?', args: [userId] },
    ]);
    return templateNeeds;
  }
}

let cachedRepo: DatabaseRepository | null = null;
let cachedMode: string | null = null;

export function getDbRepository(): DatabaseRepository {
  const cfg = getDatabaseConfig();
  if (cachedRepo && cachedMode === cfg.mode) {
    return cachedRepo;
  }

  const tursoClient = createTursoClient();
  if (tursoClient) {
    console.log('🗄️ Database aktif: Turso (libSQL)');
    cachedRepo = new TursoDatabaseRepository(tursoClient);
    cachedMode = 'turso';
    return cachedRepo;
  }

  const supabaseClient = createSupabaseClient();
  if (supabaseClient) {
    if (!cfg.usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY belum diisi; menggunakan SUPABASE_ANON_KEY (pastikan RLS mengizinkan).');
    } else {
      console.log('🗄️ Database aktif: Supabase PostgreSQL');
    }
    cachedRepo = new SupabaseDatabaseRepository(supabaseClient);
    cachedMode = 'supabase';
    return cachedRepo;
  }

  console.log('🗄️ Database aktif: Local JSON (data/db.json) — isi .env untuk memakai Turso');
  cachedRepo = new JsonDatabaseRepository();
  cachedMode = 'local-json';
  return cachedRepo;
}
