import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

interface TodaySummary {
  date: string;
  daily_budget: number;
  total_spent: number;
  remaining: number;
  over_budget: boolean;
  over_amount: number;
  to_investment: number;
  to_excedent: number;
  from_excedent: number;
  excedent_balance: number;
  excedent_after_today: number;
  effective_available: number;
  savings_percent: number;
  investment_percent: number;
  investment_destination: string;
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
    return <div className="animate-pulse text-text-muted">Cargando...</div>;
  }

  const budgetUsedPercent = today ? (today.total_spent / today.daily_budget) * 100 : 0;

  return (
    <div className="space-y-5 md:space-y-8">
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold">Hola, {user?.name} 👋</h1>
        <p className="text-text-muted mt-1">Resumen de hoy</p>
      </div>
      <div className="md:hidden">
        <p className="text-sm text-text-muted">Hola, {user?.name}</p>
        <p className="text-xs text-text-muted/70 mt-0.5">Resumen de hoy</p>
      </div>

      {/* Budget cards - 2x2 on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-surface rounded-[12px] md:rounded-[14px] p-4 md:p-6 border border-border">
          <p className="text-text-muted text-[11px] md:text-xs">Presupuesto</p>
          <p className="text-lg md:text-2xl font-bold mt-1 text-primary truncate">
            ${today?.daily_budget.toLocaleString('es-AR', { maximumFractionDigits: 0 }) || '0'}
          </p>
        </div>

        <div className="bg-surface rounded-[12px] md:rounded-[14px] p-4 md:p-6 border border-border">
          <p className="text-text-muted text-[11px] md:text-xs">Gastado hoy</p>
          <p className={`text-lg md:text-2xl font-bold mt-1 truncate ${budgetUsedPercent > 100 ? 'text-danger' : 'text-danger'}`}>
            ${today?.total_spent.toLocaleString('es-AR', { maximumFractionDigits: 0 }) || '0'}
          </p>
        </div>

        <div className="bg-surface rounded-[12px] md:rounded-[14px] p-4 md:p-6 border border-border">
          <p className="text-text-muted text-[11px] md:text-xs">Restante</p>
          <p className={`text-lg md:text-2xl font-bold mt-1 truncate ${(today?.remaining || 0) < 0 ? 'text-danger' : 'text-secondary'}`}>
            ${today?.remaining.toLocaleString('es-AR', { maximumFractionDigits: 0 }) || '0'}
          </p>
        </div>

        <div className="bg-surface rounded-[12px] md:rounded-[14px] p-4 md:p-6 border border-warning/25">
          <p className="text-text-muted text-[11px] md:text-xs">Excedente</p>
          <p className="text-lg md:text-2xl font-bold mt-1 text-warning truncate">
            ${today?.excedent_balance.toLocaleString('es-AR', { maximumFractionDigits: 0 }) || '0'}
          </p>
          <p className="text-[10px] md:text-xs text-text-muted mt-0.5 hidden md:block">Colchón acumulado</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-surface rounded-[14px] p-4 md:p-6 border border-border">
        <div className="flex justify-between text-xs md:text-sm mb-3">
          <span className="text-text-muted">Uso del presupuesto</span>
          <span className={budgetUsedPercent > 100 ? 'text-danger font-semibold' : 'text-text font-semibold'}>
            {budgetUsedPercent.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-border rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${
              budgetUsedPercent > 100 ? 'bg-danger' : budgetUsedPercent > 75 ? 'bg-warning' : 'bg-primary'
            }`}
            style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
          ></div>
        </div>

        {today?.over_budget && (
          <div className="mt-4 p-3 bg-danger/[0.06] border border-danger/20 rounded-[10px]">
            <p className="text-danger text-xs md:text-sm font-medium">
              ⚠️ Te pasaste ${today.over_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })} del presupuesto
            </p>
            {today.from_excedent > 0 && (
              <p className="text-text-muted text-[11px] md:text-xs mt-1">
                Se descuentan ${today.from_excedent.toLocaleString('es-AR', { minimumFractionDigits: 2 })} del excedente
              </p>
            )}
            {today.over_amount > today.excedent_balance && (
              <p className="text-danger/80 text-[11px] md:text-xs mt-1">
                ⚡ No alcanza el excedente para cubrir el exceso
              </p>
            )}
          </div>
        )}
      </div>

      {/* Distribution preview */}
      {today && today.remaining > 0 && (
        <div className="bg-surface rounded-[14px] p-4 md:p-6 border border-border">
          <h3 className="font-semibold text-xs md:text-sm mb-3 md:mb-4">Si no gastás más hoy:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-primary/[0.06] rounded-xl p-4 md:p-5 border border-primary/20">
              <p className="text-[11px] md:text-xs text-text-muted">A inversión ({today.investment_percent}%)</p>
              <p className="text-base md:text-lg font-bold text-primary mt-1">
                ${today.to_investment.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] md:text-xs text-text-muted mt-1 truncate">{today.investment_destination}</p>
            </div>
            <div className="bg-warning/[0.06] rounded-xl p-4 md:p-5 border border-warning/20">
              <p className="text-[11px] md:text-xs text-text-muted">A excedente ({today.savings_percent}%)</p>
              <p className="text-base md:text-lg font-bold text-warning mt-1">
                ${today.to_excedent.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] md:text-xs text-text-muted mt-1">Colchón</p>
            </div>
            <div className="bg-secondary/[0.06] rounded-xl p-4 md:p-5 border border-secondary/20">
              <p className="text-[11px] md:text-xs text-text-muted">Excedente total</p>
              <p className="text-base md:text-lg font-bold text-secondary mt-1">
                ${today.excedent_after_today.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] md:text-xs text-text-muted mt-1">Después de hoy</p>
            </div>
          </div>
        </div>
      )}

      {/* Today's expenses */}
      {today && today.expenses.length > 0 && (
        <div className="bg-surface rounded-[14px] p-4 md:p-6 border border-border">
          <h3 className="font-semibold text-xs md:text-sm mb-3 md:mb-4">Gastos de hoy</h3>
          <div>
            {today.expenses.map((expense) => (
              <div key={expense.id} className="flex justify-between items-center py-3 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{expense.description}</p>
                  <p className="text-xs text-text-muted mt-0.5">{expense.category}</p>
                </div>
                <p className="text-danger font-semibold text-sm ml-3">
                  -${Number(expense.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!user?.monthly_income && (
        <div className="bg-warning/[0.06] border border-warning/20 rounded-[14px] p-4 md:p-6">
          <p className="text-warning font-medium text-sm">⚠️ Configurá tu ingreso mensual</p>
          <p className="text-text-muted text-xs md:text-sm mt-1">
            Andá a Configuración para establecer tu ingreso y la regla de distribución.
          </p>
        </div>
      )}
    </div>
  );
}
