import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { loadEnvFiles, getGoogleClientId } from './env';
import { getDbRepository } from './repository';
import { hashPassword, verifyPassword, generateToken, verifyGoogleIdToken } from './auth';
import { calculateHybridAllocation, simulateWhatIf } from '../lib/engine';
import { Need, PeriodMode, Transaction, WeeklyPeriod } from '../types';

loadEnvFiles();

export const apiRouter = express.Router();

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Health check route to verify active database (.env + Turso vs Local JSON)
apiRouter.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response) => {
    const repo = getDbRepository();
    const health = await repo.checkHealth();
    res.status(health.ok ? 200 : 500).json({
      ...health,
      timestamp: new Date().toISOString(),
    });
  })
);

// Middleware to extract user from Authorization header (Bearer token required)
const authMiddleware = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const repo = getDbRepository();

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = await repo.findValidSession(token);
    if (session) {
      const user = await repo.findUserById(session.user_id);
      if (user) {
        (req as any).user = user;
        return next();
      }
    }
  }

  res.status(401).json({ error: 'Sesi login tidak valid atau telah berakhir. Silakan masuk kembali.' });
});

// --- AUTH ROUTES ---

apiRouter.get('/auth/config', (_req: Request, res: Response) => {
  const googleClientId = getGoogleClientId();
  res.json({
    googleClientId: googleClientId || null,
    googleEnabled: Boolean(googleClientId),
  });
});

apiRouter.post(
  '/auth/register',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nama, email, dan password wajib diisi.' });
      return;
    }

    const repo = getDbRepository();
    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await repo.findUserByEmail(cleanEmail);
    if (existing) {
      res.status(400).json({ error: 'Email sudah terdaftar.' });
      return;
    }

    const userId = `user-${Date.now()}`;
    const newUser = await repo.createUser({
      id: userId,
      name: String(name).trim(),
      email: cleanEmail,
      created_at: new Date().toISOString(),
      password_hash: hashPassword(String(password)),
    });

    const token = generateToken();
    await repo.createSession({
      token,
      user_id: userId,
      expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    const { password_hash, ...safeUser } = newUser;
    res.json({ user: safeUser, token });
  })
);

apiRouter.post(
  '/auth/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email dan password wajib diisi.' });
      return;
    }

    const repo = getDbRepository();
    const user = await repo.findUserByEmail(String(email).trim().toLowerCase());
    if (!user) {
      res.status(401).json({ error: 'Email atau password salah.' });
      return;
    }

    if (user.password_hash === 'google-oauth') {
      res.status(401).json({
        error: 'Akun ini terdaftar lewat Google. Silakan masuk menggunakan tombol Google.',
      });
      return;
    }

    if (!verifyPassword(String(password), user.password_hash)) {
      res.status(401).json({ error: 'Email atau password salah.' });
      return;
    }

    const token = generateToken();
    await repo.createSession({
      token,
      user_id: user.id,
      expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  })
);

apiRouter.post(
  '/auth/google',
  asyncHandler(async (req: Request, res: Response) => {
    const { credential } = req.body || {};
    if (!credential || typeof credential !== 'string') {
      res.status(400).json({ error: 'Token kredensial Google tidak ditemukan.' });
      return;
    }

    const googleClientId = getGoogleClientId();
    if (!googleClientId) {
      res.status(500).json({
        error: 'GOOGLE_CLIENT_ID belum dikonfigurasi di server (.env atau Environment Variables).',
      });
      return;
    }

    let googleUser;
    try {
      googleUser = await verifyGoogleIdToken(credential, googleClientId);
    } catch (err: any) {
      res.status(401).json({ error: err?.message || 'Verifikasi akun Google gagal.' });
      return;
    }

    const repo = getDbRepository();
    let user = await repo.findUserByEmail(googleUser.email);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await repo.createUser({
        id: `user-${Date.now()}`,
        name: googleUser.name,
        email: googleUser.email,
        avatar: googleUser.picture,
        created_at: new Date().toISOString(),
        password_hash: 'google-oauth',
      });
    } else if (
      (googleUser.name && googleUser.name !== user.name) ||
      (googleUser.picture && googleUser.picture !== user.avatar)
    ) {
      const updated = await repo.updateUser(user.id, {
        name: googleUser.name || user.name,
        avatar: googleUser.picture || user.avatar,
      });
      if (updated) user = updated;
    }

    const token = generateToken();
    await repo.createSession({
      token,
      user_id: user.id,
      expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token, isNewUser });
  })
);

apiRouter.post(
  '/auth/demo',
  asyncHandler(async (_req: Request, res: Response) => {
    const repo = getDbRepository();
    let demoUser = await repo.findUserByEmail('demo@kalkuduit.id');
    if (!demoUser) {
      demoUser = await repo.getFallbackDemoUser();
    }

    if (!demoUser) {
      res.status(404).json({ error: 'Akun demo belum tersedia.' });
      return;
    }

    const token = generateToken();
    await repo.createSession({
      token,
      user_id: demoUser.id,
      expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    const { password_hash, ...safeUser } = demoUser;
    res.json({ user: safeUser, token });
  })
);

apiRouter.get('/auth/me', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { password_hash, ...safeUser } = user;
  res.json({ user: safeUser });
});

// --- NEEDS (KEBUTUHAN CUSTOM) ROUTES ---

apiRouter.get(
  '/needs',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const repo = getDbRepository();
    const userNeeds = await repo.getNeedsByUser(user.id);
    res.json(userNeeds);
  })
);

