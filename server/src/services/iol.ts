import https from 'https';
import { URL } from 'url';
import db from '../database/connection';
import { encrypt, decrypt } from './crypto';

const IOL_BASE = 'https://api.invertironline.com';
const TOKEN_URL = `${IOL_BASE}/token`;

interface IolTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  '.expires': string;
  '.issued': string;
  username?: string;
  '.refreshexpires'?: string;
}

interface IolPortfolioPosition {
  cantidad: number;
  comprometido?: number;
  puntosVariacion?: number;
  variacionDiaria?: number;
  ultimoPrecio?: number;
  ppcEnGarantia?: number;
  ppc?: number;
  gananciaPorcentaje?: number;
  gananciaDinero?: number;
  valorizado?: number;
  titulo: {
    simbolo: string;
    descripcion?: string;
    pais?: string;
    mercado?: string;
    tipo?: string;
    plazo?: string;
    moneda?: string;
  };
}

interface IolPortfolio {
  pais: string;
  activos: IolPortfolioPosition[];
}

interface IolOperation {
  numero: number;
  fechaOrden?: string;
  fechaOperada?: string;
  tipo: string; // Compra, Venta, etc.
  estado: string;
  simbolo?: string;
  mercado?: string;
  cantidadOperada?: number;
  cantidad?: number;
  precioOperado?: number;
  precio?: number;
  monto?: number;
  montoOperado?: number;
  moneda?: string;
}

interface IolQuote {
  simbolo: string;
  descripcion?: string;
  ultimoPrecio?: number;
  variacion?: number;
  variacionPorcentual?: number;
  apertura?: number;
  maximo?: number;
  minimo?: number;
  cierreAnterior?: number;
  fechaHora?: string;
  moneda?: string;
}

interface IolHistoryEntry {
  fechaHora: string;
  ultimoPrecio: number;
  apertura?: number;
  maximo?: number;
  minimo?: number;
  cierreAnterior?: number;
  volumen?: number;
}

export class IolApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RawHttpResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

function rawHttpsPost(url: string, body: string, headers: Record<string, string>): Promise<RawHttpResponse> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        host: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Length': Buffer.byteLength(body).toString(),
          ...headers,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function requestToken(username: string, password: string): Promise<IolTokenResponse> {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);
  params.append('grant_type', 'password');
  const body = params.toString();

  // Use Node's native https module (more predictable than fetch with form-encoded bodies)
  const res = await rawHttpsPost(TOKEN_URL, body, {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (compatible; FinTracker/1.0)',
  });

  console.log('[IOL] token POST status:', res.status, 'allow:', res.headers.allow, 'body length:', res.body.length);

  if (res.status >= 200 && res.status < 300) {
    try {
      return JSON.parse(res.body) as IolTokenResponse;
    } catch {
      throw new IolApiError('IOL devolvió respuesta inválida', 500);
    }
  }

  let detail = '';
  try {
    const data = JSON.parse(res.body) as Record<string, unknown>;
    detail = String(data?.error_description || data?.error || data?.message || '');
  } catch {
    detail = res.body;
  }

  console.log('[IOL] token error detail:', detail);

  if (res.status === 405) {
    const allow = res.headers.allow || 'desconocido';
    throw new IolApiError(
      `IOL devolvió 405. Allow: ${allow}. Body: ${detail || '(vacío)'}`,
      res.status
    );
  }

  if (res.status === 400 || res.status === 401) {
    throw new IolApiError(
      detail
        ? `IOL rechazó el login: ${detail}`
        : 'IOL rechazó el login. Verificá usuario, contraseña, y que tengas 2FA desactivado en IOL (la API no lo soporta).',
      res.status
    );
  }

  throw new IolApiError(detail || `IOL devolvió error ${res.status}`, res.status);
}

