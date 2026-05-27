import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Calendar, Trophy, AlertCircle, Flame } from 'lucide-react';

export interface Insight {
  id: string;
  icon: 'sparkles' | 'up' | 'down' | 'calendar' | 'trophy' | 'alert' | 'flame';
  title: string;
  description: string;
  tone: 'positive' | 'negative' | 'neutral' | 'warning';
}

const ICONS = {
  sparkles: Sparkles,
  up: TrendingUp,
  down: TrendingDown,
  calendar: Calendar,
  trophy: Trophy,
  alert: AlertCircle,
  flame: Flame,
};

const TONE_STYLES = {
  positive: 'bg-primary/[0.08] border-primary/25 text-primary',
  negative: 'bg-danger/[0.08] border-danger/25 text-danger',
  neutral: 'bg-secondary/[0.08] border-secondary/25 text-secondary',
  warning: 'bg-warning/[0.08] border-warning/25 text-warning',
};

interface InsightCardsProps {
  insights: Insight[];
}

export default function InsightCards({ insights }: InsightCardsProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (insights.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % insights.length), 5000);
    return () => clearInterval(t);
  }, [insights.length]);

  if (insights.length === 0) return null;

  const current = insights[index];
  const Icon = ICONS[current.icon];

  return (
    <div className="relative">
      <div
        key={current.id}
        className={`fade-in border rounded-[14px] p-4 md:p-5 ${TONE_STYLES[current.tone]} transition-all`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-black/20 flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{current.title}</p>
            <p className="text-text-muted text-xs md:text-sm mt-1">{current.description}</p>
          </div>
        </div>

        {insights.length > 1 && (
          <div className="flex gap-1 mt-3">
            {insights.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`h-1 rounded-full transition-all ${
                  i === index ? 'w-6 bg-current' : 'w-1.5 bg-current opacity-30'
                }`}
                aria-label={`Insight ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
