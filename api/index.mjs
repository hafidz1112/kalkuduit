// src/server/vercel.ts
import express2 from "express";

// src/server/router.ts
import express from "express";

// src/server/env.ts
import fs from "fs";
import path from "path";
var envLoaded = false;
function loadEnvFiles() {
  if (envLoaded) return;
  envLoaded = true;
  const envFiles = [".env", ".env.local"];
  for (const fileName of envFiles) {
    const filePath = path.resolve(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) continue;
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split(/\r?\n/);
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eqIndex = line.indexOf("=");
        if (eqIndex === -1) continue;
        const key = line.slice(0, eqIndex).trim();
        let value = line.slice(eqIndex + 1).trim();
        if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        if (key && process.env[key] === void 0) {
          process.env[key] = value;
        }
      }
    } catch (err) {
      console.warn(`Gagal membaca ${fileName}:`, err);
    }
  }
}
function cleanEnvValue(raw) {
  if (!raw) return "";
  let val = raw.trim();
  if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) {
    val = val.slice(1, -1).trim();
  }
  return val;
}
function normalizeTursoHttpUrl(rawUrl) {
  const trimmed = cleanEnvValue(rawUrl).replace(/\/+$/, "");
  if (trimmed.startsWith("libsql://")) {
    return `https://${trimmed.slice("libsql://".length)}`;
  }
  return trimmed;
}
function getDatabaseConfig() {
  loadEnvFiles();
  const rawTursoUrl = cleanEnvValue(process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL);
  const tursoAuthToken = cleanEnvValue(process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN);
  if (rawTursoUrl && tursoAuthToken) {
    return {
      mode: "turso",
      tursoUrl: normalizeTursoHttpUrl(rawTursoUrl),
      tursoAuthToken
    };
  }
  return {
    mode: "local-json"
  };
}
function getGoogleClientId() {
  loadEnvFiles();
  return cleanEnvValue(process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID);
}

// src/server/db.ts
import fs2 from "fs";
import path2 from "path";

