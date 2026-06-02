import { useState, useEffect } from 'react';
import { Newspaper, ExternalLink } from 'lucide-react';
import api from '../api/client';

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

interface Props {
  symbol: string;
}

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

export default function CompanyNews({ symbol }: Props) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    api.get(`/news/company/${symbol}`, { params: { days: 7, limit: 5 } })
      .then((res) => setNews(res.data.news || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="bg-background rounded-xl p-4 border border-border">
        <div className="h-5 w-32 bg-border/50 rounded animate-pulse"></div>
        <div className="h-16 bg-border/30 rounded mt-3 animate-pulse"></div>
      </div>
    );
  }

  if (error || news.length === 0) {
    return null;
  }

  return (
    <div className="bg-background rounded-xl p-4 border border-border">
      <div className="flex items-center gap-2 mb-3">
        <Newspaper className="w-3.5 h-3.5 text-text-muted" />
        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide">Noticias relacionadas</h4>
      </div>
      <div className="space-y-2">
        {news.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block py-2 border-b border-border last:border-0 group"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors flex-1">
                {item.headline}
              </p>
              <ExternalLink className="w-3 h-3 text-text-muted/40 group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              {item.source} · {timeAgo(item.datetime)}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
