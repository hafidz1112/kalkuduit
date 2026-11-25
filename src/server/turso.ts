import dns from 'node:dns';
import { getDatabaseConfig } from './env';

// Prefer IPv4 first on Windows/Node to avoid slow IPv6 connect timeouts to Turso
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignore if unsupported
}

export type TursoParam = string | number | boolean | null | undefined;

interface HranaArg {
  type: 'null' | 'text' | 'integer' | 'float';
  value?: string | number;
}

interface HranaCell {
  type: 'null' | 'text' | 'integer' | 'float' | 'blob';
  value?: string | number | null;
}

interface HranaExecuteResult {
  cols: { name: string; decltype?: string | null }[];
  rows: HranaCell[][];
  affected_row_count: number;
}

interface HranaPipelineResponse {
  results: Array<
    | {
        type: 'ok';
        response: {
          type: 'execute' | 'close';
          result?: HranaExecuteResult;
        };
      }
    | {
        type: 'error';
        error: {
          message: string;
          code?: string;
        };
      }
  >;
}

function encodeArg(val: TursoParam): HranaArg {
  if (val === null || val === undefined) {
    return { type: 'null' };
  }
  if (typeof val === 'boolean') {
    return { type: 'integer', value: val ? '1' : '0' };
  }
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return { type: 'null' };
    if (Number.isInteger(val)) {
      return { type: 'integer', value: String(val) };
    }
    return { type: 'float', value: val };
  }
  return { type: 'text', value: String(val) };
}

function decodeCell(cell: HranaCell): unknown {
  if (!cell || cell.type === 'null' || cell.value === undefined || cell.value === null) {
    return null;
  }
  if (cell.type === 'integer' || cell.type === 'float') {
    return Number(cell.value);
  }
  return cell.value;
}

export class TursoClient {
  private readonly pipelineUrl: string;
  private readonly authToken: string;

  constructor(httpUrl: string, authToken: string) {
    this.pipelineUrl = `${httpUrl}/v2/pipeline`;
    this.authToken = authToken;
  }

  async batch(
    statements: { sql: string; args?: TursoParam[] }[]
  ): Promise<{ rows: Record<string, unknown>[]; affectedRowCount: number }[]> {
    const requests = [
      ...statements.map((s) => ({
        type: 'execute' as const,
        stmt: {
          sql: s.sql,
          args: (s.args || []).map(encodeArg),
        },
      })),
      { type: 'close' as const },
    ];

    let res: Response | null = null;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await fetch(this.pipelineUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests }),
        });
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!res) {
      throw lastError instanceof Error ? lastError : new Error('Gagal terhubung ke Turso');
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Turso HTTP ${res.status}: ${text || 'Gagal terhubung ke Turso'}`);
    }

    const data = (await res.json()) as HranaPipelineResponse;
    const output: { rows: Record<string, unknown>[]; affectedRowCount: number }[] = [];

    for (let i = 0; i < statements.length; i++) {
      const item = data.results[i];
      if (!item) continue;
      if (item.type === 'error') {
        throw new Error(`Turso SQL error: ${item.error.message}`);
      }
      const execResult = item.response?.result;
      if (!execResult) {
        output.push({ rows: [], affectedRowCount: 0 });
        continue;
      }

      const cols = execResult.cols || [];
      const rows = (execResult.rows || []).map((rowCells) => {
        const obj: Record<string, unknown> = {};
        for (let c = 0; c < cols.length; c++) {
          obj[cols[c].name] = decodeCell(rowCells[c]);
        }
        return obj;
      });

      output.push({
        rows,
        affectedRowCount: execResult.affected_row_count || 0,
      });
    }

    return output;
  }

  async execute<T = Record<string, unknown>>(
    sql: string,
    args: TursoParam[] = []
  ): Promise<{ rows: T[]; affectedRowCount: number }> {
    const [result] = await this.batch([{ sql, args }]);
    return {
      rows: (result?.rows || []) as T[],
      affectedRowCount: result?.affectedRowCount || 0,
    };
  }
}

export function createTursoClient(): TursoClient | null {
  const cfg = getDatabaseConfig();
  if (cfg.mode !== 'turso' || !cfg.tursoUrl || !cfg.tursoAuthToken) {
    return null;
  }
  return new TursoClient(cfg.tursoUrl, cfg.tursoAuthToken);
}
