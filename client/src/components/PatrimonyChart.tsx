import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api/client';

interface Snapshot {
  date: string;
  total_valuation: number;
  total_profit_loss: number;
  positions_count: number;
}

interface Props {
  refreshKey: number;
}

const RANGES = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1A', days: 365 },
];

export default function PatrimonyChart({ refreshKey }: Props) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/iol/snapshots', { params: { days } })
      .then((res) => setSnapshots(res.data.snapshots || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days, refreshKey]);

  if (loading) {
    return (
      <div className="bg-surface rounded-2xl p-5 border border-border">
        <div className="h-6 w-48 bg-border/50 rounded animate-pulse"></div>
        <div className="h-48 bg-border/30 rounded mt-3 animate-pulse"></div>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-text-muted" />
          <h3 className="font-semibold text-sm">Evolución del patrimonio</h3>
        </div>
        <p className="text-sm text-text-muted text-center py-4">
          Sincronizá tu portfolio para empezar a trackear la evolución día a día.
        </p>
      </div>
    );
  }

  const data = snapshots.map((s) => ({
    date: new Date(s.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
    valor: Number(s.total_valuation),
    pl: Number(s.total_profit_loss),
  }));

  const first = Number(snapshots[0].total_valuation);
  const last = Number(snapshots[snapshots.length - 1].total_valuation);
  const totalChange = last - first;
  const totalChangePct = first > 0 ? (totalChange / first) * 100 : 0;
  const isPositive = totalChange >= 0;

  return (
    <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-text-muted" />
          <h3 className="font-semibold text-sm">Evolución del patrimonio</h3>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                days === r.days
                  ? 'bg-primary/15 text-primary'
                  : 'bg-border/40 text-text-muted hover:bg-border/60'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="money text-2xl font-bold">${last.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
        <p className={`text-xs font-semibold ${isPositive ? 'text-primary' : 'text-danger'}`}>
          {isPositive ? '+' : ''}${totalChange.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
          <span className="ml-1">({isPositive ? '+' : ''}{totalChangePct.toFixed(2)}%)</span>
          <span className="text-text-muted font-normal ml-1">en el período</span>
        </p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="patrimonyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isPositive ? '#19C37D' : '#FF5D73'} stopOpacity={0.4} />
              <stop offset="100%" stopColor={isPositive ? '#19C37D' : '#FF5D73'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2B3642" />
          <XAxis dataKey="date" stroke="#9BA9B4" fontSize={11} interval="preserveStartEnd" />
          <YAxis stroke="#9BA9B4" fontSize={11} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1E2730', border: '1px solid #2B3642', borderRadius: '10px' }}
            formatter={(value, name) => {
              const v = Number(value || 0);
              if (name === 'valor') return [`$${v.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`, 'Patrimonio'];
              return [v, name];
            }}
          />
          <Area
            type="monotone"
            dataKey="valor"
            stroke={isPositive ? '#19C37D' : '#FF5D73'}
            strokeWidth={2}
            fill="url(#patrimonyGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
