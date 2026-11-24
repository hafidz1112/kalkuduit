import { Router, Request, Response, NextFunction } from 'express';
import { readDb, writeDb, getDefaultSeedData, resetUserData, loadTemplateData } from './db';
import { hashPassword, verifyPassword, generateToken } from './auth';
import { calculateHybridAllocation, simulateWhatIf } from '../lib/engine';
import { Need, Transaction, WeeklyPeriod } from '../types';

export const apiRouter = Router();

// Middleware to extract user from Authorization header (Bearer token or demo fallback)
function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const db = readDb();

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = db.sessions.find((s) => s.token === token && s.expires_at > Date.now());
    if (session) {
      const user = db.users.find((u) => u.id === session.user_id);
      if (user) {
        (req as any).user = user;
        return next();
      }
    }
  }

  // Fallback to first demo user for smooth local experience if no token provided
  if (db.users.length > 0) {
    (req as any).user = db.users[0];
    return next();
  }

  res.status(401).json({ error: 'Unauthorized. Please login.' });
}

// --- AUTH ROUTES ---

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Nama, email, dan password wajib diisi.' });
    return;
  }

  const db = readDb();
  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    res.status(400).json({ error: 'Email sudah terdaftar.' });
    return;
  }

  const userId = `user-${Date.now()}`;
  const newUser = {
    id: userId,
    name,
    email: email.toLowerCase(),
    created_at: new Date().toISOString(),
    password_hash: hashPassword(password),
  };

  db.users.push(newUser);

  // Seed standard default needs for this new user
  const defaultSeeds = getDefaultSeedData();
  const userNeeds = defaultSeeds.needs.map((n) => ({
    ...n,
    id: `need-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    user_id: userId,
  }));
  db.needs.push(...userNeeds);

  // Create session token
  const token = generateToken();
  db.sessions.push({
    token,
    user_id: userId,
    expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  writeDb(db);

  const { password_hash, ...safeUser } = newUser;
  res.json({ user: safeUser, token });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email dan password wajib diisi.' });
    return;
  }

  const db = readDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Email atau password salah.' });
    return;
  }

  const token = generateToken();
  db.sessions.push({
    token,
    user_id: user.id,
    expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });

  writeDb(db);

  const { password_hash, ...safeUser } = user;
  res.json({ user: safeUser, token });
});

apiRouter.get('/auth/me', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { password_hash, ...safeUser } = user;
  res.json({ user: safeUser });
});

// --- NEEDS (KEBUTUHAN CUSTOM) ROUTES ---

apiRouter.get('/needs', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = readDb();
  const userNeeds = db.needs.filter((n) => n.user_id === user.id);
  res.json(userNeeds);
});

apiRouter.post('/needs', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name, type, allocation_mode, priority, billing_cycle, target_amount, percentage, icon, color, note } = req.body;

  if (!name || !priority) {
    res.status(400).json({ error: 'Nama dan prioritas kebutuhan wajib diisi.' });
    return;
  }

  const determinedMode = allocation_mode || (type === 'flexible' ? 'percent_remainder' : 'nominal');
  const determinedType = determinedMode === 'percent_remainder' ? 'flexible' : 'fixed';

  const db = readDb();
  const newNeed: Need = {
    id: `need-${Date.now()}`,
    user_id: user.id,
    name,
    type: determinedType,
    allocation_mode: determinedMode,
    priority: priority || 'penting',
    billing_cycle: billing_cycle || 'weekly',
    target_amount: Number(target_amount) || 0,
    percentage: Number(percentage) || 0,
    is_active: true,
    icon: icon || 'Tag',
    color: color || '#10b981',
    note: note || '',
    created_at: new Date().toISOString(),
  };

  db.needs.push(newNeed);
  writeDb(db);

  res.status(201).json(newNeed);
});

apiRouter.put('/needs/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const needId = req.params.id;
  const db = readDb();

  const index = db.needs.findIndex((n) => n.id === needId && n.user_id === user.id);
  if (index === -1) {
    res.status(404).json({ error: 'Kebutuhan tidak ditemukan.' });
    return;
  }

  const updated: Need = {
    ...db.needs[index],
    ...req.body,
    id: needId,
    user_id: user.id,
  };

  db.needs[index] = updated;
  writeDb(db);

  res.json(updated);
});

apiRouter.delete('/needs/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const needId = req.params.id;
  const db = readDb();

  const initialLen = db.needs.length;
  db.needs = db.needs.filter((n) => !(n.id === needId && n.user_id === user.id));

  if (db.needs.length === initialLen) {
    res.status(404).json({ error: 'Kebutuhan tidak ditemukan.' });
    return;
  }

  writeDb(db);
  res.json({ success: true, message: 'Kebutuhan berhasil dihapus.' });
});

// --- TRANSACTIONS (TRANSAKSI) ROUTES ---

apiRouter.get('/transactions', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { period_id, need_id, type, start_date, end_date } = req.query;
  const db = readDb();

  let list = db.transactions.filter((t) => t.user_id === user.id);

  if (period_id) {
    list = list.filter((t) => t.period_id === period_id);
  }
  if (need_id) {
    list = list.filter((t) => t.need_id === need_id);
  }
  if (type) {
    list = list.filter((t) => t.type === type);
  }
  if (start_date && end_date) {
    list = list.filter((t) => t.date >= (start_date as string) && t.date <= (end_date as string));
  }

  // Sort descending by date
  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json(list);
});

apiRouter.post('/transactions', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { period_id, need_id, type, amount, date, note } = req.body;

  if (!type || !amount || !date) {
    res.status(400).json({ error: 'Jenis, nominal, dan tanggal transaksi wajib diisi.' });
    return;
  }

  const db = readDb();
  const newTx: Transaction = {
    id: `tx-${Date.now()}`,
    user_id: user.id,
    period_id: period_id || undefined,
    need_id: need_id || null,
    type: type === 'income' ? 'income' : 'expense',
    amount: Number(amount),
    date,
    note: note || '',
    created_at: new Date().toISOString(),
  };

  db.transactions.push(newTx);
  writeDb(db);

  res.status(201).json(newTx);
});

apiRouter.put('/transactions/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const txId = req.params.id;
  const db = readDb();

  const index = db.transactions.findIndex((t) => t.id === txId && t.user_id === user.id);
  if (index === -1) {
    res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
    return;
  }

  const updated: Transaction = {
    ...db.transactions[index],
    ...req.body,
    id: txId,
    user_id: user.id,
    amount: Number(req.body.amount ?? db.transactions[index].amount),
  };

  db.transactions[index] = updated;
  writeDb(db);

  res.json(updated);
});

apiRouter.delete('/transactions/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const txId = req.params.id;
  const db = readDb();

  const initialLen = db.transactions.length;
  db.transactions = db.transactions.filter((t) => !(t.id === txId && t.user_id === user.id));

  if (db.transactions.length === initialLen) {
    res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
    return;
  }

  writeDb(db);
  res.json({ success: true, message: 'Transaksi berhasil dihapus.' });
});

// --- WEEKLY PERIODS ROUTES ---

apiRouter.get('/periods', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = readDb();
  const periods = db.weekly_periods.filter((p) => p.user_id === user.id);
  res.json(periods);
});

apiRouter.post('/periods', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { start_date, end_date, label, total_income_target, notes } = req.body;

  const db = readDb();
  const newPeriod: WeeklyPeriod = {
    id: `period-${Date.now()}`,
    user_id: user.id,
    start_date,
    end_date,
    label,
    total_income_target: Number(total_income_target) || 0,
    notes: notes || '',
  };

  db.weekly_periods.push(newPeriod);
  writeDb(db);

  res.status(201).json(newPeriod);
});

// --- ENGINE CALCULATION & WHAT-IF SIMULATION ---

apiRouter.get('/engine/calculate', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { start_date, end_date, income_target } = req.query;
  const db = readDb();

  const userNeeds = db.needs.filter((n) => n.user_id === user.id);
  let userTransactions = db.transactions.filter((t) => t.user_id === user.id);

  if (start_date && end_date) {
    userTransactions = userTransactions.filter(
      (t) => t.date >= (start_date as string) && t.date <= (end_date as string)
    );
  }

  const income = Number(income_target) || 0;
  const result = calculateHybridAllocation(income, userNeeds, userTransactions);

  res.json(result);
});

apiRouter.post('/engine/simulate', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { current_income, scenario } = req.body;
  const db = readDb();

  const userNeeds = db.needs.filter((n) => n.user_id === user.id);
  const result = simulateWhatIf(Number(current_income) || 0, userNeeds, scenario);

  res.json(result);
});

// --- RESET & TEMPLATE ROUTES ---

apiRouter.post('/user/reset', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  resetUserData(user.id);
  res.json({ success: true, message: 'Data berhasil direset ke nol.' });
});

apiRouter.post('/user/load-template', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const templateNeeds = loadTemplateData(user.id);
  res.json({ success: true, message: 'Template awal berhasil dimuat.', needs: templateNeeds });
});
