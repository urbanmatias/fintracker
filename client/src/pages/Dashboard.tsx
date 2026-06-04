import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDataRefresh } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import api from '../api/client';
import AnimatedNumber from '../components/AnimatedNumber';
import InsightCards, { type Insight } from '../components/InsightCard';
import EmptyState from '../components/EmptyState';
import ForecastCard from '../components/ForecastCard';
import { Settings as SettingsIcon, TrendingUp, Wallet, PiggyBank, ArrowRight, Trash2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BucketBreakdown {
  bucket_id: string;
  name: string;
  type: 'investment' | 'excedent' | 'custom';
  color: string;
  percent: number;
  description: string | null;
  amount: number;
}

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
  buckets_breakdown?: BucketBreakdown[];
  expenses: Array<{
    id: string;
    amount: number;
    description: string;
    category: string;
  }>;
}

const greetings = ['Hola', '¿Cómo va?', 'Buenas', '¿Qué tal?'];

export default function Dashboard() {
  const { user } = useAuth();
  const { refreshKey, refresh } = useDataRefresh();
  const toast = useToast();
  const [today, setToday] = useState<TodaySummary | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    try {
      const t = await api.get('/daily-expenses/today');
      setToday(t.data);
    } catch (err) {
      console.error(err);
    }
    api.get('/insights')
      .then((res) => setInsights(res.data.insights || []))
      .catch((err) => console.error('Insights failed:', err));
  };

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const { pulling, refreshing, pullDistance, isReady } = usePullToRefresh({
    onRefresh: async () => {
      await loadAll();
      refresh();
    },
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-surface rounded-2xl animate-pulse"></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 bg-surface rounded-xl animate-pulse"></div>
          <div className="h-24 bg-surface rounded-xl animate-pulse"></div>
          <div className="h-24 bg-surface rounded-xl animate-pulse"></div>
          <div className="h-24 bg-surface rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!user?.monthly_income || Number(user.monthly_income) <= 0) {
    return (
      <div className="bg-surface rounded-[14px] border border-border">
        <EmptyState
          icon={SettingsIcon}
          title="Configurá tu ingreso para empezar"
          description="Necesitamos saber cuánto ganás por mes para calcular tu presupuesto diario y la regla de distribución."
          action={
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-background rounded-xl font-semibold text-sm transition-colors"
            >
              Ir a configuración
              <ArrowRight className="w-4 h-4" />
            </Link>
          }
        />
      </div>
    );
  }

  const safeBudget = today?.daily_budget && today.daily_budget > 0 ? today.daily_budget : 0;
  const safeSpent = today?.total_spent || 0;
  const budgetUsedPercent = safeBudget > 0 ? (safeSpent / safeBudget) * 100 : 0;
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  const remaining = today?.remaining || 0;
  const isOverBudget = remaining < 0;

  return (
    <div className="space-y-5 md:space-y-6 fade-in-stagger">
      {/* Pull to refresh hint */}
      {(pulling || refreshing) && (
        <div
          className="flex items-center justify-center text-text-muted text-xs gap-2 -mt-2"
          style={{
            height: refreshing ? 40 : pullDistance / 2,
            transition: refreshing ? 'height 0.2s ease' : 'none',
          }}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''} ${isReady && !refreshing ? 'rotate-180' : ''} transition-transform`} />
          {refreshing ? 'Actualizando...' : isReady ? 'Soltá para actualizar' : 'Tirá para actualizar'}
        </div>
      )}
      {/* Hero card - the star of the show */}
      <div className="relative bg-gradient-to-br from-surface to-sidebar border border-border rounded-2xl md:rounded-[20px] p-6 md:p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

        <div className="relative">
          <p className="text-xs md:text-sm text-text-muted">
            {greeting}, <span className="text-text font-medium">{user?.name?.split(' ')[0]}</span>
          </p>
          <p className="text-[11px] md:text-xs text-text-muted mt-1">Te quedan para hoy</p>

          <div className="hero-glow my-3 md:my-4">
            <h1 className={`text-5xl md:text-7xl font-bold count-up money ${isOverBudget ? 'text-danger' : 'gradient-text'}`}>
              <AnimatedNumber value={remaining} duration={800} decimals={0} />
            </h1>
          </div>

          {/* Mini progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] md:text-xs text-text-muted">
              <span>de ${today?.daily_budget.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
              <span className={budgetUsedPercent > 100 ? 'text-danger font-semibold' : 'font-semibold'}>
                {budgetUsedPercent.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-border/60 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${
                  budgetUsedPercent > 100 ? 'bg-danger' : budgetUsedPercent > 75 ? 'bg-warning' : 'bg-gradient-to-r from-primary to-secondary'
                }`}
                style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && <InsightCards insights={insights} />}

      {/* Forecast */}
      <ForecastCard refreshKey={refreshKey} />

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface rounded-2xl p-4 border border-border lift">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Wallet className="w-3.5 h-3.5 text-text-muted" />
            <p className="text-[11px] text-text-muted">Gastado</p>
          </div>
          <p className="money text-base md:text-lg font-bold text-danger truncate">
            ${today?.total_spent.toLocaleString('es-AR', { maximumFractionDigits: 0 }) || '0'}
          </p>
        </div>

        <div className={`bg-surface rounded-2xl p-4 border lift ${(today?.excedent_after_today ?? 0) < 0 ? 'border-danger/40' : 'border-warning/25'}`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <PiggyBank className={`w-3.5 h-3.5 ${(today?.excedent_after_today ?? 0) < 0 ? 'text-danger' : 'text-warning'}`} />
            <p className="text-[11px] text-text-muted">Excedente</p>
          </div>
          <p className={`money text-base md:text-lg font-bold truncate ${(today?.excedent_after_today ?? 0) < 0 ? 'text-danger' : 'text-warning'}`}>
            ${(today?.excedent_after_today ?? today?.excedent_balance ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="bg-surface rounded-2xl p-4 border border-primary/25 lift">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <p className="text-[11px] text-text-muted">A invertir</p>
          </div>
          <p className="money text-base md:text-lg font-bold text-primary truncate">
            ${today?.to_investment.toLocaleString('es-AR', { maximumFractionDigits: 0 }) || '0'}
          </p>
        </div>
      </div>

      {/* Over budget alert */}
      {today?.over_budget && (
        <div className="bg-danger/[0.08] border border-danger/25 rounded-2xl p-4 fade-in">
          <p className="text-danger text-sm font-semibold">
            Te pasaste ${today.over_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })} del presupuesto
          </p>
          {today.from_excedent > 0 && (
            <p className="text-text-muted text-xs mt-1">
              Se descuentan ${today.from_excedent.toLocaleString('es-AR', { minimumFractionDigits: 2 })} de tu excedente
            </p>
          )}
        </div>
      )}

      {/* Distribution preview */}
      {today && today.remaining > 0 && (
        <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border">
          <h3 className="font-semibold text-sm mb-4">Si no gastás más hoy</h3>

          {today.buckets_breakdown && today.buckets_breakdown.length > 0 ? (
            <>
              <div className={`grid gap-3 ${
                today.buckets_breakdown.length <= 2 ? 'grid-cols-1 md:grid-cols-2' :
                today.buckets_breakdown.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
                'grid-cols-2 md:grid-cols-4'
              }`}>
                {today.buckets_breakdown.map((b) => (
                  <div
                    key={b.bucket_id}
                    className="rounded-xl p-4 border"
                    style={{
                      backgroundColor: `${b.color}10`,
                      borderColor: `${b.color}33`,
                    }}
                  >
                    <p className="text-[11px] text-text-muted truncate">{b.name} · {b.percent}%</p>
                    <p className="money text-lg font-bold mt-1" style={{ color: b.color }}>
                      ${b.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                    {b.description && (
                      <p className="text-[10px] text-text-muted mt-1 truncate">{b.description}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs">
                <span className="text-text-muted">Excedente acumulado al cierre del día</span>
                <span className="money font-semibold text-secondary">
                  ${today.excedent_after_today.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </>
          ) : (
            // Fallback when no buckets configured (legacy)
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-primary/[0.06] rounded-xl p-4 border border-primary/20">
                <p className="text-[11px] text-text-muted">Inversión · {today.investment_percent}%</p>
                <p className="money text-lg font-bold text-primary mt-1">
                  ${today.to_investment.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-text-muted mt-1 truncate">{today.investment_destination}</p>
              </div>
              <div className="bg-warning/[0.06] rounded-xl p-4 border border-warning/20">
                <p className="text-[11px] text-text-muted">Excedente · {today.savings_percent}%</p>
                <p className="money text-lg font-bold text-warning mt-1">
                  ${today.to_excedent.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-text-muted mt-1">Colchón</p>
              </div>
              <div className="bg-secondary/[0.06] rounded-xl p-4 border border-secondary/20">
                <p className="text-[11px] text-text-muted">Excedente total</p>
                <p className="money text-lg font-bold text-secondary mt-1">
                  ${today.excedent_after_today.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-text-muted mt-1">Después de hoy</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Today's expenses */}
      {today && today.expenses.length > 0 && (
        <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border">
          <h3 className="font-semibold text-sm mb-3">Gastos de hoy · {today.expenses.length}</h3>
          <div className="space-y-1">
            {today.expenses.map((expense) => (
              <div key={expense.id} className="flex justify-between items-center py-3 border-b border-border last:border-0 group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{expense.description}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">{expense.category}</p>
                </div>
                <div className="flex items-center gap-3 ml-3">
                  <p className="money text-danger font-semibold text-sm">
                    -${Number(expense.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                  <button
                    onClick={async () => {
                      if (!today) return;
                      // Optimistic UI: remove from local state immediately
                      const removed = expense;
                      const idx = today.expenses.findIndex((e) => e.id === expense.id);
                      setToday({
                        ...today,
                        expenses: today.expenses.filter((e) => e.id !== expense.id),
                        total_spent: today.total_spent - Number(expense.amount),
                        remaining: today.remaining + Number(expense.amount),
                      });

                      let undone = false;
                      toast.success('Gasto eliminado', {
                        onUndo: () => {
                          undone = true;
                          setToday((curr) => {
                            if (!curr) return curr;
                            const newExpenses = [...curr.expenses];
                            newExpenses.splice(idx, 0, removed);
                            return {
                              ...curr,
                              expenses: newExpenses,
                              total_spent: curr.total_spent + Number(removed.amount),
                              remaining: curr.remaining - Number(removed.amount),
                            };
                          });
                        },
                      });

                      // Wait for the toast to expire then commit deletion
                      setTimeout(async () => {
                        if (undone) return;
                        try {
                          await api.delete(`/daily-expenses/${removed.id}`);
                          refresh();
                        } catch (err) {
                          console.error(err);
                          toast.error('No se pudo eliminar el gasto');
                          loadAll();
                        }
                      }, 5000);
                    }}
                    className="text-text-muted/40 hover:text-danger transition-colors w-7 h-7 flex items-center justify-center rounded-md hover:bg-danger/10"
                    aria-label="Eliminar gasto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {today && today.expenses.length === 0 && (
        <div className="bg-surface rounded-2xl border border-border">
          <EmptyState
            icon={Wallet}
            title="Día limpio 🌱"
            description="Todavía no cargaste gastos hoy. Tocá el + para empezar."
          />
        </div>
      )}
    </div>
  );
}
