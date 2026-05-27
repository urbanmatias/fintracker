import { useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import api from '../api/client';
import Calendar from '../components/Calendar';
import DayDetailModal from '../components/DayDetailModal';

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
  by_category: Array<{ category: string; total: number; count: string }>;
  daily_breakdown: Array<{ date: string; total: number }>;
  days_in_month: number;
}

const COLORS = ['#19C37D', '#4ADEDE', '#FBBF24', '#FF5D73', '#A78BFA', '#F472B6', '#34D399', '#818CF8'];

export default function Stats() {
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [calendar, setCalendar] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    Promise.all([
      api.get(`/stats/monthly/${selectedYear}/${selectedMonth}`),
      api.get(`/stats/calendar/${selectedYear}/${selectedMonth}`),
    ])
      .then(([statsRes, calRes]) => {
        setStats(statsRes.data);
        setCalendar(calRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  if (loading) return <div className="animate-pulse text-text-muted">Cargando estadísticas...</div>;
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Estadísticas</h1>
        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2 bg-surface border border-border rounded-[10px] text-text text-sm"
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-[14px] p-5 border border-border">
          <p className="text-text-muted text-xs">Ingreso</p>
          <p className="text-xl font-bold mt-1">${stats.income.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-surface rounded-[14px] p-5 border border-border">
          <p className="text-text-muted text-xs">Gastos fijos</p>
          <p className="text-xl font-bold mt-1 text-warning">${stats.total_fixed_expenses.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-surface rounded-[14px] p-5 border border-border">
          <p className="text-text-muted text-xs">Gastos diarios</p>
          <p className="text-xl font-bold mt-1 text-danger">${stats.total_daily_expenses.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-surface rounded-[14px] p-5 border border-border">
          <p className="text-text-muted text-xs">Ahorrado</p>
          <p className="text-xl font-bold mt-1 text-primary">${stats.total_saved.toLocaleString('es-AR')}</p>
        </div>
      </div>

      {/* Calendar */}
      {calendar && (
        <div className="bg-surface rounded-[14px] p-6 border border-border">
          <h3 className="font-semibold text-sm mb-4">Calendario del mes</h3>
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

      {/* Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface rounded-[14px] p-6 border border-border">
          <h3 className="font-semibold text-sm mb-3">Distribución del ahorro</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-text-muted text-sm">A inversión</span>
              <span className="text-primary font-semibold">${stats.to_investment.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted text-sm">A excedente</span>
              <span className="text-warning font-semibold">${stats.to_savings.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-[14px] p-6 border border-border">
          <h3 className="font-semibold text-sm mb-3">Presupuesto diario</h3>
          <p className="text-3xl font-bold text-primary">${stats.daily_budget.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
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
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
          <h3 className="font-semibold text-sm mb-4">Detalle por categoría</h3>
          <div className="space-y-2">
            {stats.by_category.map((cat, i) => (
              <div key={cat.category} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
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

      {/* Day detail modal */}
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
