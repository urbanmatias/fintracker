import { useState, useEffect } from 'react';
import api from '../api/client';
import { useCategories } from '../hooks/useCategories';

interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  tags?: string[];
}

export default function DailyExpenses() {
  const { categories } = useCategories('daily');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');

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

  useEffect(() => {
    if (categories.length > 0 && !category) setCategory(categories[0].name);
  }, [categories, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      await api.post('/daily-expenses', {
        amount: Number(amount),
        description,
        category,
        date,
        tags,
      });
      setAmount('');
      setDescription('');
      setTagsInput('');
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

  const getCategoryColor = (name: string) => categories.find((c) => c.name === name)?.color || '#9BA9B4';

  const filteredExpenses = expenses.filter((e) => {
    if (filterCategory && e.category !== filterCategory) return false;
    if (search) {
      const s = search.toLowerCase();
      const matchDesc = e.description.toLowerCase().includes(s);
      const matchTags = (e.tags || []).some((t) => t.toLowerCase().includes(s));
      if (!matchDesc && !matchTags) return false;
    }
    return true;
  });

  if (loading) return <div className="animate-pulse text-text-muted">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold hidden md:block">Gastos Diarios</h1>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-background rounded-[10px] font-semibold text-sm transition-colors"
          >
            {showForm ? 'Cancelar' : '+ Nuevo gasto'}
          </button>
        </div>
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
                className="w-full px-4 py-2.5 bg-background border border-border rounded-[10px] focus:outline-none focus:border-primary text-text"
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
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
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
                className="w-full px-4 py-2.5 bg-background border border-border rounded-[10px] focus:outline-none focus:border-primary text-text"
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
          <div>
            <label htmlFor="tags" className="block text-sm text-text-muted mb-1">Etiquetas (separadas por coma)</label>
            <input
              id="tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-[10px] focus:outline-none focus:border-primary text-text"
              placeholder="ej: viaje-bariloche, regalo, urgencia"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-background rounded-[10px] font-semibold text-sm transition-colors"
          >
            Guardar
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2 md:gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="flex-1 px-4 py-2.5 md:py-2 bg-surface border border-border rounded-[10px] focus:outline-none focus:border-primary text-text text-sm"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2.5 md:py-2 bg-surface border border-border rounded-[10px] focus:outline-none focus:border-primary text-text text-sm"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-surface rounded-[14px] border border-border overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <p className="p-6 text-text-muted text-center">No hay gastos para mostrar</p>
        ) : (
          <div className="divide-y divide-border">
            {filteredExpenses.map((expense) => (
              <div key={expense.id} className="flex justify-between items-center p-4 hover:bg-surface-light/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getCategoryColor(expense.category) }}></div>
                    <p className="text-sm font-medium truncate">{expense.description}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <p className="text-xs text-text-muted">
                      {expense.category} • {new Date(expense.date).toLocaleDateString('es-AR')}
                    </p>
                    {expense.tags && expense.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {expense.tags.map((tag) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-secondary/15 text-secondary rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4">
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
