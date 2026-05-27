import { useState, useEffect } from 'react';
import api from '../api/client';

interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
}

const CATEGORIES = [
  'Comida',
  'Transporte',
  'Entretenimiento',
  'Salud',
  'Educación',
  'Ropa',
  'Hogar',
  'Otros',
];

export default function DailyExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const loadExpenses = () => {
    const now = new Date();
    api.get('/daily-expenses', {
      params: { month: now.getMonth() + 1, year: now.getFullYear() },
    })
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
      await api.post('/daily-expenses', {
        amount: Number(amount),
        description,
        category,
        date,
      });
      setAmount('');
      setDescription('');
      setShowForm(false);
      loadExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/daily-expenses/${id}`);
      loadExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="animate-pulse text-text-muted">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gastos Diarios</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-background rounded-[10px] font-semibold text-sm transition-colors"
        >
          {showForm ? 'Cancelar' : '+ Nuevo gasto'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-[14px] p-6 border border-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="description" className="block text-sm text-text-muted mb-1">Descripción</label>
              <input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-[10px] focus:outline-none focus:border-primary text-text placeholder-text-muted/50"
                placeholder="¿En qué gastaste?"
                required
              />
            </div>
            <div>
              <label htmlFor="date" className="block text-sm text-text-muted mb-1">Fecha</label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-[10px] focus:outline-none focus:border-primary text-text"
              />
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

      {/* Expenses list */}
      <div className="bg-surface rounded-[14px] border border-border overflow-hidden">
        {expenses.length === 0 ? (
          <p className="p-6 text-text-muted text-center">No hay gastos este mes</p>
        ) : (
          <div className="divide-y divide-border">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex justify-between items-center p-4 hover:bg-surface-light/30 transition-colors">
                <div className="flex-1">
                  <p className="text-sm font-medium">{expense.description}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {expense.category} • {new Date(expense.date).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-danger font-semibold text-sm">
                    -${Number(expense.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="text-text-muted/50 hover:text-danger transition-colors"
                    aria-label="Eliminar gasto"
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
