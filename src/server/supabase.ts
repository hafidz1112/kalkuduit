import { getDatabaseConfig } from './env';

export interface SupabaseFilter {
  column: string;
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'ilike';
  value: string | number | boolean;
}

export class SupabaseClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(url: string, key: string) {
    this.baseUrl = `${url}/rest/v1`;
    this.apiKey = key;
  }

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      apikey: this.apiKey,
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  private buildQueryUrl(
    table: string,
    filters: SupabaseFilter[] = [],
    options?: { select?: string; order?: string; limit?: number; onConflict?: string }
  ): string {
    const params = new URLSearchParams();
    params.set('select', options?.select || '*');

    for (const f of filters) {
      params.append(f.column, `${f.op}.${String(f.value)}`);
    }
    if (options?.order) {
      params.set('order', options.order);
    }
    if (options?.limit !== undefined) {
      params.set('limit', String(options.limit));
    }
    if (options?.onConflict) {
      params.set('on_conflict', options.onConflict);
    }

    return `${this.baseUrl}/${table}?${params.toString()}`;
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      const text = await res.text();
      let message = `Supabase HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(text);
        message = parsed.message || parsed.error_description || parsed.hint || message;
      } catch {
        if (text) message = text;
      }
      throw new Error(message);
    }

    if (res.status === 204) {
      return [] as unknown as T;
    }

    const text = await res.text();
    if (!text) return [] as unknown as T;
    return JSON.parse(text) as T;
  }

  async select<T>(
    table: string,
    filters: SupabaseFilter[] = [],
    options?: { select?: string; order?: string; limit?: number }
  ): Promise<T[]> {
    const url = this.buildQueryUrl(table, filters, options);
    const res = await fetch(url, {
      method: 'GET',
      headers: this.buildHeaders(),
    });
    return this.handleResponse<T[]>(res);
  }

  async insert<T>(table: string, rows: Record<string, unknown> | Record<string, unknown>[]): Promise<T[]> {
    const url = this.buildQueryUrl(table);
    const res = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify(rows),
    });
    return this.handleResponse<T[]>(res);
  }

  async upsert<T>(
    table: string,
    rows: Record<string, unknown> | Record<string, unknown>[],
    onConflict?: string
  ): Promise<T[]> {
    const url = this.buildQueryUrl(table, [], { onConflict });
    const res = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders({
        Prefer: 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify(rows),
    });
    return this.handleResponse<T[]>(res);
  }

  async update<T>(
    table: string,
    filters: SupabaseFilter[],
    patch: Record<string, unknown>
  ): Promise<T[]> {
    const url = this.buildQueryUrl(table, filters);
    const res = await fetch(url, {
      method: 'PATCH',
      headers: this.buildHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify(patch),
    });
    return this.handleResponse<T[]>(res);
  }

  async remove(table: string, filters: SupabaseFilter[]): Promise<void> {
    const url = this.buildQueryUrl(table, filters);
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.buildHeaders({ Prefer: 'return=minimal' }),
    });
    await this.handleResponse<unknown>(res);
  }
}

export function createSupabaseClient(): SupabaseClient | null {
  const cfg = getDatabaseConfig();
  if (cfg.mode !== 'supabase' || !cfg.supabaseUrl || !cfg.supabaseKey) {
    return null;
  }
  return new SupabaseClient(cfg.supabaseUrl, cfg.supabaseKey);
}
