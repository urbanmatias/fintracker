import db from '../database/connection';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

export interface NewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export class FinnhubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getApiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new FinnhubError('FINNHUB_API_KEY no está configurada', 500);
  return key;
}

async function getCached<T>(cacheKey: string): Promise<T | null> {
  const row = await db('news_cache')
    .where({ cache_key: cacheKey })
    .where('expires_at', '>', new Date())
    .first();
  return row ? (row.data as T) : null;
}

async function setCached(cacheKey: string, data: unknown, ttlSeconds: number): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await db('news_cache')
    .insert({
      cache_key: cacheKey,
      data: JSON.stringify(data),
      expires_at: expiresAt,
    })
    .onConflict('cache_key')
    .merge({
      data: JSON.stringify(data),
      expires_at: expiresAt,
      updated_at: new Date(),
    });
}

async function finnhubFetch<T>(path: string): Promise<T> {
  const key = getApiKey();
  const sep = path.includes('?') ? '&' : '?';
  const url = `${FINNHUB_BASE}${path}${sep}token=${key}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new FinnhubError(text || `Finnhub error ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

/**
 * Get general market news. Categories: general, forex, crypto, merger
 * Cached for 30 minutes.
 */
export async function getMarketNews(category = 'general'): Promise<NewsItem[]> {
  const cacheKey = `finnhub:market:${category}`;
  const cached = await getCached<NewsItem[]>(cacheKey);
  if (cached) return cached;

  const news = await finnhubFetch<NewsItem[]>(`/news?category=${category}`);
  await setCached(cacheKey, news, 30 * 60);
  return news;
}

/**
 * Get company-specific news from the last N days.
 * Cached for 30 minutes.
 */
export async function getCompanyNews(symbol: string, daysBack = 7): Promise<NewsItem[]> {
  const cacheKey = `finnhub:company:${symbol}:${daysBack}`;
  const cached = await getCached<NewsItem[]>(cacheKey);
  if (cached) return cached;

  const today = new Date();
  const from = new Date();
  from.setDate(today.getDate() - daysBack);

  const fromStr = from.toISOString().split('T')[0];
  const toStr = today.toISOString().split('T')[0];

  const news = await finnhubFetch<NewsItem[]>(
    `/company-news?symbol=${symbol.toUpperCase()}&from=${fromStr}&to=${toStr}`
  );
  await setCached(cacheKey, news, 30 * 60);
  return news;
}
