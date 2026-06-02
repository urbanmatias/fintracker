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

export class IolApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function requestToken(username: string, password: string): Promise<IolTokenResponse> {
  const body = new URLSearchParams({
    username,
    password,
    grant_type: 'password',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new IolApiError(text || 'Credenciales inválidas', res.status);
  }

  return res.json() as Promise<IolTokenResponse>;
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

/**
 * Connect a user to IOL using their credentials. Saves encrypted creds + token.
 */
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
}

/**
 * Get a valid access token for the user. Refreshes if expired.
 */
async function getValidToken(userId: string): Promise<string> {
  const conn = await db('iol_connections').where({ user_id: userId }).first();
  if (!conn) throw new IolApiError('No hay conexión con IOL', 404);

  const now = new Date();
  const expires = conn.token_expires_at ? new Date(conn.token_expires_at) : null;

  // Token is still valid (with 60s buffer)
  if (conn.access_token && expires && expires.getTime() - now.getTime() > 60_000) {
    return conn.access_token;
  }

  // Try refresh
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

  // Re-login with stored credentials
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
    // try once more after forcing re-login
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
 * Sync IOL portfolio into our DB. Returns the saved positions.
 */
export async function syncPortfolio(userId: string): Promise<void> {
  const argentina = await getPortfolio(userId, 'argentina').catch(() => null);
  const usa = await getPortfolio(userId, 'estados_Unidos').catch(() => null);

  // Clear existing
  await db('iol_portfolio').where({ user_id: userId }).del();

  const rows: Record<string, unknown>[] = [];

  for (const port of [argentina, usa]) {
    if (!port) continue;
    for (const a of port.activos || []) {
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

  await db('iol_connections')
    .where({ user_id: userId })
    .update({ last_sync_at: new Date() });
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
