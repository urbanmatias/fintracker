import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

interface TodaySummary {
  date: string;
  daily_budget: number;
  total_spent: number;
  remaining: number;
  to_savings: number;
  to_investment: number;
  expenses: Array<{
    id: string;
    amount: number;
    description: string;
    category: string;
  }>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [today, setToday] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/daily-expenses/today')
      .then((res) => setToday(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse text-white/50">Cargando...</div>;
  }

  const budgetUsedPercent = today ? (today.total_spent / today.daily_budget) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Hola, {user?.name} 👋</h1>
        <p className="text-white/50 mt-1">Resumen de hoy</p>
      </div>

      {/* Budget cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl p-6 border border-white/10">
          <p className="text-white/50 text-sm">Presupuesto diario</p>
          <p className="text-2xl font-bold mt-1">
            ${today?.daily_budget.toLocaleString('es-AR', { minimumFractionDigits: 2 }) || '0.00'}
          </p>
        </div>

        <div className="bg-surface rounded-xl p-6 border border-white/10">
          <p className="text-white/50 text-sm">Gastado hoy</p>
          <p className={`text-2xl font-bold mt-1 ${budgetUsedPercent > 100 ? 'text-danger' : 'text-secondary'}`}>
            ${today?.total_spent.toLocaleString('es-AR', { minimumFractionDigits: 2 }) || '0.00'}
          </p>
        </div>

        <div className="bg-surface rounded-xl p-6 border border-white/10">
          <p className="text-white/50 text-sm">Restante</p>
          <p className={`text-2xl font-bold mt-1 ${(today?.remaining || 0) < 0 ? 'text-danger' : 'text-secondary'}`}>
            ${today?.remaining.toLocaleString('es-AR', { minimumFractionDigits: 2 }) || '0.00'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-surface rounded-xl p-6 border border-white/10">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-white/50">Uso del presupuesto</span>
          <span className={budgetUsedPercent > 100 ? 'text-danger' : 'text-white/70'}>
            {budgetUsedPercent.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              budgetUsedPercent > 100 ? 'bg-danger' : budgetUsedPercent > 75 ? 'bg-warning' : 'bg-secondary'
            }`}
            style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Distribution preview */}
      {today && today.remaining > 0 && (
        <div className="bg-surface rounded-xl p-6 border border-white/10">
          <h3 className="font-medium mb-4">Si no gastás más hoy:</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/10 rounded-lg p-4">
              <p className="text-sm text-white/50">A inversión ({user?.investment_percent}%)</p>
              <p className="text-lg font-bold text-primary">
                ${today.to_investment.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-white/30 mt-1">{user?.investment_destination}</p>
            </div>
            <div className="bg-secondary/10 rounded-lg p-4">
              <p className="text-sm text-white/50">A cuenta ({user?.savings_percent}%)</p>
              <p className="text-lg font-bold text-secondary">
                ${today.to_savings.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Today's expenses */}
      {today && today.expenses.length > 0 && (
        <div className="bg-surface rounded-xl p-6 border border-white/10">
          <h3 className="font-medium mb-4">Gastos de hoy</h3>
          <div className="space-y-3">
            {today.expenses.map((expense) => (
              <div key={expense.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm font-medium">{expense.description}</p>
                  <p className="text-xs text-white/40">{expense.category}</p>
                </div>
                <p className="text-danger font-medium">
                  -${Number(expense.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!user?.monthly_income && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-6">
          <p className="text-warning font-medium">⚠️ Configurá tu ingreso mensual</p>
          <p className="text-white/50 text-sm mt-1">
            Andá a Configuración para establecer tu ingreso y la regla de distribución.
          </p>
        </div>
      )}
    </div>
  );
}
