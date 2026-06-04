import { useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, Legend } from 'recharts';
import api from '../api/client';
import Calendar from '../components/Calendar';
import DayDetailModal from '../components/DayDetailModal';
import { useCategories } from '../hooks/useCategories';
import { useDataRefresh } from '../context/DataContext';

interface BucketBreakdown {
  bucket_id: string;
  name: string;
  type: 'investment' | 'excedent' | 'custom';
  color: string;
  percent: number;
  description: string | null;
  amount: number;
}

interface MonthlyStats {
  year: number;
  month: number;
  income: number;
  total_fixed_expenses: number;
  total_daily_expenses: number;
  daily_budget: number;
  total_available: number;
  total_saved: number;
  to_savings: number;
  to_investment: number;
  buckets_breakdown?: BucketBreakdown[];
  by_category: Array<{ category: string; total: number; count: string }>;
  daily_breakdown: Array<{ date: string; total: number }>;
  days_in_month: number;
}

interface CalendarDay {
  date: string;
  budget: number;
  spent: number;
  surplus: number;
  excedent_balance: number;
  status: 'positive' | 'negative' | 'neutral';
}

interface CalendarData {
  year: number;
  month: number;
  days: CalendarDay[];
  today: { date: string; spent: number };
}

interface CompareData {
  current: { year: number; month: number; total: number };
  previous: { year: number; month: number; total: number };
  diff: number;
  diff_percent: number | null;
  categories: Array<{
    category: string;
    current: number;
    previous: number;
    diff: number;
    diff_percent: number | null;
  }>;
}

interface WeekdayData {
  day: string;
  day_index: number;
  total: number;
  count: number;
  avg: number;
}

interface TrendsData {
  months: number;
  trend: Array<{ year: number; month: number; total: number; categories: Record<string, number> }>;
  averages: { per_day: number; per_week: number; per_month: number };
  by_category: Array<{ category: string; total: number; avg_per_month: number }>;
}

const FALLBACK_COLORS = ['#19C37D', '#4ADEDE', '#FBBF24', '#FF5D73', '#A78BFA', '#F472B6', '#34D399', '#818CF8', '#22D3EE', '#FB923C'];

