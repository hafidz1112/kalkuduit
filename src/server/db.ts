import fs from 'fs';
import path from 'path';
import { User, Need, WeeklyPeriod, Transaction } from '../types';
import { hashPassword } from './auth';
import { getCurrentWeekPeriod, getTodayDateString } from '../lib/utils';

export interface DatabaseSchema {
  users: (User & { password_hash: string })[];
  needs: Need[];
  weekly_periods: WeeklyPeriod[];
  transactions: Transaction[];
  sessions: { token: string; user_id: string; expires_at: number }[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// In-memory cache for ultra-fast operations
let dbCache: DatabaseSchema | null = null;

function ensureDbDirectory() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

/**
 * Recommended starter template needs based on initial system specifications
 */
export function getRecommendedTemplateNeeds(userId: string): Need[] {
  return [
    {
      id: `need-bensin-${Date.now()}`,
      user_id: userId,
      name: 'Bensin Motor',
      type: 'fixed',
      allocation_mode: 'nominal',
      priority: 'wajib',
      billing_cycle: 'weekly',
      target_amount: 30000,
      percentage: 0,
      is_active: true,
      icon: 'Fuel',
      color: '#f97316',
      note: 'Transportasi harian',
      created_at: new Date().toISOString(),
    },
    {
      id: `need-makan-${Date.now() + 1}`,
      user_id: userId,
      name: 'Makan & Belanja Pokok',
      type: 'fixed',
      allocation_mode: 'percent_income',
      priority: 'wajib',
      billing_cycle: 'weekly',
      target_amount: 0,
      percentage: 35, // 35% dari pemasukan
      is_active: true,
      icon: 'Utensils',
      color: '#ef4444',
      note: 'Makan siang & belanja bahan pokok',
      created_at: new Date().toISOString(),
    },
    {
      id: `need-wifi-${Date.now() + 2}`,
      user_id: userId,
      name: 'Patungan WiFi Rumah',
      type: 'fixed',
      allocation_mode: 'nominal',
      priority: 'penting',
      billing_cycle: 'monthly',
      target_amount: 119000, // Otomatis disarankan sisihan Rp 30.000 / minggu
      percentage: 0,
      is_active: true,
      icon: 'Wifi',
      color: '#3b82f6',
      note: 'Tagihan bulanan Rp 119.000 (sisihan mingguan ~Rp 30.000)',
      created_at: new Date().toISOString(),
    },
    {
      id: `need-ngopi-${Date.now() + 3}`,
      user_id: userId,
      name: 'Jajan & Ngopi',
      type: 'fixed',
      allocation_mode: 'percent_income',
      priority: 'keinginan',
      billing_cycle: 'weekly',
      target_amount: 0,
      percentage: 10, // 10% dari pemasukan
      is_active: true,
      icon: 'Coffee',
      color: '#ec4899',
      note: 'Jajan santai atau nongkrong',
      created_at: new Date().toISOString(),
    },
    {
      id: `need-tabungan-${Date.now() + 4}`,
      user_id: userId,
      name: 'Tabungan Rekening Utama',
      type: 'flexible',
      allocation_mode: 'percent_remainder',
      priority: 'wajib',
      billing_cycle: 'weekly',
      target_amount: 0,
      percentage: 60, // 60% dari sisa kas bersih
      is_active: true,
      icon: 'PiggyBank',
      color: '#10b981',
      note: 'Tabungan disiplin masa depan',
      created_at: new Date().toISOString(),
    },
    {
      id: `need-darurat-${Date.now() + 5}`,
      user_id: userId,
      name: 'Dana Cadangan Darurat',
      type: 'flexible',
      allocation_mode: 'percent_remainder',
      priority: 'penting',
      billing_cycle: 'weekly',
      target_amount: 0,
      percentage: 40, // 40% dari sisa kas bersih
      is_active: true,
      icon: 'ShieldAlert',
      color: '#eab308',
      note: 'Biaya tak terduga (servis motor, obat)',
      created_at: new Date().toISOString(),
    },
  ];
}

/**
 * Default empty data starting from scratch (nol)
 */
export function getDefaultSeedData(): DatabaseSchema {
  const demoUserId = 'user-demo-1';
  const currentWeek = getCurrentWeekPeriod();

  const demoUser: User & { password_hash: string } = {
    id: demoUserId,
    name: 'Fadhil Pratama',
    email: 'demo@kalkuduit.id',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    created_at: new Date().toISOString(),
    password_hash: hashPassword('password123'),
  };

  const demoPeriod: WeeklyPeriod = {
    id: 'period-current-week',
    user_id: demoUserId,
    start_date: currentWeek.startDate,
    end_date: currentWeek.endDate,
    label: currentWeek.label,
    total_income_target: 0,
    notes: 'Periode evaluasi bujet mingguan',
  };

  return {
    users: [demoUser],
    needs: [], // Mulai dari nol: kosong
    weekly_periods: [demoPeriod],
    transactions: [], // Mulai dari nol: kosong
    sessions: [],
  };
}

export function clearDbCache(): void {
  dbCache = null;
}

export function resetUserData(userId: string): void {
  const db = readDb();
  db.needs = db.needs.filter((n) => n.user_id !== userId);
  db.transactions = db.transactions.filter((t) => t.user_id !== userId);
  for (const p of db.weekly_periods) {
    if (p.user_id === userId) {
      p.total_income_target = 0;
    }
  }
  writeDb(db);
}

export function loadTemplateData(userId: string): Need[] {
  const db = readDb();
  // Clear existing
  db.needs = db.needs.filter((n) => n.user_id !== userId);
  db.transactions = db.transactions.filter((t) => t.user_id !== userId);
  
  const templateNeeds = getRecommendedTemplateNeeds(userId);
  db.needs.push(...templateNeeds);
  
  // Set default weekly income target to 160000
  for (const p of db.weekly_periods) {
    if (p.user_id === userId) {
      p.total_income_target = 160000;
    }
  }

  writeDb(db);
  return templateNeeds;
}

export function readDb(): DatabaseSchema {
  if (dbCache) return dbCache;

  ensureDbDirectory();

  if (!fs.existsSync(DB_FILE)) {
    const seed = getDefaultSeedData();
    writeDb(seed);
    dbCache = seed;
    return seed;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    dbCache = parsed;
    return parsed;
  } catch (err) {
    console.error('Failed reading db.json, recreating defaults:', err);
    const seed = getDefaultSeedData();
    writeDb(seed);
    dbCache = seed;
    return seed;
  }
}

export function writeDb(data: DatabaseSchema): void {
  ensureDbDirectory();
  dbCache = data;
  const tempPath = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, DB_FILE);
}