// src/server/auth.ts
import crypto from "crypto";
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1e4, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  try {
    const [salt, originalHash] = stored.split(":");
    if (!salt || !originalHash) return false;
    const testHash = crypto.pbkdf2Sync(password, salt, 1e4, 64, "sha512").toString("hex");
    return crypto.timingSafeEqual(Buffer.from(testHash, "hex"), Buffer.from(originalHash, "hex"));
  } catch (e) {
    return false;
  }
}
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}
var cachedGoogleCerts = null;
async function fetchGoogleJwks(forceRefresh = false) {
  if (!forceRefresh && cachedGoogleCerts && cachedGoogleCerts.expiresAt > Date.now()) {
    return cachedGoogleCerts.keys;
  }
  const res = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if (!res.ok) {
    throw new Error("Gagal mengambil kunci verifikasi Google.");
  }
  const data = await res.json();
  const keys = Array.isArray(data.keys) ? data.keys : [];
  let maxAgeSec = 3600;
  const cacheControl = res.headers.get("cache-control");
  const match = cacheControl?.match(/max-age=(\d+)/i);
  if (match) {
    maxAgeSec = Math.max(60, Number(match[1]) || 3600);
  }
  cachedGoogleCerts = {
    keys,
    expiresAt: Date.now() + maxAgeSec * 1e3
  };
  return keys;
}
async function verifyGoogleIdToken(idToken, expectedClientId) {
  if (!expectedClientId) {
    throw new Error("GOOGLE_CLIENT_ID belum dikonfigurasi di server.");
  }
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Format token Google tidak valid.");
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  let header;
  let payload;
  try {
    header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf-8"));
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
  } catch {
    throw new Error("Token Google tidak dapat didekode.");
  }
  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Algoritma atau key ID token Google tidak valid.");
  }
  let keys = await fetchGoogleJwks(false);
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    keys = await fetchGoogleJwks(true);
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) {
    throw new Error("Kunci publik Google tidak ditemukan untuk token ini.");
  }
  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const isSignatureValid = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${headerB64}.${payloadB64}`),
    publicKey,
    Buffer.from(signatureB64, "base64url")
  );
  if (!isSignatureValid) {
    throw new Error("Tanda tangan token Google tidak valid.");
  }
  const validIssuers = ["https://accounts.google.com", "accounts.google.com"];
  if (!validIssuers.includes(String(payload.iss || ""))) {
    throw new Error("Issuer token Google tidak valid.");
  }
  if (payload.aud !== expectedClientId) {
    throw new Error("Client ID token Google tidak sesuai dengan konfigurasi aplikasi.");
  }
  if (typeof payload.exp !== "number" || payload.exp * 1e3 <= Date.now() - 3e4) {
    throw new Error("Sesi login Google sudah kedaluwarsa. Silakan coba lagi.");
  }
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!email || payload.email_verified !== true) {
    throw new Error("Email Google belum terverifikasi.");
  }
  const fallbackName = email.split("@")[0] || "Pengguna";
  return {
    sub: String(payload.sub || ""),
    email,
    email_verified: true,
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : fallbackName,
    picture: typeof payload.picture === "string" ? payload.picture : void 0
  };
}

// src/lib/periodUtils.ts
function convertMonthlyToWeekly(monthlyAmount, roundToNearestThousand = true) {
  if (!monthlyAmount || monthlyAmount <= 0) return 0;
  const weeklyRaw = monthlyAmount / 4;
  if (!roundToNearestThousand) {
    return Math.round(weeklyRaw);
  }
  return Math.ceil(weeklyRaw / 1e3) * 1e3;
}
function convertWeeklyToMonthly(weeklyAmount) {
  if (!weeklyAmount || weeklyAmount <= 0) return 0;
  return weeklyAmount * 4;
}
function getWeekOptionByOffset(offset = 0, baseDate = /* @__PURE__ */ new Date()) {
  const current = new Date(baseDate);
  const dayOfWeek = current.getDay();
  const distanceToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) + offset * 7;
  const monday = new Date(current);
  monday.setDate(current.getDate() + distanceToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const format = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const startDay = monday.getDate();
  const endDay = sunday.getDate();
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des"
  ];
  const startMonth = monthNames[monday.getMonth()];
  const endMonth = monthNames[sunday.getMonth()];
  const year = sunday.getFullYear();
  const label = startMonth === endMonth ? `${startDay} - ${endDay} ${startMonth} ${year}` : `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
  const shortLabel = startMonth === endMonth ? `${startDay} - ${endDay} ${startMonth}` : `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
  let relativeLabel = "Pekan Ini";
  if (offset === -1) relativeLabel = "Pekan Lalu";
  else if (offset < -1) relativeLabel = `${Math.abs(offset)} Pekan Lalu`;
  else if (offset === 1) relativeLabel = "Pekan Depan";
  else if (offset > 1) relativeLabel = `${offset} Pekan Depan`;
  return {
    startDate: format(monday),
    endDate: format(sunday),
    label,
    shortLabel,
    relativeLabel,
    isCurrentWeek: offset === 0,
    offset
  };
}
function getCurrentWeekPeriod(date = /* @__PURE__ */ new Date()) {
  const currentWeek = getWeekOptionByOffset(0, date);
  return {
    startDate: currentWeek.startDate,
    endDate: currentWeek.endDate,
    label: currentWeek.label
  };
}

// src/server/db.ts
var DB_DIR = path2.resolve(process.cwd(), "data");
var DB_FILE = path2.join(DB_DIR, "db.json");
var dbCache = null;
function ensureDbDirectory() {
  if (!fs2.existsSync(DB_DIR)) {
    fs2.mkdirSync(DB_DIR, { recursive: true });
  }
}
function getRecommendedTemplateNeeds(userId) {
  return [
    {
      id: `need-bensin-${Date.now()}`,
      user_id: userId,
      name: "Bensin Motor",
      type: "fixed",
      allocation_mode: "nominal",
      priority: "wajib",
      billing_cycle: "weekly",
      target_amount: 3e4,
      percentage: 0,
      is_active: true,
      icon: "Fuel",
      color: "#f97316",
      note: "Transportasi harian",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: `need-makan-${Date.now() + 1}`,
      user_id: userId,
      name: "Makan & Belanja Pokok",
      type: "fixed",
      allocation_mode: "percent_income",
      priority: "wajib",
      billing_cycle: "weekly",
      target_amount: 0,
      percentage: 35,
      // 35% dari pemasukan
      is_active: true,
      icon: "Utensils",
      color: "#ef4444",
      note: "Makan siang & belanja bahan pokok",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: `need-wifi-${Date.now() + 2}`,
      user_id: userId,
      name: "Patungan WiFi Rumah",
      type: "fixed",
      allocation_mode: "nominal",
      priority: "penting",
      billing_cycle: "monthly",
      target_amount: 119e3,
      // Otomatis disarankan sisihan Rp 30.000 / minggu
      percentage: 0,
      is_active: true,
      icon: "Wifi",
      color: "#3b82f6",
      note: "Tagihan bulanan Rp 119.000 (sisihan mingguan ~Rp 30.000)",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: `need-ngopi-${Date.now() + 3}`,
      user_id: userId,
      name: "Jajan & Ngopi",
      type: "fixed",
      allocation_mode: "percent_income",
      priority: "keinginan",
      billing_cycle: "weekly",
      target_amount: 0,
      percentage: 10,
      // 10% dari pemasukan
      is_active: true,
      icon: "Coffee",
      color: "#ec4899",
      note: "Jajan santai atau nongkrong",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: `need-tabungan-${Date.now() + 4}`,
      user_id: userId,
      name: "Tabungan Rekening Utama",
      type: "flexible",
      allocation_mode: "percent_remainder",
      priority: "wajib",
      billing_cycle: "weekly",
      target_amount: 0,
      percentage: 60,
      // 60% dari sisa kas bersih
      is_active: true,
      icon: "PiggyBank",
      color: "#10b981",
      note: "Tabungan disiplin masa depan",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: `need-darurat-${Date.now() + 5}`,
      user_id: userId,
      name: "Dana Cadangan Darurat",
      type: "flexible",
      allocation_mode: "percent_remainder",
      priority: "penting",
      billing_cycle: "weekly",
      target_amount: 0,
      percentage: 40,
      // 40% dari sisa kas bersih
      is_active: true,
      icon: "ShieldAlert",
      color: "#eab308",
      note: "Biaya tak terduga (servis motor, obat)",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    }
  ];
}
function getDefaultSeedData() {
  const demoUserId = "user-demo-1";
  const currentWeek = getCurrentWeekPeriod();
  const demoUser = {
    id: demoUserId,
    name: "Fadhil Pratama",
    email: "demo@kalkuduit.id",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    password_hash: hashPassword("password123")
  };
  const demoPeriod = {
    id: "period-current-week",
    user_id: demoUserId,
    start_date: currentWeek.startDate,
    end_date: currentWeek.endDate,
    label: currentWeek.label,
    total_income_target: 0,
    notes: "Periode evaluasi bujet mingguan"
  };
  return {
    users: [demoUser],
    needs: [],
    // Mulai dari nol: kosong
    weekly_periods: [demoPeriod],
    transactions: [],
    // Mulai dari nol: kosong
    sessions: []
  };
}
function resetUserData(userId) {
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
function loadTemplateData(userId) {
  const db = readDb();
  db.needs = db.needs.filter((n) => n.user_id !== userId);
  db.transactions = db.transactions.filter((t) => t.user_id !== userId);
  const templateNeeds = getRecommendedTemplateNeeds(userId);
  db.needs.push(...templateNeeds);
  for (const p of db.weekly_periods) {
    if (p.user_id === userId) {
      p.total_income_target = 16e4;
    }
  }
  writeDb(db);
  return templateNeeds;
}
function readDb() {
  if (dbCache) return dbCache;
  ensureDbDirectory();
  if (!fs2.existsSync(DB_FILE)) {
    const seed = getDefaultSeedData();
    writeDb(seed);
    dbCache = seed;
    return seed;
  }
  try {
    const raw = fs2.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    dbCache = parsed;
    return parsed;
  } catch (err) {
    console.error("Failed reading db.json, recreating defaults:", err);
    const seed = getDefaultSeedData();
    writeDb(seed);
    dbCache = seed;
    return seed;
  }
}
function writeDb(data) {
  ensureDbDirectory();
  dbCache = data;
  const tempPath = `${DB_FILE}.tmp`;
  fs2.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
  fs2.renameSync(tempPath, DB_FILE);
}

// src/server/turso.ts
import dns from "node:dns";
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
}
function encodeArg(val) {
  if (val === null || val === void 0) {
    return { type: "null" };
  }
  if (typeof val === "boolean") {
    return { type: "integer", value: val ? "1" : "0" };
  }
  if (typeof val === "number") {
    if (!Number.isFinite(val)) return { type: "null" };
    if (Number.isInteger(val)) {
      return { type: "integer", value: String(val) };
    }
    return { type: "float", value: val };
  }
  return { type: "text", value: String(val) };
}
function decodeCell(cell) {
  if (!cell || cell.type === "null" || cell.value === void 0 || cell.value === null) {
    return null;
  }
  if (cell.type === "integer" || cell.type === "float") {
    return Number(cell.value);
  }
  return cell.value;
}
var TursoClient = class {
  pipelineUrl;
  authToken;
  constructor(httpUrl, authToken) {
    this.pipelineUrl = `${httpUrl}/v2/pipeline`;
    this.authToken = authToken;
  }
  async batch(statements) {
    const requests = [
      ...statements.map((s) => ({
        type: "execute",
        stmt: {
          sql: s.sql,
          args: (s.args || []).map(encodeArg)
        }
      })),
      { type: "close" }
    ];
    let res = null;
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await fetch(this.pipelineUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.authToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ requests })
        });
        break;
      } catch (err) {
        lastError = err;
      }
    }
    if (!res) {
      throw lastError instanceof Error ? lastError : new Error("Gagal terhubung ke Turso");
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Turso HTTP ${res.status}: ${text || "Gagal terhubung ke Turso"}`);
    }
    const data = await res.json();
    const output = [];
    for (let i = 0; i < statements.length; i++) {
      const item = data.results[i];
      if (!item) continue;
      if (item.type === "error") {
        throw new Error(`Turso SQL error: ${item.error.message}`);
      }
      const execResult = item.response?.result;
      if (!execResult) {
        output.push({ rows: [], affectedRowCount: 0 });
        continue;
      }
      const cols = execResult.cols || [];
      const rows = (execResult.rows || []).map((rowCells) => {
        const obj = {};
        for (let c = 0; c < cols.length; c++) {
          obj[cols[c].name] = decodeCell(rowCells[c]);
        }
        return obj;
      });
      output.push({
        rows,
        affectedRowCount: execResult.affected_row_count || 0
      });
    }
    return output;
  }
  async execute(sql, args = []) {
    const [result] = await this.batch([{ sql, args }]);
    return {
      rows: result?.rows || [],
      affectedRowCount: result?.affectedRowCount || 0
    };
  }
};
function createTursoClient() {
  const cfg = getDatabaseConfig();
  if (cfg.mode !== "turso" || !cfg.tursoUrl || !cfg.tursoAuthToken) {
    return null;
  }
  return new TursoClient(cfg.tursoUrl, cfg.tursoAuthToken);
}