apiRouter.post(
  '/needs',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { name, type, allocation_mode, priority, billing_cycle, target_amount, percentage, icon, color, note } = req.body;

    if (!name || !priority) {
      res.status(400).json({ error: 'Nama dan prioritas kebutuhan wajib diisi.' });
      return;
    }

    const determinedMode = allocation_mode || (type === 'flexible' ? 'percent_remainder' : 'nominal');
    const determinedType = determinedMode === 'percent_remainder' ? 'flexible' : 'fixed';

    const repo = getDbRepository();
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

    const created = await repo.createNeed(newNeed);
    res.status(201).json(created);
  })
);

apiRouter.put(
  '/needs/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const needId = String(req.params.id);
    const repo = getDbRepository();

    const updated = await repo.updateNeed(needId, user.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Kebutuhan tidak ditemukan.' });
      return;
    }

    res.json(updated);
  })
);

apiRouter.delete(
  '/needs/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const needId = String(req.params.id);
    const repo = getDbRepository();

    const deleted = await repo.deleteNeed(needId, user.id);
    if (!deleted) {
      res.status(404).json({ error: 'Kebutuhan tidak ditemukan.' });
      return;
    }

    res.json({ success: true, message: 'Kebutuhan berhasil dihapus.' });
  })
);

// --- TRANSACTIONS (TRANSAKSI) ROUTES ---

apiRouter.get(
  '/transactions',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { period_id, need_id, type, start_date, end_date } = req.query;
    const repo = getDbRepository();

    const list = await repo.getTransactionsByUser(user.id, {
      period_id: period_id as string | undefined,
      need_id: need_id as string | undefined,
      type: type as string | undefined,
      start_date: start_date as string | undefined,
      end_date: end_date as string | undefined,
    });

    res.json(list);
  })
);

apiRouter.post(
  '/transactions',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { period_id, need_id, type, amount, date, note } = req.body;

    if (!type || !amount || !date) {
      res.status(400).json({ error: 'Jenis, nominal, dan tanggal transaksi wajib diisi.' });
      return;
    }

    const repo = getDbRepository();
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

    const created = await repo.createTransaction(newTx);
    res.status(201).json(created);
  })
);

apiRouter.put(
  '/transactions/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const txId = String(req.params.id);
    const repo = getDbRepository();

    const updated = await repo.updateTransaction(txId, user.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
      return;
    }

    res.json(updated);
  })
);

apiRouter.delete(
  '/transactions/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const txId = String(req.params.id);
    const repo = getDbRepository();

    const deleted = await repo.deleteTransaction(txId, user.id);
    if (!deleted) {
      res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
      return;
    }

    res.json({ success: true, message: 'Transaksi berhasil dihapus.' });
  })
);

// --- WEEKLY / MONTHLY PERIODS ROUTES ---

apiRouter.get(
  '/periods',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const repo = getDbRepository();
    const periods = await repo.getPeriodsByUser(user.id);
    res.json(periods);
  })
);

apiRouter.post(
  '/periods',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { start_date, end_date, label, total_income_target, notes } = req.body;
    const repo = getDbRepository();

    const period: WeeklyPeriod = {
      id: `period-${Date.now()}`,
      user_id: user.id,
      start_date,
      end_date,
      label,
      total_income_target: Number(total_income_target) || 0,
      notes: notes || '',
    };

    const result = await repo.createOrGetPeriod(period);
    res.status(result.id === period.id ? 201 : 200).json(result);
  })
);

apiRouter.put(
  '/periods/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const periodId = String(req.params.id);
    const repo = getDbRepository();

    const updated = await repo.updatePeriod(periodId, user.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Periode tidak ditemukan.' });
      return;
    }

    res.json(updated);
  })
);

// --- ENGINE CALCULATION & WHAT-IF SIMULATION ---

apiRouter.get(
  '/engine/calculate',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { start_date, end_date, income_target, period_mode } = req.query;
    const repo = getDbRepository();

    const userNeeds = await repo.getNeedsByUser(user.id);
    const userTransactions = await repo.getTransactionsByUser(user.id, {
      start_date: start_date as string | undefined,
      end_date: end_date as string | undefined,
    });

    const income = Number(income_target) || 0;
    const mode: PeriodMode = period_mode === 'monthly' ? 'monthly' : 'weekly';
    const result = calculateHybridAllocation(income, userNeeds, userTransactions, mode);

    res.json(result);
  })
);

apiRouter.post(
  '/engine/simulate',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { current_income, scenario, period_mode } = req.body;
    const repo = getDbRepository();

    const userNeeds = await repo.getNeedsByUser(user.id);
    const mode: PeriodMode = period_mode === 'monthly' ? 'monthly' : 'weekly';
    const result = simulateWhatIf(Number(current_income) || 0, userNeeds, scenario, mode);

    res.json(result);
  })
);

// --- RESET & TEMPLATE ROUTES ---

apiRouter.post(
  '/user/reset',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const repo = getDbRepository();
    await repo.resetUserData(user.id);
    res.json({ success: true, message: 'Data berhasil direset ke nol.' });
  })
);

apiRouter.post(
  '/user/load-template',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const repo = getDbRepository();
    const templateNeeds = await repo.loadTemplateData(user.id);
    res.json({ success: true, message: 'Template awal berhasil dimuat.', needs: templateNeeds });
  })
);

// Express error handler for async database errors
apiRouter.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({ error: err?.message || 'Terjadi kesalahan pada server database.' });
});
