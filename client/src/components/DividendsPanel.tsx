import { useState, useEffect } from 'react';
import { Coins, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api/client';

interface DividendBySymbol {
  symbol: string | null;
  total: number;
  count: number;
  last_date: string;
}

interface DividendByMonth {
  month: string;
  total: number;
}

interface RecentDividend {
  id: string;
  date: string;
  symbol: string | null;
  amount: number;
  currency: string | null;
  description: string | null;
  type: string | null;
}

interface DividendsData {
  total: number;
  by_symbol: DividendBySymbol[];
  by_month: DividendByMonth[];
  recent: RecentDividend[];
}

interface Props {
  refreshKey: number;
}

export default function DividendsPanel({ refreshKey }: Props) {
  const [data, setData] = useState<DividendsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/iol/dividends')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="bg-surface rounded-2xl p-5 border border-border">
        <div className="h-6 w-40 bg-border/50 rounded animate-pulse"></div>
        <div className="h-32 bg-border/30 rounded mt-3 animate-pulse"></div>
      </div>
    );
  }

  if (!data || data.recent.length === 0) {
    return (
      <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Coins className="w-4 h-4 text-text-muted" />
          <h3 className="font-semibold text-sm">Dividendos cobrados</h3>
        </div>
        <p className="text-sm text-text-muted text-center py-4">
          No se detectaron pagos de dividendos aún. Sincronizá tu cuenta IOL para traerlos.
        </p>
      </div>
    );
  }

  const monthData = data.by_month.map((m) => ({
    month: new Date(m.month + '-01').toLocaleString('es-AR', { month: 'short', year: '2-digit' }),
    total: Number(m.total),
  }));

  const lastDate = data.recent[0]?.date;

  return (
    <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-warning/15 border border-warning/25 flex items-center justify-center">
            <Coins className="w-4 h-4 text-warning" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Dividendos cobrados</h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              {data.recent.length} {data.recent.length === 1 ? 'pago detectado' : 'pagos detectados'}
              {lastDate && ` · último el ${new Date(lastDate).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-text-muted uppercase tracking-wide">Total acumulado</p>
          <p className="money text-2xl font-bold text-warning">
            ${data.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Chart by month */}
      {monthData.length > 1 && (
        <div className="bg-background rounded-xl p-4 border border-border mb-4">
          <p className="text-[11px] text-text-muted uppercase tracking-wide font-semibold mb-2">Por mes</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2B3642" />
              <XAxis dataKey="month" stroke="#9BA9B4" fontSize={11} />
              <YAxis stroke="#9BA9B4" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1E2730', border: '1px solid #2B3642', borderRadius: '10px' }}
                formatter={(value) => [`$${Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`, 'Dividendos']}
              />
              <Bar dataKey="total" fill="#FBBF24" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* By symbol */}
      {data.by_symbol.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] text-text-muted uppercase tracking-wide font-semibold mb-2">Por símbolo</p>
          <div className="space-y-1.5">
            {data.by_symbol.slice(0, 8).map((s) => (
              <div key={s.symbol} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] px-1.5 py-0.5 bg-warning/15 text-warning rounded font-semibold">
                    {s.symbol || 'Otros'}
                  </span>
                  <span className="text-xs text-text-muted">{s.count} {s.count === 1 ? 'pago' : 'pagos'}</span>
                </div>
                <p className="money text-sm font-semibold text-warning">
                  ${s.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent payments */}
      <div>
        <p className="text-[11px] text-text-muted uppercase tracking-wide font-semibold mb-2">Últimos pagos</p>
        <div className="divide-y divide-border">
          {data.recent.slice(0, 8).map((d) => (
            <div key={d.id} className="flex items-center justify-between py-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-warning" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {d.symbol && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-warning/15 text-warning rounded font-semibold">
                        {d.symbol}
                      </span>
                    )}
                    <p className="text-sm font-medium truncate">
                      {d.description || d.type || 'Dividendo'}
                    </p>
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {new Date(d.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <p className="money text-warning font-semibold text-sm ml-3">
                +${Number(d.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