async function refreshToken(refreshTokenValue: string): Promise<IolTokenResponse> {
  const body = new URLSearchParams({
    refresh_token: refreshTokenValue,
    grant_type: 'refresh_token',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new IolApiError('refresh_failed', res.status);
  }

  return res.json() as Promise<IolTokenResponse>;
}

export async function connectIol(userId: string, username: string, password: string): Promise<void> {
  const tokenData = await requestToken(username, password);
  const expiresAt = new Date(tokenData['.expires']);

  await db('iol_connections')
    .insert({
      user_id: userId,
      username_encrypted: encrypt(username),
      password_encrypted: encrypt(password),
      access_token: tokenData.access_token,
      token_expires_at: expiresAt,
      refresh_token: tokenData.refresh_token,
    })
    .onConflict('user_id')
    .merge({
      username_encrypted: encrypt(username),
      password_encrypted: encrypt(password),
      access_token: tokenData.access_token,
      token_expires_at: expiresAt,
      refresh_token: tokenData.refresh_token,
      updated_at: new Date(),
    });
}

export async function disconnectIol(userId: string): Promise<void> {
  await db('iol_connections').where({ user_id: userId }).del();
  await db('iol_portfolio').where({ user_id: userId }).del();
  await db('iol_operations').where({ user_id: userId }).del();
  await db('iol_dividends').where({ user_id: userId }).del();
  await db('portfolio_snapshots').where({ user_id: userId }).del();
}

async function getValidToken(userId: string): Promise<string> {
  const conn = await db('iol_connections').where({ user_id: userId }).first();
  if (!conn) throw new IolApiError('No hay conexión con IOL', 404);

  const now = new Date();
  const expires = conn.token_expires_at ? new Date(conn.token_expires_at) : null;

  if (conn.access_token && expires && expires.getTime() - now.getTime() > 60_000) {
    return conn.access_token;
  }

  if (conn.refresh_token) {
    try {
      const refreshed = await refreshToken(conn.refresh_token);
      await db('iol_connections')
        .where({ user_id: userId })
        .update({
          access_token: refreshed.access_token,
          token_expires_at: new Date(refreshed['.expires']),
          refresh_token: refreshed.refresh_token,
          updated_at: new Date(),
        });
      return refreshed.access_token;
    } catch {
      // fall back to password login
    }
  }

  const username = decrypt(conn.username_encrypted);
  const password = decrypt(conn.password_encrypted);
  const fresh = await requestToken(username, password);

  await db('iol_connections')
    .where({ user_id: userId })
    .update({
      access_token: fresh.access_token,
      token_expires_at: new Date(fresh['.expires']),
      refresh_token: fresh.refresh_token,
      updated_at: new Date(),
    });

  return fresh.access_token;
}

async function iolFetch<T>(userId: string, path: string): Promise<T> {
  const token = await getValidToken(userId);
  const res = await fetch(`${IOL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    await db('iol_connections').where({ user_id: userId }).update({ token_expires_at: new Date(0) });
    const newToken = await getValidToken(userId);
    const retry = await fetch(`${IOL_BASE}${path}`, {
      headers: { Authorization: `Bearer ${newToken}` },
    });
    if (!retry.ok) throw new IolApiError(`IOL error ${retry.status}`, retry.status);
    return retry.json() as Promise<T>;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new IolApiError(text || `IOL error ${res.status}`, res.status);
  }

  return res.json() as Promise<T>;
}

export async function getPortfolio(userId: string, country: 'argentina' | 'estados_Unidos' = 'argentina'): Promise<IolPortfolio> {
  return iolFetch<IolPortfolio>(userId, `/api/v2/portafolio/${country}`);
}

/**
 * Snapshot of total portfolio value for today (creates or updates)
 */
async function saveDailySnapshot(userId: string, positions: IolPortfolioPosition[]): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const totalValuation = positions.reduce((s, p) => s + Number(p.valorizado || 0), 0);
  const totalPL = positions.reduce((s, p) => s + Number(p.gananciaDinero || 0), 0);

  await db('portfolio_snapshots')
    .insert({
      user_id: userId,
      date: today,
      total_valuation: totalValuation,
      total_profit_loss: totalPL,
      positions_count: positions.length,
      raw_positions: JSON.stringify(positions),
    })
    .onConflict(['user_id', 'date'])
    .merge({
      total_valuation: totalValuation,
      total_profit_loss: totalPL,
      positions_count: positions.length,
      raw_positions: JSON.stringify(positions),
      updated_at: new Date(),
    });
}

export async function syncPortfolio(userId: string): Promise<void> {
  const argentina = await getPortfolio(userId, 'argentina').catch(() => null);
  const usa = await getPortfolio(userId, 'estados_Unidos').catch(() => null);

  await db('iol_portfolio').where({ user_id: userId }).del();

  const rows: Record<string, unknown>[] = [];
  const allPositions: IolPortfolioPosition[] = [];

  for (const port of [argentina, usa]) {
    if (!port) continue;
    for (const a of port.activos || []) {
      allPositions.push(a);
      rows.push({
        user_id: userId,
        country: port.pais,
        symbol: a.titulo.simbolo,
        description: a.titulo.descripcion || null,
        instrument_type: a.titulo.tipo || null,
        quantity: a.cantidad,
        last_price: a.ultimoPrecio || null,
        ppc: a.ppc || null,
        valuation: a.valorizado || null,
        profit_loss: a.gananciaDinero || null,
        profit_loss_percent: a.gananciaPorcentaje || null,
        currency: a.titulo.moneda || null,
      });
    }
  }

  if (rows.length > 0) {
    await db('iol_portfolio').insert(rows);
  }

  await saveDailySnapshot(userId, allPositions);

  await db('iol_connections')
    .where({ user_id: userId })
    .update({ last_sync_at: new Date() });
}

/**
 * Fetch operations from IOL between two dates
 */
export async function getOperations(userId: string, fromDate: string, toDate: string): Promise<IolOperation[]> {
  // IOL accepts query params: filtro.estado, filtro.fechaDesde, filtro.fechaHasta, filtro.tipo
  const params = new URLSearchParams({
    'filtro.estado': 'terminadas',
    'filtro.fechaDesde': fromDate,
    'filtro.fechaHasta': toDate,
  });
  return iolFetch<IolOperation[]>(userId, `/api/v2/operaciones?${params.toString()}`);
}

/**
 * Sync operations from IOL into our DB and auto-register Compra ops as investments
 */
export async function syncOperations(userId: string, daysBack = 365): Promise<{ imported: number; autoCreated: number }> {
  const today = new Date();
  const from = new Date();
  from.setDate(today.getDate() - daysBack);
  const fromStr = from.toISOString().split('T')[0];
  const toStr = today.toISOString().split('T')[0];

  const ops = await getOperations(userId, fromStr, toStr).catch(() => [] as IolOperation[]);

  let imported = 0;
  let autoCreated = 0;

  for (const op of ops) {
    if (!op.numero) continue;

    const date = (op.fechaOperada || op.fechaOrden || '').split('T')[0];
    if (!date) continue;

    const total = Number(op.montoOperado || op.monto || 0);
    const quantity = Number(op.cantidadOperada || op.cantidad || 0);
    const price = Number(op.precioOperado || op.precio || 0);

    // Upsert operation
    const existing = await db('iol_operations')
      .where({ user_id: userId, iol_operation_id: op.numero })
      .first();

    if (!existing) {
      const [inserted] = await db('iol_operations')
        .insert({
          user_id: userId,
          iol_operation_id: op.numero,
          date,
          type: op.tipo,
          status: op.estado,
          symbol: op.simbolo || null,
          market: op.mercado || null,
          quantity: quantity || null,
          price: price || null,
          total: total || null,
          currency: op.moneda || null,
          raw_data: JSON.stringify(op),
        })
        .returning('id');

      imported++;

      // Auto-create investment record for Compra operations
      const isPurchase = (op.tipo || '').toLowerCase().includes('compra');
      if (isPurchase && total > 0 && op.simbolo) {
        const [inv] = await db('investments')
          .insert({
            user_id: userId,
            amount: total,
            date,
            description: `${op.tipo} ${op.simbolo}`,
            ticker: op.simbolo,
            quantity: quantity || null,
            price_per_unit: price || null,
            platform: 'IOL',
            iol_operation_id: op.numero,
            auto_generated: true,
          })
          .returning('id');

        await db('iol_operations')
          .where({ id: inserted.id })
          .update({ matched_investment_id: inv.id });

        autoCreated++;
      }
    }
  }

  return { imported, autoCreated };
}

/**
 * Search instruments by ticker / name
 */
interface IolInstrument {
  simbolo: string;
  descripcion?: string;
  pais?: string;
  mercado?: string;
  tipo?: string;
  moneda?: string;
  ultimoPrecio?: number;
}

export async function searchInstrument(userId: string, query: string): Promise<IolInstrument[]> {
  // IOL doesn't have a great search; we use cotizacion endpoint by symbol+market when known.
  // For free-form, try the BCBA "Acciones" panel and CEDEARs.
  const upper = query.toUpperCase().trim();
  const results: IolInstrument[] = [];

  // Try direct lookup as CEDEAR in BCBA
  for (const market of ['bCBA', 'nYSE', 'nASDAQ', 'aMEX']) {
    try {
      const data = await iolFetch<IolQuote>(userId, `/api/v2/${market}/Titulos/${upper}/Cotizacion`);
      if (data?.simbolo) {
        results.push({
          simbolo: data.simbolo,
          descripcion: data.descripcion,
          mercado: market,
          ultimoPrecio: data.ultimoPrecio,
          moneda: data.moneda,
        });
      }
    } catch {
      // ignore not-found
    }
  }

  return results;
}

export async function getQuote(userId: string, market: string, symbol: string): Promise<IolQuote> {
  return iolFetch<IolQuote>(userId, `/api/v2/${market}/Titulos/${symbol}/Cotizacion`);
}

export async function getInstrumentHistory(
  userId: string,
  market: string,
  symbol: string,
  fromDate: string,
  toDate: string,
  ajustada: 'sinAjustar' | 'ajustada' = 'ajustada'
): Promise<IolHistoryEntry[]> {
  return iolFetch<IolHistoryEntry[]>(
    userId,
    `/api/v2/${market}/Titulos/${symbol}/Cotizacion/seriehistorica/${fromDate}/${toDate}/${ajustada}`
  );
}

export async function getConnectionStatus(userId: string): Promise<{
  connected: boolean;
  username?: string;
  last_sync_at?: Date | null;
}> {
  const conn = await db('iol_connections').where({ user_id: userId }).first();
  if (!conn) return { connected: false };
  return {
    connected: true,
    username: decrypt(conn.username_encrypted),
    last_sync_at: conn.last_sync_at,
  };
}

export async function getStoredPortfolio(userId: string): Promise<unknown[]> {
  return db('iol_portfolio').where({ user_id: userId }).orderBy('valuation', 'desc');
}

export async function getStoredOperations(userId: string, limit = 100): Promise<unknown[]> {
  return db('iol_operations')
    .where({ user_id: userId })
    .orderBy('date', 'desc')
    .limit(limit);
}

interface IolMovement {
  numero?: number;
  fecha?: string;
  fechaLiquidacion?: string;
  tipo?: string;
  descripcion?: string;
  monto?: number;
  importe?: number;
  moneda?: string;
  simbolo?: string;
  saldo?: number;
}

const DIVIDEND_KEYWORDS = [
  'dividendo',
  'dividend',
  'renta',
  'cobro de cupon',
  'cobro de cupón',
  'cupon',
  'cupón',
];

function isDividendType(typeOrDesc: string): boolean {
  const lower = (typeOrDesc || '').toLowerCase();
  return DIVIDEND_KEYWORDS.some((k) => lower.includes(k));
}

function extractSymbolFromDescription(desc: string): string | null {
  if (!desc) return null;
  // Common formats: "Cobro de Dividendos AAPL", "Pago de Dividendos - GGAL"
  const match = desc.match(/([A-Z]{2,6}\d?)/g);
  if (match && match.length > 0) {
    // Filter out common words that may be uppercase
    const candidates = match.filter((m) => !['IOL', 'BCBA', 'NYSE', 'USD', 'ARS'].includes(m));
    return candidates[0] || null;
  }
  return null;
}

/**
 * Sync the user's account state to find dividend payments.
 * IOL exposes /api/v2/estadocuenta and /api/v2/operaciones; dividends usually
 * come as movements in the account state, sometimes with type "Pago de Dividendos".
 */
export async function syncDividends(userId: string, daysBack = 365): Promise<{ imported: number }> {
  const today = new Date();
  const from = new Date();
  from.setDate(today.getDate() - daysBack);
  const fromStr = from.toISOString().split('T')[0];
  const toStr = today.toISOString().split('T')[0];

  let imported = 0;

  // Try the operations endpoint with all states and filter by type
  const params = new URLSearchParams({
    'filtro.estado': 'todas',
    'filtro.fechaDesde': fromStr,
    'filtro.fechaHasta': toStr,
  });

  const ops = await iolFetch<IolOperation[]>(userId, `/api/v2/operaciones?${params.toString()}`).catch(() => [] as IolOperation[]);

  for (const op of ops) {
    const tipo = op.tipo || '';
    const desc = (op as IolOperation & { descripcion?: string }).descripcion || '';
    if (!isDividendType(tipo) && !isDividendType(desc)) continue;

    const numero = op.numero;
    if (!numero) continue;

    const date = (op.fechaOperada || op.fechaOrden || '').split('T')[0];
    if (!date) continue;

    const amount = Number(op.montoOperado || op.monto || 0);
    if (!amount) continue;

    const symbol = op.simbolo || extractSymbolFromDescription(desc) || extractSymbolFromDescription(tipo);

    const existing = await db('iol_dividends')
      .where({ user_id: userId, iol_movement_id: numero })
      .first();
    if (existing) continue;

    await db('iol_dividends').insert({
      user_id: userId,
      iol_movement_id: numero,
      date,
      symbol,
      type: tipo,
      amount,
      currency: op.moneda || null,
      description: desc || null,
      raw_data: JSON.stringify(op),
    });

    imported++;
  }

  return { imported };
}

interface DividendSummary {
  total: number;
  by_symbol: Array<{ symbol: string | null; total: number; count: number; last_date: string }>;
  by_month: Array<{ month: string; total: number }>;
  recent: Array<{
    id: string;
    date: string;
    symbol: string | null;
    amount: number;
    currency: string | null;
    description: string | null;
    type: string | null;
  }>;
}

export async function getDividendsSummary(userId: string): Promise<DividendSummary> {
  const dividends = await db('iol_dividends')
    .where({ user_id: userId })
    .orderBy('date', 'desc');

  const total = dividends.reduce((s, d) => s + Number(d.amount), 0);

  const bySymbolMap = new Map<string, { total: number; count: number; last_date: string }>();
  for (const d of dividends) {
    const sym = d.symbol || 'Otros';
    const existing = bySymbolMap.get(sym);
    if (existing) {
      existing.total += Number(d.amount);
      existing.count += 1;
      if (d.date > existing.last_date) existing.last_date = d.date;
    } else {
      bySymbolMap.set(sym, { total: Number(d.amount), count: 1, last_date: d.date });
    }
  }
  const by_symbol = Array.from(bySymbolMap.entries())
    .map(([symbol, data]) => ({ symbol, ...data }))
    .sort((a, b) => b.total - a.total);

  const byMonthMap = new Map<string, number>();
  for (const d of dividends) {
    const m = d.date.toString().substring(0, 7);
    byMonthMap.set(m, (byMonthMap.get(m) || 0) + Number(d.amount));
  }
  const by_month = Array.from(byMonthMap.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const recent = dividends.slice(0, 20).map((d) => ({
    id: d.id,
    date: d.date,
    symbol: d.symbol,
    amount: Number(d.amount),
    currency: d.currency,
    description: d.description,
    type: d.type,
  }));

  return { total, by_symbol, by_month, recent };
}

export async function getSnapshots(userId: string, days = 90): Promise<unknown[]> {
  return db('portfolio_snapshots')
    .where({ user_id: userId })
    .whereRaw(`date >= CURRENT_DATE - INTERVAL '${days} days'`)
    .orderBy('date', 'asc')
    .select('date', 'total_valuation', 'total_profit_loss', 'positions_count');
}
