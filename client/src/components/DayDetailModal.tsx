import { useState, useEffect } from 'react';
import api from '../api/client';

const CATEGORIES = ['Comida', 'Transporte', 'Entretenimiento', 'Salud', 'Educación', 'Ropa', 'Hogar', 'Otros'];

interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
}

interface DayBalance {
  budget: number;
  spent: number;
  surplus: number;
  to_investment: number;
  to_excedent: number;
  from_excedent: number;
  excedent_balance: number;
}

interface DayDetail {
  date: string;
  expenses: Expense[];
  balance: DayBalance | null;
  total_spent: number;
  daily_budget: number;
}

interface DayDetailModalProps {
  date: string;
  onClose: () => void;
  onChange: () => void;
}

export default function DayDetailModal({ date, onClose, onChange }: DayDetailModalProps) {
  const [data, setData] = useState<DayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);

  const load = () => {
    setLoading(true);
    api.get(`/daily-expenses/day/${date}`)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [date]);

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setAmount(String(expense.amount));
    setDescription(expense.description);
    setCategory(expense.category);
    setShowAdd(false);
  };

  const startAdd = () => {
    setShowAdd(true);
    setEditingId(null);
    setAmount('');
    setDescription('');
    setCategory(CATEGORIES[0]);
  };

  const cancel = () => {
    setEditingId(null);
    setShowAdd(false);
  };

  const save = async () => {
    try {
      if (editingId) {
        await api.put(`/daily-expenses/${editingId}`, {
          amount: Number(amount),
          description,
          category,
        });
      } else {
        await api.post('/daily-expenses', {
          amount: Number(amount),
          description,
          category,
          date,
        });
      }
      cancel();
      load();
      onChange();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      await api.delete(`/daily-expenses/${id}`);
      load();
      onChange();
    } catch (err) {
      console.error(err);
    }
  };

  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface rounded-2xl border border-border shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border p-5 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold capitalize">{formattedDate}</h2>
            {data && (
              <p className="text-xs text-text-muted mt-1">
                {data.expenses.length} {data.expenses.length === 1 ? 'gasto' : 'gastos'}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text text-xl leading-none w-7 h-7 flex items-center justify-center rounded-md hover:bg-border/50 transition-colors"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-text-muted">Cargando...</div>
        ) : data ? (
          <div className="p-5 space-y-5">
            {/* Balance summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-background rounded-lg p-3 border border-border">
                <p className="text-[11px] text-text-muted">Presupuesto</p>
                <p className="text-base font-bold text-primary mt-0.5">
                  ${data.daily_budget.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-background rounded-lg p-3 border border-border">
                <p className="text-[11px] text-text-muted">Gastado</p>
                <p className="text-base font-bold text-danger mt-0.5">
                  ${data.total_spent.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-background rounded-lg p-3 border border-border">
                <p className="text-[11px] text-text-muted">Saldo</p>
                <p className={`text-base font-bold mt-0.5 ${data.daily_budget - data.total_spent >= 0 ? 'text-primary' : 'text-danger'}`}>
                  {data.daily_budget - data.total_spent >= 0 ? '+' : ''}
                  ${(data.daily_budget - data.total_spent).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* Balance details if closed */}
            {data.balance && (
              <div className="bg-background rounded-lg p-4 border border-border">
                <p className="text-xs font-medium text-text-muted mb-3">Distribución del día</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {data.balance.to_investment > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">A inversión</span>
                      <span className="text-primary font-medium">${data.balance.to_investment.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {data.balance.to_excedent > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">A excedente</span>
                      <span className="text-warning font-medium">${data.balance.to_excedent.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {data.balance.from_excedent > 0 && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Del excedente</span>
                      <span className="text-danger font-medium">-${data.balance.from_excedent.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between col-span-2 pt-2 border-t border-border">
                    <span className="text-text-muted">Excedente al cierre</span>
                    <span className="text-secondary font-semibold">${data.balance.excedent_balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Expenses list */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold">Gastos del día</h3>
                {!showAdd && !editingId && (
                  <button
                    onClick={startAdd}
                    className="text-xs px-3 py-1.5 bg-primary hover:bg-primary-dark text-background rounded-md font-semibold transition-colors"
                  >
                    + Agregar
                  </button>
                )}
              </div>

              {/* Add/Edit form */}
              {(showAdd || editingId) && (
                <div className="bg-background rounded-lg p-4 border border-primary/40 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Monto"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:outline-none focus:border-primary text-text text-sm"
                    />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:outline-none focus:border-primary text-text text-sm"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Descripción"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:outline-none focus:border-primary text-text text-sm"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancel}
                      className="text-xs px-3 py-1.5 bg-border/50 hover:bg-border rounded-md transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={save}
                      disabled={!amount || !description}
                      className="text-xs px-3 py-1.5 bg-primary hover:bg-primary-dark text-background rounded-md font-semibold transition-colors disabled:opacity-50"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              )}

              {/* List */}
              {data.expenses.length === 0 && !showAdd ? (
                <p className="text-sm text-text-muted text-center py-6">No hay gastos registrados este día</p>
              ) : (
                <div className="divide-y divide-border">
                  {data.expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className={`flex justify-between items-center py-3 ${editingId === expense.id ? 'opacity-30' : ''}`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{expense.description}</p>
                        <p className="text-xs text-text-muted mt-0.5">{expense.category}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-danger font-semibold text-sm">
                          -${Number(expense.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </p>
                        <button
                          onClick={() => startEdit(expense)}
                          disabled={editingId === expense.id}
                          className="text-text-muted/50 hover:text-secondary transition-colors text-sm"
                          aria-label="Editar"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-text-muted/50 hover:text-danger transition-colors"
                          aria-label="Eliminar"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
