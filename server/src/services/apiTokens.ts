import crypto from 'crypto';
import db from '../database/connection';

const TOKEN_PREFIX = 'ft_'; // FinTracker
const TOKEN_BYTES = 24;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface ApiToken {
  id: string;
  user_id: string;
  name: string;
  prefix: string;
  last_used_at: Date | null;
  created_at: Date;
}

export async function createApiToken(userId: string, name: string): Promise<{ token: string; record: ApiToken }> {
  const random = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
  const token = `${TOKEN_PREFIX}${random}`;
  const tokenHash = hashToken(token);
  const prefix = token.slice(0, 11); // ft_ + 8 chars

  const [record] = await db('api_tokens')
    .insert({
      user_id: userId,
      name,
      token_hash: tokenHash,
      prefix,
    })
    .returning(['id', 'user_id', 'name', 'prefix', 'last_used_at', 'created_at']);

  return { token, record };
}

export async function listApiTokens(userId: string): Promise<ApiToken[]> {
  return db('api_tokens')
    .where({ user_id: userId })
    .select('id', 'user_id', 'name', 'prefix', 'last_used_at', 'created_at')
    .orderBy('created_at', 'desc');
}

export async function revokeApiToken(userId: string, tokenId: string): Promise<boolean> {
  const deleted = await db('api_tokens').where({ id: tokenId, user_id: userId }).del();
  return deleted > 0;
}

export async function verifyApiToken(token: string): Promise<{ userId: string; tokenId: string } | null> {
  if (!token || !token.startsWith(TOKEN_PREFIX)) return null;
  const tokenHash = hashToken(token);
  const row = await db('api_tokens').where({ token_hash: tokenHash }).first();
  if (!row) return null;
  // Update last_used_at (fire and forget)
  db('api_tokens').where({ id: row.id }).update({ last_used_at: new Date() }).catch(() => {});
  return { userId: row.user_id, tokenId: row.id };
}
