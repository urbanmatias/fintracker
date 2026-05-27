import { useState, useEffect } from 'react';
import api from '../api/client';
import { useCategories } from '../hooks/useCategories';
import { useDataRefresh } from '../context/DataContext';

interface Recurring {
  id: string;
  name: string;
  amount: number;
  category: string;
  day_of_month: number;
  active: boolean;
}

export default function RecurringExpenses() {
  const { categories } = useCategories('daily');
  const { refresh } = useDataRefresh();
  const [items, setItems] = useState<Recurring[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');

  const load = () => {
    api.get('/recurring-expenses')
      .then((res) => setItems(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (categories.length > 0 && !category) setCategory(categories[0].name);
  }, [categories, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/recurring-expenses', {
        name,
        amount: Number(amount),
        category,
        day_of_month: Number(dayOfMonth),
      });
      setName('');
      setAmount('');
      setDayOfMonth('1');
      setShowForm(false);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const generate = async (id: string) => {
    if (!confirm('¿Registrar este gasto recurrente para hoy?')) return;
    try {
      await api.post(`/recurring-expenses/${id}/generate`, {});
      refresh();
      alert('Gasto registrado ✓');
    } catch (err) {
      console.error(err);
      alert('Error al registrar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este gasto recurrente?')) return;
    try {
      await api.delete(`/recurring-expenses/${id}`);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="animate-pulse text-text-muted">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold hidden md:block">Gastos Recurrentes</h1>
          <p className="text-text-muted text-xs md:text-sm md:mt-1">
            Plantillas para registrar gastos que se repiten cada mes (gimnasio, cuotas, etc.)
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-background rounded-[10px] font-semibold text-sm transition-colors self-start"
        >
          {showForm ? 'Cancelar' : '+ Nuevo recurrente'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-[14px] p-6 border border-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="r-name" className="block text-sm text-text-muted mb-1">Nombre</label>
              <input
                id="r-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-[10px] focus:outline-none focus:border-primary text-text"
                placeholder="Ej: Gimnasio"
                required
              />
            </div>
            <div>
              <label htmlFor="r-amount" className="block text-sm text-text-muted mb-1">Monto</label>
              <input
                id="r-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-[10px] focus:outline-none focus:border-primary text-text"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label htmlFor="r-cat" className="block text-sm text-text-muted mb-1">Categoría</label>
              <select
                id="r-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-[10px] focus:outline-none focus:border-primary text-text"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="r-day" className="block text-sm text-text-muted mb-1">Día del mes</label>
              <input
                id="r-day"
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-[10px] focus:outline-none focus:border-primary text-text"
                required
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

      <div className="bg-surface rounded-[14px] border border-border overflow-hidden">
        {items.length === 0 ? (
          <p className="p-6 text-text-muted text-center">No hay gastos recurrentes configurados</p>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-4 hover:bg-surface-light/30 transition-colors">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {item.category} • Día {item.day_of_month} de cada mes
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold text-sm">
                    ${Number(item.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                  <button
                    onClick={() => generate(item.id)}
                    className="text-xs px-3 py-1.5 bg-primary/15 hover:bg-primary/25 text-primary rounded-md font-medium transition-colors"
                    title="Registrar este gasto hoy"
                  >
                    Registrar hoy
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
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
