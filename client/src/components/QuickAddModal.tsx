import { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import { useCategories } from '../hooks/useCategories';

interface QuickAddModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export default function QuickAddModal({ onClose, onSaved }: QuickAddModalProps) {
  const { categories } = useCategories('daily');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (categories.length > 0 && !category) setCategory(categories[0].name);
  }, [categories, category]);

  useEffect(() => {
    // Auto-focus amount on open
    setTimeout(() => amountRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !category) return;
    setSaving(true);
    try {
      await api.post('/daily-expenses', {
        amount: Number(amount),
        description,
        category,
        date,
      });
      onSaved();
    } catch (err) {
      console.error(err);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-background/80 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full md:max-w-md bg-surface rounded-t-2xl md:rounded-2xl border-t md:border border-border p-5 space-y-4 animate-in slide-in-from-bottom duration-200"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Agregar gasto</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text text-xl leading-none w-8 h-8 flex items-center justify-center rounded-md hover:bg-border/50 transition-colors"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div>
          <label htmlFor="qa-amount" className="block text-xs text-text-muted mb-1">Monto</label>
          <input
            ref={amountRef}
            id="qa-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-text text-2xl font-bold"
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label htmlFor="qa-description" className="block text-xs text-text-muted mb-1">Descripción</label>
          <input
            id="qa-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-text text-base"
            placeholder="¿En qué gastaste?"
            required
          />
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-2">Categoría</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.name)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  category === c.name
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-border text-text-muted hover:border-text-muted'
                }`}
                style={category === c.name ? { borderColor: c.color, color: c.color, backgroundColor: `${c.color}15` } : {}}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="qa-date" className="block text-xs text-text-muted mb-1">Fecha</label>
          <input
            id="qa-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-text text-sm"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-border/50 hover:bg-border rounded-xl font-medium text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !amount || !description || !category}
            className="flex-1 py-3 bg-primary hover:bg-primary-dark text-background rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