// src/server/repository.ts
var JsonDatabaseRepository = class {
  getMode() {
    return "local-json";
  }
  async checkHealth() {
    if (process.env.VERCEL) {
      return {
        ok: false,
        database: "local-json",
        detail: "TURSO_DATABASE_URL atau TURSO_AUTH_TOKEN belum terbaca di environment Vercel."
      };
    }
    readDb();
    return { ok: true, database: "local-json" };
  }
  async findUserById(id) {
    const db = readDb();
    return db.users.find((u) => u.id === id) || null;
  }
  async findUserByEmail(email) {
    const db = readDb();
    return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }
  async getFallbackDemoUser() {
    const db = readDb();
    return db.users[0] || null;
  }
  async createUser(user) {
    if (process.env.VERCEL) {
      throw new Error(
        "Database Turso belum aktif di Vercel. Pastikan TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN sudah diset di Vercel Environment Variables lalu Redeploy."
      );
    }
    const db = readDb();
    db.users.push(user);
    writeDb(db);
    return user;
  }
  async updateUser(id, patch) {
    const db = readDb();
    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    const updated = {
      ...db.users[index],
      ...patch.name !== void 0 && { name: patch.name },
      ...patch.avatar !== void 0 && { avatar: patch.avatar }
    };
    db.users[index] = updated;
    writeDb(db);
    return updated;
  }
  async findValidSession(token) {
    const db = readDb();
    return db.sessions.find((s) => s.token === token && s.expires_at > Date.now()) || null;
  }
  async createSession(session) {
    const db = readDb();
    db.sessions.push(session);
    writeDb(db);
  }
  async getNeedsByUser(userId) {
    const db = readDb();
    return db.needs.filter((n) => n.user_id === userId);
  }
  async createNeed(need) {
    const db = readDb();
    db.needs.push(need);
    writeDb(db);
    return need;
  }
  async updateNeed(id, userId, patch) {
    const db = readDb();
    const index = db.needs.findIndex((n) => n.id === id && n.user_id === userId);
    if (index === -1) return null;
    const updated = {
      ...db.needs[index],
      ...patch,
      id,
      user_id: userId
    };
    db.needs[index] = updated;
    writeDb(db);
    return updated;
  }
  async deleteNeed(id, userId) {
    const db = readDb();
    const initialLen = db.needs.length;
    db.needs = db.needs.filter((n) => !(n.id === id && n.user_id === userId));
    if (db.needs.length === initialLen) return false;
    writeDb(db);
    return true;
  }
  async getTransactionsByUser(userId, filters) {
    const db = readDb();
    let list = db.transactions.filter((t) => t.user_id === userId);
    if (filters?.period_id) list = list.filter((t) => t.period_id === filters.period_id);
    if (filters?.need_id) list = list.filter((t) => t.need_id === filters.need_id);
    if (filters?.type) list = list.filter((t) => t.type === filters.type);
    if (filters?.start_date && filters?.end_date) {
      list = list.filter((t) => t.date >= filters.start_date && t.date <= filters.end_date);
    }
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }
  async createTransaction(tx) {
    const db = readDb();
    db.transactions.push(tx);
    writeDb(db);
    return tx;
  }
  async updateTransaction(id, userId, patch) {
    const db = readDb();
    const index = db.transactions.findIndex((t) => t.id === id && t.user_id === userId);
    if (index === -1) return null;
    const updated = {
      ...db.transactions[index],
      ...patch,
      id,
      user_id: userId,
      amount: Number(patch.amount ?? db.transactions[index].amount)
    };
    db.transactions[index] = updated;
    writeDb(db);
    return updated;
  }
  async deleteTransaction(id, userId) {
    const db = readDb();
    const initialLen = db.transactions.length;
    db.transactions = db.transactions.filter((t) => !(t.id === id && t.user_id === userId));
    if (db.transactions.length === initialLen) return false;
    writeDb(db);
    return true;
  }
  async getPeriodsByUser(userId) {
    const db = readDb();
    return db.weekly_periods.filter((p) => p.user_id === userId);
  }
  async createOrGetPeriod(period) {
    const db = readDb();
    const existing = db.weekly_periods.find(
      (p) => p.user_id === period.user_id && p.start_date === period.start_date && p.end_date === period.end_date
    );
    if (existing) return existing;
    db.weekly_periods.push(period);
    writeDb(db);
    return period;
  }
  async updatePeriod(id, userId, patch) {
    const db = readDb();
    const index = db.weekly_periods.findIndex((p) => p.id === id && p.user_id === userId);
    if (index === -1) return null;
    const updated = {
      ...db.weekly_periods[index],
      ...patch.total_income_target !== void 0 && {
        total_income_target: Number(patch.total_income_target) || 0
      },
      ...patch.notes !== void 0 && { notes: patch.notes },
      id,
      user_id: userId
    };
    db.weekly_periods[index] = updated;
    writeDb(db);
    return updated;
  }
  async resetUserData(userId) {
    resetUserData(userId);
  }
  async loadTemplateData(userId) {
    return loadTemplateData(userId);
  }
};
function mapNeedRow(row) {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    type: row.type,
    allocation_mode: row.allocation_mode || void 0,
    priority: row.priority,
    billing_cycle: row.billing_cycle,
    target_amount: Number(row.target_amount) || 0,
    percentage: Number(row.percentage) || 0,
    is_active: Boolean(row.is_active),
    icon: row.icon || void 0,
    color: row.color || void 0,
    note: row.note || "",
    created_at: String(row.created_at)
  };
}
function mapPeriodRow(row) {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    start_date: String(row.start_date),
    end_date: String(row.end_date),
    label: String(row.label),
    total_income_target: Number(row.total_income_target) || 0,
    notes: row.notes || ""
  };
}
function mapTransactionRow(row) {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    period_id: row.period_id || void 0,
    need_id: row.need_id ?? null,
    type: row.type,
    amount: Number(row.amount) || 0,
    date: String(row.date),
    note: row.note || "",
    created_at: String(row.created_at)
  };
}
var TursoDatabaseRepository = class {
  constructor(client) {
    this.client = client;
  }
  client;
  schemaInitialized = false;
  schemaPromise = null;
  getMode() {
    return "turso";
  }
  async ensureSchema() {
    if (this.schemaInitialized) return;
    if (!this.schemaPromise) {
      this.schemaPromise = this.client.batch([
        {
          sql: `CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              email TEXT NOT NULL UNIQUE,
              avatar TEXT,
              password_hash TEXT NOT NULL,
              created_at TEXT NOT NULL
            )`
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
            )`
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
            )`
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
            )`
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS sessions (
              token TEXT PRIMARY KEY,
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              expires_at INTEGER NOT NULL
            )`
        },
        { sql: `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)` },
        { sql: `CREATE INDEX IF NOT EXISTS idx_needs_user_id ON needs (user_id)` },
        { sql: `CREATE INDEX IF NOT EXISTS idx_periods_user_dates ON weekly_periods (user_id, start_date, end_date)` },
        { sql: `CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions (user_id, date DESC)` },
        { sql: `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id)` }
      ]).then(() => {
        this.schemaInitialized = true;
      }).catch((err) => {
        this.schemaPromise = null;
        throw err;
      });
    }
    return this.schemaPromise;
  }
  async checkHealth() {
    try {
      await this.ensureSchema();
      await this.client.execute("SELECT 1");
      return { ok: true, database: "turso" };
    } catch (err) {
      return { ok: false, database: "turso", detail: err.message };
    }
  }
  async ensureDemoUserExists() {
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
        demo.created_at
      ]
    );
    const { rows } = await this.client.execute(
      "SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
      [demo.email]
    );
    return rows[0] || demo;
  }
  async findUserById(id) {
    await this.ensureSchema();
    const { rows } = await this.client.execute(
      "SELECT * FROM users WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] || null;
  }
  async findUserByEmail(email) {
    await this.ensureSchema();
    const cleanEmail = email.toLowerCase();
    const { rows } = await this.client.execute(
      "SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1",
      [cleanEmail]
    );
    if (rows[0]) return rows[0];
    if (cleanEmail === "demo@kalkuduit.id") {
      return this.ensureDemoUserExists();
    }
    return null;
  }
  async getFallbackDemoUser() {
    await this.ensureSchema();
    const { rows } = await this.client.execute(
      "SELECT * FROM users ORDER BY created_at ASC LIMIT 1"
    );
    if (rows[0]) return rows[0];
    return this.ensureDemoUserExists();
  }
  async createUser(user) {
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
        user.created_at
      ]
    );
    return user;
  }
  async updateUser(id, patch) {
    await this.ensureSchema();
    const sets = [];
    const args = [];
    if (patch.name !== void 0) {
      sets.push("name = ?");
      args.push(patch.name);
    }
    if (patch.avatar !== void 0) {
      sets.push("avatar = ?");
      args.push(patch.avatar || null);
    }
    if (sets.length > 0) {
      args.push(id);
      await this.client.execute(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, args);
    }
    return this.findUserById(id);
  }
  async findValidSession(token) {
    await this.ensureSchema();
    const { rows } = await this.client.execute(
      "SELECT * FROM sessions WHERE token = ? AND expires_at > ? LIMIT 1",
      [token, Date.now()]
    );
    if (!rows[0]) return null;
    return {
      token: String(rows[0].token),
      user_id: String(rows[0].user_id),
      expires_at: Number(rows[0].expires_at)
    };
  }
  async createSession(session) {
    await this.ensureSchema();
    await this.client.execute(
      "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
      [session.token, session.user_id, session.expires_at]
    );
  }
  async getNeedsByUser(userId) {
    await this.ensureSchema();
    const { rows } = await this.client.execute(
      "SELECT * FROM needs WHERE user_id = ? ORDER BY created_at ASC",
      [userId]
    );
    return rows.map(mapNeedRow);
  }
  async createNeed(need) {
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
        need.allocation_mode || "nominal",
        need.priority,
        need.billing_cycle,
        Number(need.target_amount) || 0,
        Number(need.percentage) || 0,
        need.is_active ? 1 : 0,
        need.icon || "Tag",
        need.color || "#113829",
        need.note || "",
        need.created_at
      ]
    );
    return need;
  }
  async updateNeed(id, userId, patch) {
    await this.ensureSchema();
    const allowed = [
      "name",
      "type",
      "allocation_mode",
      "priority",
      "billing_cycle",
      "target_amount",
      "percentage",
      "is_active",
      "icon",
      "color",
      "note"
    ];
    const sets = [];
    const args = [];
    for (const key of allowed) {
      if (patch[key] !== void 0) {
        sets.push(`${key} = ?`);
        if (key === "is_active") {
          args.push(patch[key] ? 1 : 0);
        } else if (key === "target_amount" || key === "percentage") {
          args.push(Number(patch[key]) || 0);
        } else {
          args.push(patch[key]);
        }
      }
    }
    if (sets.length > 0) {
      args.push(id, userId);
      await this.client.execute(
        `UPDATE needs SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
        args
      );
    }
    const { rows } = await this.client.execute(
      "SELECT * FROM needs WHERE id = ? AND user_id = ? LIMIT 1",
      [id, userId]
    );
    return rows[0] ? mapNeedRow(rows[0]) : null;
  }
  async deleteNeed(id, userId) {
    await this.ensureSchema();
    const { affectedRowCount } = await this.client.execute(
      "DELETE FROM needs WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    return affectedRowCount > 0;
  }
  async getTransactionsByUser(userId, filters) {
    await this.ensureSchema();
    const where = ["user_id = ?"];
    const args = [userId];
    if (filters?.period_id) {
      where.push("period_id = ?");
      args.push(filters.period_id);
    }
    if (filters?.need_id) {
      where.push("need_id = ?");
      args.push(filters.need_id);
    }
    if (filters?.type) {
      where.push("type = ?");
      args.push(filters.type);
    }
    if (filters?.start_date) {
      where.push("date >= ?");
      args.push(filters.start_date);
    }
    if (filters?.end_date) {
      where.push("date <= ?");
      args.push(filters.end_date);
    }
    const { rows } = await this.client.execute(
      `SELECT * FROM transactions WHERE ${where.join(" AND ")} ORDER BY date DESC, created_at DESC`,
      args
    );
    return rows.map(mapTransactionRow);
  }
  async createTransaction(tx) {
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
        tx.note || "",
        tx.created_at
      ]
    );
    return tx;
  }
  async updateTransaction(id, userId, patch) {
    await this.ensureSchema();
    const allowed = ["period_id", "need_id", "type", "amount", "date", "note"];
    const sets = [];
    const args = [];
    for (const key of allowed) {
      if (patch[key] !== void 0) {
        sets.push(`${key} = ?`);
        if (key === "amount") {
          args.push(Number(patch[key]) || 0);
        } else {
          args.push(patch[key] ?? null);
        }
      }
    }
    if (sets.length > 0) {
      args.push(id, userId);
      await this.client.execute(
        `UPDATE transactions SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
        args
      );
    }
    const { rows } = await this.client.execute(
      "SELECT * FROM transactions WHERE id = ? AND user_id = ? LIMIT 1",
      [id, userId]
    );
    return rows[0] ? mapTransactionRow(rows[0]) : null;
  }
  async deleteTransaction(id, userId) {
    await this.ensureSchema();
    const { affectedRowCount } = await this.client.execute(
      "DELETE FROM transactions WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    return affectedRowCount > 0;
  }
  async getPeriodsByUser(userId) {
    await this.ensureSchema();
    const { rows } = await this.client.execute(
      "SELECT * FROM weekly_periods WHERE user_id = ? ORDER BY start_date ASC",
      [userId]
    );
    return rows.map(mapPeriodRow);
  }
  async createOrGetPeriod(period) {
    await this.ensureSchema();
    const { rows: existing } = await this.client.execute(
      "SELECT * FROM weekly_periods WHERE user_id = ? AND start_date = ? AND end_date = ? LIMIT 1",
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
        period.notes || ""
      ]
    );
    const { rows: saved } = await this.client.execute(
      "SELECT * FROM weekly_periods WHERE user_id = ? AND start_date = ? AND end_date = ? LIMIT 1",
      [period.user_id, period.start_date, period.end_date]
    );
    return saved[0] ? mapPeriodRow(saved[0]) : period;
  }
  async updatePeriod(id, userId, patch) {
    await this.ensureSchema();
    const sets = [];
    const args = [];
    if (patch.total_income_target !== void 0) {
      sets.push("total_income_target = ?");
      args.push(Number(patch.total_income_target) || 0);
    }
    if (patch.notes !== void 0) {
      sets.push("notes = ?");
      args.push(patch.notes || "");
    }
    if (sets.length > 0) {
      args.push(id, userId);
      await this.client.execute(
        `UPDATE weekly_periods SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
        args
      );
    }
    const { rows } = await this.client.execute(
      "SELECT * FROM weekly_periods WHERE id = ? AND user_id = ? LIMIT 1",
      [id, userId]
    );
    return rows[0] ? mapPeriodRow(rows[0]) : null;
  }
  async resetUserData(userId) {
    await this.ensureSchema();
    await this.client.batch([
      { sql: "DELETE FROM transactions WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM needs WHERE user_id = ?", args: [userId] },
      { sql: "UPDATE weekly_periods SET total_income_target = 0 WHERE user_id = ?", args: [userId] }
    ]);
  }
  async loadTemplateData(userId) {
    await this.ensureSchema();
    const templateNeeds = getRecommendedTemplateNeeds(userId);
    await this.client.batch([
      { sql: "DELETE FROM transactions WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM needs WHERE user_id = ?", args: [userId] },
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
          n.allocation_mode || "nominal",
          n.priority,
          n.billing_cycle,
          Number(n.target_amount) || 0,
          Number(n.percentage) || 0,
          n.is_active ? 1 : 0,
          n.icon || "Tag",
          n.color || "#113829",
          n.note || "",
          n.created_at
        ]
      })),
      { sql: "UPDATE weekly_periods SET total_income_target = 160000 WHERE user_id = ?", args: [userId] }
    ]);
    return templateNeeds;
  }
};
var cachedRepo = null;
var cachedMode = null;
function getDbRepository() {
  const cfg = getDatabaseConfig();
  if (cachedRepo && cachedMode === cfg.mode) {
    return cachedRepo;
  }
  const tursoClient = createTursoClient();
  if (tursoClient) {
    console.log("\u{1F5C4}\uFE0F Database aktif: Turso (libSQL)");
    cachedRepo = new TursoDatabaseRepository(tursoClient);
    cachedMode = "turso";
    return cachedRepo;
  }
  console.log("\u{1F5C4}\uFE0F Database aktif: Local JSON (data/db.json) \u2014 isi .env untuk memakai Turso");
  cachedRepo = new JsonDatabaseRepository();
  cachedMode = "local-json";
  return cachedRepo;
}

// src/lib/engine.ts
function getNeedAllocationMode(need) {
  if (need.allocation_mode) return need.allocation_mode;
  if (need.type === "flexible") return "percent_remainder";
  return "nominal";
}
function getNeedPeriodTarget(need, periodMode = "weekly") {
  const mode = getNeedAllocationMode(need);
  if (mode !== "nominal") {
    return 0;
  }
  const amount = need.target_amount || 0;
  if (periodMode === "monthly") {
    return need.billing_cycle === "monthly" ? amount : convertWeeklyToMonthly(amount);
  }
  if (need.billing_cycle === "monthly") {
    return convertMonthlyToWeekly(amount);
  }
  return amount;
}
function isSavingsOrEmergencyNeed(need) {
  const name = need.name.toLowerCase();
  return name.includes("tabung") || name.includes("darurat") || name.includes("invest") || name.includes("emas") || name.includes("deposito") || name.includes("saham");
}
function calculateHybridAllocation(incomeInput, needs, transactions = [], periodMode = "weekly") {
  const activeNeeds = needs.filter((n) => n.is_active);
  const incomeTransactions = transactions.filter((t) => t.type === "income");
  const expenseTransactions = transactions.filter((t) => t.type === "expense");
  const transactionIncomeSum = incomeTransactions.reduce((acc, t) => acc + t.amount, 0);
  const total_income = transactionIncomeSum > 0 ? transactionIncomeSum : incomeInput || 0;
  const total_expenses = expenseTransactions.reduce((acc, t) => acc + t.amount, 0);
  const actual_balance = total_income - total_expenses;
  const committedNeeds = [];
  const remainderNeeds = [];
  const committedTargets = /* @__PURE__ */ new Map();
  const formulaLabels = /* @__PURE__ */ new Map();
  let fixed_total = 0;
  for (const need of activeNeeds) {
    const mode = getNeedAllocationMode(need);
    if (mode === "percent_remainder") {
      remainderNeeds.push(need);
    } else {
      committedNeeds.push(need);
      let target = 0;
      let label = "";
      if (mode === "percent_income") {
        const pct = need.percentage || 0;
        target = Math.round(total_income * (pct / 100));
        label = `${pct}% dari pemasukan (Rp ${total_income.toLocaleString("id-ID")})`;
      } else {
        target = getNeedPeriodTarget(need, periodMode);
        if (periodMode === "monthly") {
          label = need.billing_cycle === "monthly" ? `Tagihan bulanan Rp ${target.toLocaleString("id-ID")}/bln` : `Mingguan Rp ${(need.target_amount || 0).toLocaleString("id-ID")}/pekan (total ~Rp ${target.toLocaleString("id-ID")}/bln)`;
        } else {
          label = need.billing_cycle === "monthly" ? `Tagihan Rp ${need.target_amount.toLocaleString("id-ID")}/bln (sisihan ~Rp ${target.toLocaleString("id-ID")}/pekan)` : `Nominal tetap Rp ${target.toLocaleString("id-ID")}/pekan`;
        }
      }
      committedTargets.set(need.id, target);
      formulaLabels.set(need.id, label);
      fixed_total += target;
    }
  }
  const net_remainder = total_income - fixed_total;
  let status = "aman";
  let status_label = "Bujet Aman";
  let status_description = "Pemasukan menutup semua kebutuhan terencana dan menyisakan dana untuk pos tabungan/fleksibel.";
  let deficit_amount = 0;
  const trimming_suggestions = [];
  let target_additional_income = 0;
  if (net_remainder < 0) {
    status = "defisit";
    deficit_amount = Math.abs(net_remainder);
    target_additional_income = deficit_amount;
    status_label = "Defisit";
    status_description = `Pengeluaran terencana melebihi pemasukan sebesar Rp ${deficit_amount.toLocaleString("id-ID")}. Pangkas pos keinginan atau tambah pemasukan.`;
    let remainingDeficitToCut = deficit_amount;
    const keinginanCommitted = committedNeeds.filter((n) => n.priority === "keinginan");
    for (const item of keinginanCommitted) {
      if (remainingDeficitToCut <= 0) break;
      const amount = committedTargets.get(item.id) || 0;
      if (amount > 0) {
        const cut = Math.min(amount, remainingDeficitToCut);
        trimming_suggestions.push({
          need_id: item.id,
          need_name: item.name,
          priority: item.priority,
          original_amount: amount,
          suggested_cut: cut,
          new_amount: amount - cut,
          reason: `Pos keinginan. Pangkas Rp ${cut.toLocaleString("id-ID")} untuk menutup defisit.`
        });
        remainingDeficitToCut -= cut;
      }
    }
    if (remainingDeficitToCut > 0) {
      const pentingCommitted = committedNeeds.filter((n) => n.priority === "penting");
      for (const item of pentingCommitted) {
        if (remainingDeficitToCut <= 0) break;
        const amount = committedTargets.get(item.id) || 0;
        if (amount > 0) {
          const cut = Math.min(amount, remainingDeficitToCut);
          trimming_suggestions.push({
            need_id: item.id,
            need_name: item.name,
            priority: item.priority,
            original_amount: amount,
            suggested_cut: cut,
            new_amount: amount - cut,
            reason: `Pos penting. Pangkas Rp ${cut.toLocaleString("id-ID")} karena pemangkasan pos keinginan belum menutup seluruh defisit.`
          });
          remainingDeficitToCut -= cut;
        }
      }
    }
    if (remainingDeficitToCut > 0) {
      target_additional_income = deficit_amount;
    }
  } else if (total_income > 0 && net_remainder / total_income < 0.1) {
    status = "ketat";
    status_label = "Bujet Ketat";
    status_description = "Sisa dana setelah kebutuhan terencana di bawah 10% pemasukan. Tunda belanja non-pokok.";
  } else if (total_income === 0) {
    status = "ketat";
    status_label = "Belum Ada Pemasukan";
    status_description = "Masukkan target atau catat pemasukan untuk menghitung alokasi bujet.";
  }
  const remainderAllocations = /* @__PURE__ */ new Map();
  let totalRemainderPercent = remainderNeeds.reduce((acc, n) => acc + (n.percentage || 0), 0);
  if (totalRemainderPercent === 0 && remainderNeeds.length > 0) {
    totalRemainderPercent = 100;
  }
  if (net_remainder > 0) {
    for (const rn of remainderNeeds) {
      const weight = rn.percentage || 100 / (remainderNeeds.length || 1);
      const normalizedRatio = totalRemainderPercent > 0 ? weight / totalRemainderPercent : 0;
      const allocated = Math.round(net_remainder * normalizedRatio);
      remainderAllocations.set(rn.id, allocated);
      formulaLabels.set(
        rn.id,
        `${rn.percentage}% dari sisa kas (Rp ${net_remainder.toLocaleString("id-ID")})`
      );
    }
  } else {
    for (const rn of remainderNeeds) {
      remainderAllocations.set(rn.id, 0);
      formulaLabels.set(rn.id, `${rn.percentage}% dari sisa kas (Rp 0 saat defisit)`);
    }
  }
  const allocations = [];
  let savings_total_allocated = 0;
  for (const need of activeNeeds) {
    const mode = getNeedAllocationMode(need);
    const isCommitted = mode !== "percent_remainder";
    const weekly_target = isCommitted ? committedTargets.get(need.id) || 0 : remainderAllocations.get(need.id) || 0;
    const allocated_amount = isCommitted ? weekly_target : remainderAllocations.get(need.id) || 0;
    const spent_amount = expenseTransactions.filter((t) => t.need_id === need.id).reduce((acc, t) => acc + t.amount, 0);
    const remaining_amount = allocated_amount - spent_amount;
    const usage_percentage = allocated_amount > 0 ? spent_amount / allocated_amount * 100 : spent_amount > 0 ? 100 : 0;
    const is_overbudget = spent_amount > allocated_amount;
    const overbudget_amount = is_overbudget ? spent_amount - allocated_amount : 0;
    if (isSavingsOrEmergencyNeed(need)) {
      savings_total_allocated += allocated_amount;
    }
    allocations.push({
      need,
      weekly_target,
      allocated_amount,
      spent_amount,
      remaining_amount,
      usage_percentage,
      is_overbudget,
      overbudget_amount,
      formula_label: formulaLabels.get(need.id) || "Alokasi disesuaikan"
    });
  }
  allocations.sort((a, b) => {
    if (a.is_overbudget && !b.is_overbudget) return -1;
    if (!a.is_overbudget && b.is_overbudget) return 1;
    const aMode = getNeedAllocationMode(a.need);
    const bMode = getNeedAllocationMode(b.need);
    if (aMode !== "percent_remainder" && bMode === "percent_remainder") return -1;
    if (aMode === "percent_remainder" && bMode !== "percent_remainder") return 1;
    const pOrder = { wajib: 0, penting: 1, keinginan: 2 };
    return pOrder[a.need.priority] - pOrder[b.need.priority];
  });
  const savings_ratio = total_income > 0 ? savings_total_allocated / total_income * 100 : 0;
  let surplus_advice = void 0;
  if (status === "aman" && total_income > 0) {
    const is_ideal = savings_ratio >= 20;
    let additional_income_for_ideal_savings = 0;
    if (!is_ideal) {
      const savingsShortfall = 0.2 * total_income - savings_total_allocated;
      additional_income_for_ideal_savings = Math.max(0, Math.round(savingsShortfall));
    }
    const unitPerPeriod = periodMode === "monthly" ? "bulan" : "minggu";
    surplus_advice = {
      current_savings_ratio: Math.round(savings_ratio * 10) / 10,
      is_ideal,
      additional_income_for_ideal_savings: !is_ideal ? additional_income_for_ideal_savings : void 0,
      recommended_savings_boost: is_ideal ? Math.round(net_remainder * 0.1) : void 0,
      note: is_ideal ? `Rasio tabungan dan darurat ${Math.round(savings_ratio)}%, memenuhi target 20%.` : `Rasio tabungan ${Math.round(savings_ratio)}%, di bawah target 20%. Tambah pemasukan Rp ${additional_income_for_ideal_savings.toLocaleString("id-ID")}/${unitPerPeriod} atau pangkas pos keinginan untuk menutup selisih.`
    };
  }
  return {
    total_income,
    total_expenses,
    actual_balance,
    fixed_total,
    net_remainder,
    status,
    status_label,
    status_description,
    allocations,
    deficit_amount,
    trimming_suggestions,
    target_additional_income,
    savings_total_allocated,
    savings_ratio: Math.round(savings_ratio * 10) / 10,
    surplus_advice
  };
}
function simulateWhatIf(currentIncome, currentNeeds, scenario, periodMode = "weekly") {
  const beforeResult = calculateHybridAllocation(currentIncome, currentNeeds, [], periodMode);
  let simulatedIncome = currentIncome;
  if (scenario.simulated_income_change !== void 0) {
    simulatedIncome = Math.max(0, currentIncome + scenario.simulated_income_change);
  }
  let simulatedNeeds = currentNeeds.map((n) => ({ ...n }));
  if (scenario.removed_need_id) {
    simulatedNeeds = simulatedNeeds.filter((n) => n.id !== scenario.removed_need_id);
  }
  if (scenario.added_or_modified_need) {
    const mod = scenario.added_or_modified_need;
    if (mod.id) {
      simulatedNeeds = simulatedNeeds.map(
        (n) => n.id === mod.id ? { ...n, ...mod } : n
      );
    } else {
      const dummyNewNeed = {
        id: "hypothetical-new-need",
        user_id: "hypothetical",
        name: mod.name || "Pos Tambahan Baru",
        type: mod.type || (mod.allocation_mode === "percent_remainder" ? "flexible" : "fixed"),
        allocation_mode: mod.allocation_mode || "nominal",
        priority: mod.priority || "keinginan",
        billing_cycle: mod.billing_cycle || "weekly",
        target_amount: mod.target_amount || 0,
        percentage: mod.percentage || 0,
        is_active: true,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      simulatedNeeds.push(dummyNewNeed);
    }
  }
  const afterResult = calculateHybridAllocation(simulatedIncome, simulatedNeeds, [], periodMode);
  const diffSavings = afterResult.savings_total_allocated - beforeResult.savings_total_allocated;
  const diffRemainder = afterResult.net_remainder - beforeResult.net_remainder;
  const is_viable = afterResult.status !== "defisit";
  let impact_summary = "";
  let recommendation = "";
  if (afterResult.status === "defisit") {
    impact_summary = `Bujet defisit Rp ${afterResult.deficit_amount.toLocaleString("id-ID")}.`;
    recommendation = `Tambah pemasukan Rp ${afterResult.deficit_amount.toLocaleString("id-ID")} atau pangkas pos keinginan sebelum menerapkan skenario ini.`;
  } else if (beforeResult.status === "defisit") {
    impact_summary = `Status bujet berubah dari defisit menjadi ${afterResult.status}.`;
    recommendation = `Skenario ini aman untuk diterapkan.`;
  } else {
    const savingsChangeText = diffSavings < 0 ? `mengurangi alokasi tabungan sebesar Rp ${Math.abs(diffSavings).toLocaleString("id-ID")}` : diffSavings > 0 ? `menambah alokasi tabungan sebesar Rp ${diffSavings.toLocaleString("id-ID")}` : `tidak mengubah alokasi tabungan`;
    impact_summary = `Status bujet ${afterResult.status}. Skenario ini ${savingsChangeText} per ${periodMode === "monthly" ? "bulan" : "minggu"}. Sisa dana bersih menjadi Rp ${afterResult.net_remainder.toLocaleString("id-ID")}.`;
    if (afterResult.savings_ratio >= 15) {
      recommendation = `Rasio tabungan tetap di angka ${afterResult.savings_ratio}%.`;
    } else {
      recommendation = `Rasio tabungan turun menjadi ${afterResult.savings_ratio}%, di bawah target 20%.`;
    }
  }
  return {
    before: {
      total_income: beforeResult.total_income,
      fixed_total: beforeResult.fixed_total,
      net_remainder: beforeResult.net_remainder,
      savings_amount: beforeResult.savings_total_allocated,
      status: beforeResult.status
    },
    after: {
      total_income: afterResult.total_income,
      fixed_total: afterResult.fixed_total,
      net_remainder: afterResult.net_remainder,
      savings_amount: afterResult.savings_total_allocated,
      status: afterResult.status
    },
    impact_summary,
    difference_savings: diffSavings,
    difference_remainder: diffRemainder,
    is_viable,
    recommendation
  };
}

// src/server/router.ts
loadEnvFiles();
var apiRouter = express.Router();
var asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
apiRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    const repo = getDbRepository();
    const health = await repo.checkHealth();
    res.status(health.ok ? 200 : 500).json({
      ...health,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  })
);
var authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const repo = getDbRepository();
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const session = await repo.findValidSession(token);
    if (session) {
      const user = await repo.findUserById(session.user_id);
      if (user) {
        req.user = user;
        return next();
      }
    }
  }
  res.status(401).json({ error: "Sesi login tidak valid atau telah berakhir. Silakan masuk kembali." });
});
apiRouter.get("/auth/config", (_req, res) => {
  const googleClientId = getGoogleClientId();
  res.json({
    googleClientId: googleClientId || null,
    googleEnabled: Boolean(googleClientId)
  });
});
apiRouter.post(
  "/auth/register",
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      res.status(400).json({ error: "Nama, email, dan password wajib diisi." });
      return;
    }
    const repo = getDbRepository();
    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await repo.findUserByEmail(cleanEmail);
    if (existing) {
      res.status(400).json({ error: "Email sudah terdaftar." });
      return;
    }
    const userId = `user-${Date.now()}`;
    const newUser = await repo.createUser({
      id: userId,
      name: String(name).trim(),
      email: cleanEmail,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      password_hash: hashPassword(String(password))
    });
    const token = generateToken();
    await repo.createSession({
      token,
      user_id: userId,
      expires_at: Date.now() + 30 * 24 * 60 * 60 * 1e3
      // 30 days
    });
    const { password_hash, ...safeUser } = newUser;
    res.json({ user: safeUser, token });
  })
);
apiRouter.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: "Email dan password wajib diisi." });
      return;
    }
    const repo = getDbRepository();
    const user = await repo.findUserByEmail(String(email).trim().toLowerCase());
    if (!user) {
      res.status(401).json({ error: "Email atau password salah." });
      return;
    }
    if (user.password_hash === "google-oauth") {
      res.status(401).json({
        error: "Akun ini terdaftar lewat Google. Silakan masuk menggunakan tombol Google."
      });
      return;
    }
    if (!verifyPassword(String(password), user.password_hash)) {
      res.status(401).json({ error: "Email atau password salah." });
      return;
    }
    const token = generateToken();
    await repo.createSession({
      token,
      user_id: user.id,
      expires_at: Date.now() + 30 * 24 * 60 * 60 * 1e3
    });
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  })
);
apiRouter.post(
  "/auth/google",
  asyncHandler(async (req, res) => {
    const { credential } = req.body || {};
    if (!credential || typeof credential !== "string") {
      res.status(400).json({ error: "Token kredensial Google tidak ditemukan." });
      return;
    }
    const googleClientId = getGoogleClientId();
    if (!googleClientId) {
      res.status(500).json({
        error: "GOOGLE_CLIENT_ID belum dikonfigurasi di server (.env atau Environment Variables)."
      });
      return;
    }
    let googleUser;
    try {
      googleUser = await verifyGoogleIdToken(credential, googleClientId);
    } catch (err) {
      res.status(401).json({ error: err?.message || "Verifikasi akun Google gagal." });
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
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        password_hash: "google-oauth"
      });
    } else if (googleUser.name && googleUser.name !== user.name || googleUser.picture && googleUser.picture !== user.avatar) {
      const updated = await repo.updateUser(user.id, {
        name: googleUser.name || user.name,
        avatar: googleUser.picture || user.avatar
      });
      if (updated) user = updated;
    }
    const token = generateToken();
    await repo.createSession({
      token,
      user_id: user.id,
      expires_at: Date.now() + 30 * 24 * 60 * 60 * 1e3
      // 30 days
    });
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token, isNewUser });
  })
);
apiRouter.post(
  "/auth/demo",
  asyncHandler(async (_req, res) => {
    const repo = getDbRepository();
    let demoUser = await repo.findUserByEmail("demo@kalkuduit.id");
    if (!demoUser) {
      demoUser = await repo.getFallbackDemoUser();
    }
    if (!demoUser) {
      res.status(404).json({ error: "Akun demo belum tersedia." });
      return;
    }
    const token = generateToken();
    await repo.createSession({
      token,
      user_id: demoUser.id,
      expires_at: Date.now() + 30 * 24 * 60 * 60 * 1e3
    });
    const { password_hash, ...safeUser } = demoUser;
    res.json({ user: safeUser, token });
  })
);
apiRouter.get("/auth/me", authMiddleware, (req, res) => {
  const user = req.user;
  const { password_hash, ...safeUser } = user;
  res.json({ user: safeUser });
});
apiRouter.get(
  "/needs",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const repo = getDbRepository();
    const userNeeds = await repo.getNeedsByUser(user.id);
    res.json(userNeeds);
  })
);
apiRouter.post(
  "/needs",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const { name, type, allocation_mode, priority, billing_cycle, target_amount, percentage, icon, color, note } = req.body;
    if (!name || !priority) {
      res.status(400).json({ error: "Nama dan prioritas kebutuhan wajib diisi." });
      return;
    }
    const determinedMode = allocation_mode || (type === "flexible" ? "percent_remainder" : "nominal");
    const determinedType = determinedMode === "percent_remainder" ? "flexible" : "fixed";
    const repo = getDbRepository();
    const newNeed = {
      id: `need-${Date.now()}`,
      user_id: user.id,
      name,
      type: determinedType,
      allocation_mode: determinedMode,
      priority: priority || "penting",
      billing_cycle: billing_cycle || "weekly",
      target_amount: Number(target_amount) || 0,
      percentage: Number(percentage) || 0,
      is_active: true,
      icon: icon || "Tag",
      color: color || "#10b981",
      note: note || "",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const created = await repo.createNeed(newNeed);
    res.status(201).json(created);
  })
);
apiRouter.put(
  "/needs/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const needId = String(req.params.id);
    const repo = getDbRepository();
    const updated = await repo.updateNeed(needId, user.id, req.body);
    if (!updated) {
      res.status(404).json({ error: "Kebutuhan tidak ditemukan." });
      return;
    }
    res.json(updated);
  })
);
apiRouter.delete(
  "/needs/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const needId = String(req.params.id);
    const repo = getDbRepository();
    const deleted = await repo.deleteNeed(needId, user.id);
    if (!deleted) {
      res.status(404).json({ error: "Kebutuhan tidak ditemukan." });
      return;
    }
    res.json({ success: true, message: "Kebutuhan berhasil dihapus." });
  })
);
apiRouter.get(
  "/transactions",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const { period_id, need_id, type, start_date, end_date } = req.query;
    const repo = getDbRepository();
    const list = await repo.getTransactionsByUser(user.id, {
      period_id,
      need_id,
      type,
      start_date,
      end_date
    });
    res.json(list);
  })
);
apiRouter.post(
  "/transactions",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const { period_id, need_id, type, amount, date, note } = req.body;
    if (!type || !amount || !date) {
      res.status(400).json({ error: "Jenis, nominal, dan tanggal transaksi wajib diisi." });
      return;
    }
    const repo = getDbRepository();
    const newTx = {
      id: `tx-${Date.now()}`,
      user_id: user.id,
      period_id: period_id || void 0,
      need_id: need_id || null,
      type: type === "income" ? "income" : "expense",
      amount: Number(amount),
      date,
      note: note || "",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const created = await repo.createTransaction(newTx);
    res.status(201).json(created);
  })
);
apiRouter.put(
  "/transactions/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const txId = String(req.params.id);
    const repo = getDbRepository();
    const updated = await repo.updateTransaction(txId, user.id, req.body);
    if (!updated) {
      res.status(404).json({ error: "Transaksi tidak ditemukan." });
      return;
    }
    res.json(updated);
  })
);
apiRouter.delete(
  "/transactions/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const txId = String(req.params.id);
    const repo = getDbRepository();
    const deleted = await repo.deleteTransaction(txId, user.id);
    if (!deleted) {
      res.status(404).json({ error: "Transaksi tidak ditemukan." });
      return;
    }
    res.json({ success: true, message: "Transaksi berhasil dihapus." });
  })
);
apiRouter.get(
  "/periods",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const repo = getDbRepository();
    const periods = await repo.getPeriodsByUser(user.id);
    res.json(periods);
  })
);
apiRouter.post(
  "/periods",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const { start_date, end_date, label, total_income_target, notes } = req.body;
    const repo = getDbRepository();
    const period = {
      id: `period-${Date.now()}`,
      user_id: user.id,
      start_date,
      end_date,
      label,
      total_income_target: Number(total_income_target) || 0,
      notes: notes || ""
    };
    const result = await repo.createOrGetPeriod(period);
    res.status(result.id === period.id ? 201 : 200).json(result);
  })
);
apiRouter.put(
  "/periods/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const periodId = String(req.params.id);
    const repo = getDbRepository();
    const updated = await repo.updatePeriod(periodId, user.id, req.body);
    if (!updated) {
      res.status(404).json({ error: "Periode tidak ditemukan." });
      return;
    }
    res.json(updated);
  })
);
apiRouter.get(
  "/engine/calculate",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const { start_date, end_date, income_target, period_mode } = req.query;
    const repo = getDbRepository();
    const userNeeds = await repo.getNeedsByUser(user.id);
    const userTransactions = await repo.getTransactionsByUser(user.id, {
      start_date,
      end_date
    });
    const income = Number(income_target) || 0;
    const mode = period_mode === "monthly" ? "monthly" : "weekly";
    const result = calculateHybridAllocation(income, userNeeds, userTransactions, mode);
    res.json(result);
  })
);
apiRouter.post(
  "/engine/simulate",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const { current_income, scenario, period_mode } = req.body;
    const repo = getDbRepository();
    const userNeeds = await repo.getNeedsByUser(user.id);
    const mode = period_mode === "monthly" ? "monthly" : "weekly";
    const result = simulateWhatIf(Number(current_income) || 0, userNeeds, scenario, mode);
    res.json(result);
  })
);
apiRouter.post(
  "/user/reset",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const repo = getDbRepository();
    await repo.resetUserData(user.id);
    res.json({ success: true, message: "Data berhasil direset ke nol." });
  })
);
apiRouter.post(
  "/user/load-template",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const repo = getDbRepository();
    const templateNeeds = await repo.loadTemplateData(user.id);
    res.json({ success: true, message: "Template awal berhasil dimuat.", needs: templateNeeds });
  })
);
apiRouter.use((err, _req, res, _next) => {
  console.error("API Error:", err);
  res.status(500).json({ error: err?.message || "Terjadi kesalahan pada server database." });
});

// src/server/vercel.ts
var app = express2();
app.use((req, _res, next) => {
  const vp = req.query.__vercel_path;
  if (typeof vp === "string") {
    const cleanPath = vp.startsWith("/") ? vp : `/${vp}`;
    const parsed = new URL(req.url, "http://localhost");
    parsed.searchParams.delete("__vercel_path");
    const qs = parsed.searchParams.toString();
    req.url = `/api${cleanPath}${qs ? `?${qs}` : ""}`;
  }
  if (req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
    req._body = true;
  }
  next();
});
app.use(express2.json());
app.use("/api", apiRouter);
app.use("/", apiRouter);
function handler(req, res) {
  try {
    return app(req, res);
  } catch (err) {
    console.error("Vercel Handler Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || "Internal server error" });
    }
  }
}
export {
  handler as default
};
