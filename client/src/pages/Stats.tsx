import { useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import api from '../api/client';

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

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export default function Stats() {
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setLoading(true);
    api.get(`/stats/monthly/${selectedYear}/${selectedMonth}`)
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedMonth, selectedYear]);

  if (loading) return <div className="animate-pulse text-white/50">Cargando estadísticas...</div>;
  if (!stats) return <div className="text-white/50">No hay datos para este período</div>;

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
            className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-white text-sm"
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
            className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-white text-sm"
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
        <div className="bg-surface rounded-xl p-5 border border-white/10">
          <p className="text-white/50 text-xs">Ingreso</p>
          <p className="text-xl font-bold mt-1">${stats.income.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-surface rounded-xl p-5 border border-white/10">
          <p className="text-white/50 text-xs">Gastos fijos</p>
          <p className="text-xl font-bold mt-1 text-warning">${stats.total_fixed_expenses.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-surface rounded-xl p-5 border border-white/10">
          <p className="text-white/50 text-xs">Gastos diarios</p>
          <p className="text-xl font-bold mt-1 text-danger">${stats.total_daily_expenses.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-surface rounded-xl p-5 border border-white/10">
          <p className="text-white/50 text-xs">Ahorrado</p>
          <p className="text-xl font-bold mt-1 text-secondary">${stats.total_saved.toLocaleString('es-AR')}</p>
        </div>
      </div>

      {/* Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface rounded-xl p-6 border border-white/10">
          <h3 className="font-medium mb-2">Distribución del ahorro</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-white/50">A inversión</span>
              <span className="text-primary font-medium">${stats.to_investment.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">A cuenta</span>
              <span className="text-secondary font-medium">${stats.to_savings.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-xl p-6 border border-white/10">
          <h3 className="font-medium mb-2">Presupuesto diario</h3>
          <p className="text-3xl font-bold text-primary">${stats.daily_budget.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
          <p className="text-white/40 text-sm mt-1">{stats.days_in_month} días en el mes</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily spending chart */}
        <div className="bg-surface rounded-xl p-6 border border-white/10">
          <h3 className="font-medium mb-4">Gasto diario vs presupuesto</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="date" stroke="#ffffff50" fontSize={12} />
              <YAxis stroke="#ffffff50" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#2a2a3e', border: '1px solid #ffffff20', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Line type="monotone" dataKey="gasto" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="presupuesto" stroke="#6366f1" strokeWidth={1} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category pie chart */}
        <div className="bg-surface rounded-xl p-6 border border-white/10">
          <h3 className="font-medium mb-4">Por categoría</h3>
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
                  contentStyle={{ backgroundColor: '#2a2a3e', border: '1px solid #ffffff20', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-white/50 text-center py-8">Sin datos</p>
          )}
        </div>
      </div>

      {/* Category breakdown table */}
      {stats.by_category.length > 0 && (
        <div className="bg-surface rounded-xl p-6 border border-white/10">
          <h3 className="font-medium mb-4">Detalle por categoría</h3>
          <div className="space-y-2">
            {stats.by_category.map((cat, i) => (
              <div key={cat.category} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span>{cat.category}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-white/40 text-sm">{cat.count} gastos</span>
                  <span className="font-medium">${Number(cat.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
