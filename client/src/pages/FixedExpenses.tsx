import { useState, useEffect } from 'react';
import api from '../api/client';

interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  active: boolean;
}

const CATEGORIES = ['Alquiler', 'Servicios', 'Suscripciones', 'Seguros', 'Transporte', 'Otros'];

export default function FixedExpenses() {
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);

  const loadExpenses = () => {
    api.get('/fixed-expenses')
      .then((res) => setExpenses(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/fixed-expenses', {
        name,
        amount: Number(amount),
        category,
      });
      setName('');
      setAmount('');
      setShowForm(false);
      loadExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleActive = async (expense: FixedExpense) => {
    try {
      await api.put(`/fixed-expenses/${expense.id}`, { ...expense, active: !expense.active });
      loadExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/fixed-expenses/${id}`);
      loadExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const totalActive = expenses.filter((e) => e.active).reduce((sum, e) => sum + Number(e.amount), 0);

  if (loading) return <div className="animate-pulse text-text-muted">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gastos Fijos</h1>
          <p className="text-text-muted text-sm mt-1">
            Total activos: ${totalActive.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-background rounded-[10px] font-semibold text-sm transition-colors"
        >
          {showForm ? 'Cancelar' : '+ Nuevo gasto fijo'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-[14px] p-6 border border-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm text-text-muted mb-1">Nombre</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-[10px] focus:outline-none focus:border-primary text-text placeholder-text-muted/50"
                placeholder="Ej: Netflix"
                required
              />
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm text-text-muted mb-1">Monto</label>
              <input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-[10px] focus:outline-none focus:border-primary text-text placeholder-text-muted/50"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm text-text-muted mb-1">Categoría</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-[10px] focus:outline-none focus:border-primary text-text"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-background rounded-[10px] font-semibold text-sm transition-colors"
          >
            Guardar
          </button>
        </form>
      )}

      <div className="bg-surface rounded-[14px] border border-border overflow-hidden">
        {expenses.length === 0 ? (
          <p className="p-6 text-text-muted text-center">No hay gastos fijos configurados</p>
        ) : (
          <div className="divide-y divide-border">
            {expenses.map((expense) => (
              <div key={expense.id} className={`flex justify-between items-center p-4 hover:bg-surface-light/30 transition-colors ${!expense.active ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleActive(expense)}
                    className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${expense.active ? 'bg-primary border-primary' : 'border-border'}`}
                    aria-label={expense.active ? 'Desactivar' : 'Activar'}
                  >
                    {expense.active && <span className="text-xs text-background font-bold">✓</span>}
                  </button>
                  <div>
                    <p className="text-sm font-medium">{expense.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">{expense.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold text-sm">
                    ${Number(expense.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
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
  );
}
