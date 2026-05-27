import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export interface Category {
  id: string;
  name: string;
  type: 'daily' | 'fixed';
  color: string;
  sort_order: number;
}

export function useCategories(type?: 'daily' | 'fixed') {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    api.get('/categories', { params: type ? { type } : {} })
      .then((res) => setCategories(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [type]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { categories, loading, reload };
}
