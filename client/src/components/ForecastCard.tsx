import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Target, Sparkles } from 'lucide-react';
import api from '../api/client';

interface Forecast {
  available: boolean;
  year?: number;
  month?: number;
  day?: number;
  days_in_month?: number;
  days_remaining?: number;
  month_budget?: number;
  daily_budget?: number;
  spent_so_far?: number;
  avg_daily_so_far?: number;
  expected_spent_so_far?: number;
  over_under?: number;
  status?: 'on_track' | 'over' | 'under';
  projected_total?: number;
  projected_surplus?: number;
  projected_to_investment?: number;
  projected_to_excedent?: number;
  current_excedent?: number;
  projected_final_excedent?: number;
}

interface Props {
  refreshKey: number;
}

export default function ForecastCard({ refreshKey }: Props) {
  const [data, setData] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats/forecast')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading || !data?.available) return null;

  const isOver = data.status === 'over';
  const isUnder = data.status === 'under';

  const monthName = new Date(data.year!, data.month! - 1).toLocaleString('es-AR', { month: 'long' });

  // Status messaging
  let title: string;
  let description: string;
  let Icon = Target;
  let toneClass = 'border-secondary/30 bg-secondary/[0.04]';
  let titleClass = 'text-secondary';

  if (isOver) {
    Icon = TrendingDown;
    title = `Vas $${Math.abs(data.over_under || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })} arriba del ritmo`;
    description = `Si seguís así terminás ${monthName} con ${
      (data.projected_surplus || 0) >= 0
        ? `+$${(data.projected_surplus || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })} de excedente`
        : `$${Math.abs(data.projected_surplus || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })} en rojo`
    }.`;
    toneClass = 'border-warning/30 bg-warning/[0.04]';
    titleClass = 'text-warning';
  } else if (isUnder) {
    Icon = TrendingUp;
    title = `Vas $${Math.abs(data.over_under || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })} abajo del ritmo`;
    description = `Si seguís así, ${monthName} cierra con +$${(data.projected_surplus || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })} de excedente.`;
    toneClass = 'border-primary/30 bg-primary/[0.04]';
    titleClass = 'text-primary';
  } else {
    Icon = Sparkles;
    title = `Vas en ritmo`;
    description = `Si mantenés este pace, ${monthName} cierra con $${(data.projected_surplus || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })} de excedente.`;
    toneClass = 'border-secondary/30 bg-secondary/[0.04]';
    titleClass = 'text-secondary';
  }

  // Progress bar: actual vs expected
  const monthProgressPct = data.days_in_month! > 0 ? (data.day! / data.days_in_month!) * 100 : 0;
  const actualSpentPct = (data.month_budget || 0) > 0 ? ((data.spent_so_far || 0) / (data.month_budget || 1)) * 100 : 0;

  return (
    <div className={`rounded-2xl p-5 md:p-6 border ${toneClass} fade-in`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-current/10 flex items-center justify-center">
          <Icon className={`w-5 h-5 ${titleClass}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-text-muted uppercase tracking-wide font-semibold">Pronóstico del mes</p>
          <p className={`font-semibold text-sm mt-0.5 ${titleClass}`}>{title}</p>
          <p className="text-xs text-text-muted mt-1">{description}</p>
        </div>
      </div>

      {/* Progress bar with markers */}
      <div className="mt-4">
        <div className="flex justify-between text-[11px] text-text-muted mb-1.5">
          <span>Día {data.day} de {data.days_in_month}</span>
          <span>{actualSpentPct.toFixed(0)}% del presupuesto</span>
        </div>
        <div className="relative h-2 bg-border rounded-full overflow-hidden">
          {/* Time progress (vertical line marker) */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-text/40 z-10"
            style={{ left: `${Math.min(monthProgressPct, 100)}%` }}
            title="Día actual"
          />
          {/* Actual spending bar */}
          <div
            className={`h-full rounded-full transition-all ${
              isOver ? 'bg-warning' : isUnder ? 'bg-primary' : 'bg-secondary'
            }`}
            style={{ width: `${Math.min(actualSpentPct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-text-muted mt-1.5">
          <span>${(data.spent_so_far || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })} gastados</span>
          <span>${(data.month_budget || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      {/* Projected breakdown */}
      <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-current/10">
        <div>
          <p className="text-[10px] text-text-muted uppercase">Promedio diario</p>
          <p className="money text-sm font-semibold mt-0.5">
            ${(data.avg_daily_so_far || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted uppercase">Pronóstico</p>
          <p className="money text-sm font-semibold mt-0.5">
            ${(data.projected_total || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted uppercase">A inversión</p>
          <p className="money text-sm font-semibold mt-0.5 text-primary">
            ${(data.projected_to_investment || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>
    </div>
  );
}
