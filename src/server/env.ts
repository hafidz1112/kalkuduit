import fs from 'fs';
import path from 'path';

let envLoaded = false;

/**
 * Load variables from .env and .env.local into process.env (without overriding existing env vars)
 */
export function loadEnvFiles(): void {
  if (envLoaded) return;
  envLoaded = true;

  const envFiles = ['.env', '.env.local'];
  for (const fileName of envFiles) {
    const filePath = path.resolve(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) continue;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split(/\r?\n/);

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const eqIndex = line.indexOf('=');
        if (eqIndex === -1) continue;

        const key = line.slice(0, eqIndex).trim();
        let value = line.slice(eqIndex + 1).trim();

        // Strip matching surrounding quotes
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        if (key && process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    } catch (err) {
      console.warn(`Gagal membaca ${fileName}:`, err);
    }
  }
}

export interface DatabaseConfig {
  mode: 'turso' | 'supabase' | 'local-json';
  tursoUrl?: string;
  tursoAuthToken?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  usingServiceRole: boolean;
}

function normalizeTursoHttpUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (trimmed.startsWith('libsql://')) {
    return `https://${trimmed.slice('libsql://'.length)}`;
  }
  return trimmed;
}

export function getDatabaseConfig(): DatabaseConfig {
  loadEnvFiles();

  // 1. Prioritas utama: Turso (libSQL)
  const rawTursoUrl = (process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || '').trim();
  const tursoAuthToken = (process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN || '').trim();

  if (rawTursoUrl && tursoAuthToken) {
    return {
      mode: 'turso',
      tursoUrl: normalizeTursoHttpUrl(rawTursoUrl),
      tursoAuthToken,
      usingServiceRole: false,
    };
  }

  // 2. Alternatif: Supabase
  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  const supabaseKey = serviceKey || anonKey;

  if (supabaseUrl && supabaseKey) {
    return {
      mode: 'supabase',
      supabaseUrl,
      supabaseKey,
      usingServiceRole: Boolean(serviceKey),
    };
  }

  // 3. Fallback: Local JSON
  return {
    mode: 'local-json',
    usingServiceRole: false,
  };
}
