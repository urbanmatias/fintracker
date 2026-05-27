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

  if (loading) return <div className="animate-pulse text-white/50">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gastos Fijos</h1>
          <p className="text-white/50 text-sm mt-1">
            Total activos: ${totalActive.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg font-medium transition-colors"
        >
          {showForm ? 'Cancelar' : '+ Nuevo gasto fijo'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-xl p-6 border border-white/10 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm text-white/70 mb-1">Nombre</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-light border border-white/10 rounded-lg focus:outline-none focus:border-primary text-white"
                placeholder="Ej: Netflix"
                required
              />
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm text-white/70 mb-1">Monto</label>
              <input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-light border border-white/10 rounded-lg focus:outline-none focus:border-primary text-white"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm text-white/70 mb-1">Categoría</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-light border border-white/10 rounded-lg focus:outline-none focus:border-primary text-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-primary hover:bg-primary-dark rounded-lg font-medium transition-colors"
          >
            Guardar
          </button>
        </form>
      )}

      <div className="bg-surface rounded-xl border border-white/10 overflow-hidden">
        {expenses.length === 0 ? (
          <p className="p-6 text-white/50 text-center">No hay gastos fijos configurados</p>
        ) : (
          <div className="divide-y divide-white/5">
            {expenses.map((expense) => (
              <div key={expense.id} className={`flex justify-between items-center p-4 ${!expense.active ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleActive(expense)}
                    className={`w-5 h-5 rounded border ${expense.active ? 'bg-secondary border-secondary' : 'border-white/30'} flex items-center justify-center`}
                    aria-label={expense.active ? 'Desactivar' : 'Activar'}
                  >
                    {expense.active && <span className="text-xs">✓</span>}
                  </button>
                  <div>
                    <p className="font-medium">{expense.name}</p>
                    <p className="text-xs text-white/40">{expense.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-medium">
                    ${Number(expense.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="text-white/30 hover:text-danger transition-colors"
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