export default function Stats() {
  const { categories } = useCategories('daily');
  const { refreshKey } = useDataRefresh();
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [calendar, setCalendar] = useState<CalendarData | null>(null);
  const [compare, setCompare] = useState<CompareData | null>(null);
  const [weekday, setWeekday] = useState<WeekdayData[] | null>(null);
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    Promise.all([
      api.get(`/stats/monthly/${selectedYear}/${selectedMonth}`),
      api.get(`/stats/calendar/${selectedYear}/${selectedMonth}`),
      api.get(`/stats/compare/${selectedYear}/${selectedMonth}`),
      api.get('/stats/by-weekday', { params: { days: 90 } }),
      api.get('/stats/trends', { params: { months: 6 } }),
    ])
      .then(([statsRes, calRes, cmpRes, wkRes, trRes]) => {
        setStats(statsRes.data);
        setCalendar(calRes.data);
        setCompare(cmpRes.data);
        setWeekday(wkRes.data.by_weekday);
        setTrends(trRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, refreshKey]);

  const getCategoryColor = (name: string, fallbackIndex = 0) => {
    return categories.find((c) => c.name === name)?.color || FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
  };

  if (loading) return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex justify-between gap-3">
        <div className="h-8 bg-border/40 rounded-md w-40 animate-pulse hidden md:block"></div>
        <div className="flex gap-2 ml-auto">
          <div className="h-9 w-24 bg-border/40 rounded-[10px] animate-pulse"></div>
          <div className="h-9 w-20 bg-border/40 rounded-[10px] animate-pulse"></div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0,1,2,3].map((i) => <div key={i} className="h-20 bg-surface border border-border rounded-xl animate-pulse"></div>)}
      </div>
      <div className="h-64 bg-surface border border-border rounded-xl animate-pulse"></div>
      <div className="h-48 bg-surface border border-border rounded-xl animate-pulse"></div>
    </div>
  );
  if (!stats) return <div className="text-text-muted">No hay datos para este período</div>;

  const categoryData = stats.by_category.map((c) => ({
    name: c.category,
    value: Number(c.total),
  }));

  const dailyData = stats.daily_breakdown.map((d) => ({
    date: new Date(d.date).getDate().toString(),
    gasto: Number(d.total),
    presupuesto: stats.daily_budget,
  }));

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  const prevMonthName = compare ? new Date(compare.previous.year, compare.previous.month - 1).toLocaleString('es-AR', { month: 'short' }) : '';

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold hidden md:block">Estadísticas</h1>
        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="flex-1 md:flex-initial px-3 py-2 bg-surface border border-border rounded-[10px] text-text text-sm capitalize"
            aria-label="Mes"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2024, i).toLocaleString('es-AR', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 bg-surface border border-border rounded-[10px] text-text text-sm"
            aria-label="Año"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards - 2x2 mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-surface rounded-[12px] md:rounded-[14px] p-4 md:p-5 border border-border">
          <p className="text-text-muted text-[11px] md:text-xs">Ingreso</p>
          <p className="text-base md:text-xl font-bold mt-1 truncate">${stats.income.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-surface rounded-[12px] md:rounded-[14px] p-4 md:p-5 border border-border">
          <p className="text-text-muted text-[11px] md:text-xs">Gastos fijos</p>
          <p className="text-base md:text-xl font-bold mt-1 text-warning truncate">${stats.total_fixed_expenses.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-surface rounded-[12px] md:rounded-[14px] p-4 md:p-5 border border-border">
          <p className="text-text-muted text-[11px] md:text-xs">Gastos diarios</p>
          <p className="text-base md:text-xl font-bold mt-1 text-danger truncate">${stats.total_daily_expenses.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-surface rounded-[12px] md:rounded-[14px] p-4 md:p-5 border border-border">
          <p className="text-text-muted text-[11px] md:text-xs">Ahorrado</p>
          <p className="text-base md:text-xl font-bold mt-1 text-primary truncate">${stats.total_saved.toLocaleString('es-AR')}</p>
        </div>
      </div>

      {/* Calendar */}
      {calendar && (
        <div className="bg-surface rounded-[14px] p-6 border border-border">
          <h3 className="font-semibold text-sm mb-4 capitalize">Calendario · {monthName}</h3>
          <Calendar
            year={calendar.year}
            month={calendar.month}
            days={calendar.days}
            todaySpent={calendar.today.spent}
            todayDate={calendar.today.date}
            onDayClick={(date) => setSelectedDay(date)}
          />
          <p className="text-[11px] text-text-muted mt-3">Click en cualquier día para ver detalles o editar gastos</p>
        </div>
      )}

      {/* Comparativa entre meses */}
      {compare && (
        <div className="bg-surface rounded-[14px] p-6 border border-border">
          <h3 className="font-semibold text-sm mb-4">Comparación con el mes anterior</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div className="bg-background rounded-lg p-4 border border-border">
              <p className="text-[11px] text-text-muted uppercase tracking-wide">Mes anterior ({prevMonthName})</p>
              <p className="text-xl font-bold mt-1">${compare.previous.total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-background rounded-lg p-4 border border-border">
              <p className="text-[11px] text-text-muted uppercase tracking-wide">Mes actual</p>
              <p className="text-xl font-bold mt-1">${compare.current.total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-background rounded-lg p-4 border border-border">
              <p className="text-[11px] text-text-muted uppercase tracking-wide">Diferencia</p>
              <p className={`text-xl font-bold mt-1 ${compare.diff > 0 ? 'text-danger' : compare.diff < 0 ? 'text-primary' : 'text-text-muted'}`}>
                {compare.diff > 0 ? '+' : ''}${compare.diff.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                {compare.diff_percent !== null && (
                  <span className="text-xs ml-2 font-medium">
                    ({compare.diff > 0 ? '+' : ''}{compare.diff_percent.toFixed(1)}%)
                  </span>
                )}
              </p>
            </div>
          </div>

          {compare.categories.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-text-muted mb-2">Por categoría</p>
              {compare.categories
                .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
                .map((c, i) => (
                  <div key={c.category} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(c.category, i) }}></div>
                      <span className="text-sm truncate">{c.category}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span>${c.previous.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                      <span>→</span>
                      <span className="text-text">${c.current.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                      <span className={`font-semibold w-20 text-right ${c.diff > 0 ? 'text-danger' : c.diff < 0 ? 'text-primary' : 'text-text-muted'}`}>
                        {c.diff > 0 ? '+' : ''}${c.diff.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Promedios */}
      {trends && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface rounded-[14px] p-5 border border-border">
            <p className="text-[11px] text-text-muted uppercase tracking-wide">Gasto promedio diario</p>
            <p className="text-xl font-bold mt-1 text-secondary">${trends.averages.per_day.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
            <p className="text-[11px] text-text-muted mt-1">Últimos {trends.months} meses</p>
          </div>
          <div className="bg-surface rounded-[14px] p-5 border border-border">
            <p className="text-[11px] text-text-muted uppercase tracking-wide">Gasto promedio semanal</p>
            <p className="text-xl font-bold mt-1 text-secondary">${trends.averages.per_week.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-surface rounded-[14px] p-5 border border-border">
            <p className="text-[11px] text-text-muted uppercase tracking-wide">Gasto promedio mensual</p>
            <p className="text-xl font-bold mt-1 text-secondary">${trends.averages.per_month.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
      )}

      {/* Análisis por día de semana */}
      {weekday && weekday.some((w) => w.total > 0) && (
        <div className="bg-surface rounded-[14px] p-6 border border-border">
          <h3 className="font-semibold text-sm mb-1">Gasto por día de la semana</h3>
          <p className="text-xs text-text-muted mb-4">Últimos 90 días</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weekday}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2B3642" />
              <XAxis dataKey="day" stroke="#9BA9B4" fontSize={12} />
              <YAxis stroke="#9BA9B4" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1E2730', border: '1px solid #2B3642', borderRadius: '10px' }}
                labelStyle={{ color: '#F3F7FA' }}
                formatter={(value, name) => {
                  const v = Number(value || 0);
                  if (name === 'total') return [`$${v.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`, 'Total'];
                  if (name === 'avg') return [`$${v.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`, 'Promedio'];
                  return [v, name];
                }}
              />
              <Bar dataKey="total" fill="#19C37D" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tendencia últimos meses */}
      {trends && trends.trend.length > 0 && (
        <div className="bg-surface rounded-[14px] p-6 border border-border">
          <h3 className="font-semibold text-sm mb-4">Tendencia últimos {trends.months} meses</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trends.trend.map((t) => ({
              month: new Date(t.year, t.month - 1).toLocaleString('es-AR', { month: 'short', year: '2-digit' }),
              total: t.total,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2B3642" />
              <XAxis dataKey="month" stroke="#9BA9B4" fontSize={12} />
              <YAxis stroke="#9BA9B4" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1E2730', border: '1px solid #2B3642', borderRadius: '10px' }}
                formatter={(value) => [`$${Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`, 'Total']}
              />
              <Line type="monotone" dataKey="total" stroke="#4ADEDE" strokeWidth={2} dot={{ fill: '#4ADEDE', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>

          {trends.by_category.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-text-muted mb-3">Promedio mensual por categoría</p>
              <div className="space-y-2">
                {trends.by_category.slice(0, 6).map((c, i) => (
                  <div key={c.category} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(c.category, i) }}></div>
                      <span className="text-sm">{c.category}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-text-muted">total ${c.total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                      <span className="font-semibold w-24 text-right">${c.avg_per_month.toLocaleString('es-AR', { maximumFractionDigits: 0 })}/mes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface rounded-[14px] p-6 border border-border">
          <h3 className="font-semibold text-sm mb-3">Distribución del ahorro</h3>
          {stats.buckets_breakdown && stats.buckets_breakdown.length > 0 ? (
            <div className="space-y-2">
              {stats.buckets_breakdown.map((b) => (
                <div key={b.bucket_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }}></div>
                    <span className="text-text-muted text-sm truncate">
                      {b.name} <span className="text-text-muted/60 text-xs">· {b.percent}%</span>
                    </span>
                  </div>
                  <span className="money font-semibold text-sm flex-shrink-0 ml-2" style={{ color: b.color }}>
                    ${b.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-2 mt-2 border-t border-border">
                <span className="text-text-muted text-xs">Total</span>
                <span className="money font-semibold text-sm">
                  ${stats.total_saved.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-text-muted text-sm">A inversión</span>
                <span className="money text-primary font-semibold">${stats.to_investment.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted text-sm">A excedente</span>
                <span className="money text-warning font-semibold">${stats.to_savings.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-surface rounded-[14px] p-6 border border-border">
          <h3 className="font-semibold text-sm mb-3">Presupuesto diario</h3>
          <p className="money text-3xl font-bold text-primary">${stats.daily_budget.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
          <p className="text-text-muted text-sm mt-1">{stats.days_in_month} días en el mes</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-[14px] p-6 border border-border">
          <h3 className="font-semibold text-sm mb-4">Gasto diario vs presupuesto</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2B3642" />
              <XAxis dataKey="date" stroke="#9BA9B4" fontSize={12} />
              <YAxis stroke="#9BA9B4" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1E2730', border: '1px solid #2B3642', borderRadius: '10px' }}
                labelStyle={{ color: '#F3F7FA' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="gasto" stroke="#FF5D73" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="presupuesto" stroke="#19C37D" strokeWidth={1} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-surface rounded-[14px] p-6 border border-border">
          <h3 className="font-semibold text-sm mb-4">Por categoría</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name, index)} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E2730', border: '1px solid #2B3642', borderRadius: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text-muted text-center py-8">Sin datos</p>
          )}
        </div>
      </div>

      {/* Category breakdown */}
      {stats.by_category.length > 0 && (
        <div className="bg-surface rounded-[14px] p-6 border border-border">
          <h3 className="font-semibold text-sm mb-4">Detalle por categoría · {monthName}</h3>
          <div className="space-y-2">
            {stats.by_category.map((cat, i) => (
              <div key={cat.category} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor(cat.category, i) }}></div>
                  <span className="text-sm">{cat.category}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-text-muted text-xs">{cat.count} gastos</span>
                  <span className="font-semibold text-sm">${Number(cat.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedDay && (
        <DayDetailModal
          date={selectedDay}
          onClose={() => setSelectedDay(null)}
          onChange={reload}
        />
      )}
    </div>
  );
}
