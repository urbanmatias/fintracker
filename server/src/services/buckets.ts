import db from '../database/connection';

export interface DistributionBucket {
  id: string;
  user_id: string;
  name: string;
  percent: number;
  type: 'investment' | 'excedent' | 'custom';
  color: string;
  sort_order: number;
  description: string | null;
}

export async function getBuckets(userId: string): Promise<DistributionBucket[]> {
  const rows = await db('distribution_buckets')
    .where({ user_id: userId })
    .orderBy('sort_order')
    .orderBy('created_at');
  return rows.map((r) => ({
    ...r,
    percent: Number(r.percent),
  }));
}

export function totalPercent(buckets: { percent: number }[]): number {
  return buckets.reduce((s, b) => s + Number(b.percent), 0);
}
