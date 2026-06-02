import { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, RefreshCw, Image as ImageIcon } from 'lucide-react';
import api from '../api/client';
import EmptyState from '../components/EmptyState';

interface NewsItem {
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

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'forex', label: 'Forex' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'merger', label: 'M&A' },
];

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
  if (seconds < 60) return 'hace un momento';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export default function News() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('general');
  const [error, setError] = useState('');

  const load = (cat: string) => {
    setLoading(true);
    setError('');
    api.get('/news/market', { params: { category: cat, limit: 30 } })
      .then((res) => setNews(res.data.news || []))
      .catch((err: unknown) => {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || 'Error al cargar noticias');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(category);
  }, [category]);

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold hidden md:block">Noticias</h1>
          <p className="text-text-muted text-xs md:text-sm md:mt-1">
            Mercados internacionales en tiempo real
          </p>
        </div>
        <button
          onClick={() => load(category)}
          disabled={loading}
          className="px-3 py-2 bg-primary/15 hover:bg-primary/25 text-primary rounded-[10px] font-semibold text-xs transition-colors flex items-center gap-1.5 self-start disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all flex-shrink-0 ${
              category === c.value
                ? 'border-primary text-primary bg-primary/10'
                : 'border-border text-text-muted hover:border-text-muted'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="bg-surface rounded-2xl border border-border">
          <EmptyState
            icon={Newspaper}
            title="No se pudieron cargar las noticias"
            description={error.includes('FINNHUB') ? 'El admin tiene que configurar la API key de Finnhub.' : error}
          />
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-2xl p-4 border border-border h-24 animate-pulse"></div>
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-border">
          <EmptyState
            icon={Newspaper}
            title="Sin noticias"
            description="No hay noticias para esta categoría en este momento."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {news.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-surface rounded-2xl p-4 md:p-5 border border-border hover:border-primary/40 transition-all group"
            >
              <div className="flex gap-4">
                {item.image ? (
                  <img
                    src={item.image}
                    alt=""
                    className="w-20 h-20 md:w-28 md:h-28 rounded-xl object-cover flex-shrink-0 bg-border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 md:w-28 md:h-28 rounded-xl bg-border flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-6 h-6 text-text-muted/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-[11px] text-primary font-semibold uppercase tracking-wide">
                      {item.source}
                    </p>
                    <ExternalLink className="w-3.5 h-3.5 text-text-muted/40 group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                  <h3 className="text-sm md:text-base font-semibold leading-snug mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                    {item.headline}
                  </h3>
                  <p className="text-xs text-text-muted line-clamp-2 mb-2 hidden md:block">
                    {item.summary}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    {timeAgo(item.datetime)}
                    {item.related && ` · ${item.related.split(',').slice(0, 3).join(', ')}`}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
