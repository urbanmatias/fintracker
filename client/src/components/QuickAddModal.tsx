import { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import { useCategories } from '../hooks/useCategories';

interface QuickAddModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export default function QuickAddModal({ onClose, onSaved }: QuickAddModalProps) {
  const { categories, loading: catsLoading } = useCategories('daily');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const amountRef = useRef<HTMLInputElement>(null);

  // Auto-select first category once they load
  useEffect(() => {
    if (categories.length > 0 && !category) {
      setCategory(categories[0].name);
    }
  }, [categories, category]);

  useEffect(() => {
    setTimeout(() => amountRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const canSubmit = !!amount && Number(amount) > 0 && !!description.trim() && !!category && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!amount || Number(amount) <= 0) {
      setError('El monto tiene que ser mayor a 0');
      return;
    }
    if (!description.trim()) {
      setError('Falta la descripción');
      return;
    }
    if (!category) {
      setError('Falta la categoría');
      return;
    }

    setSaving(true);
    try {
      await api.post('/daily-expenses', {
        amount: Number(amount),
        description: description.trim(),
        category,
        date,
      });
      onSaved();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Error al guardar');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full md:max-w-md bg-surface rounded-t-2xl md:rounded-2xl border-t md:border border-border flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-200"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-border flex-shrink-0">
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

        {/* Scrollable content */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
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
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-text text-2xl font-bold money"
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
            {catsLoading ? (
              <p className="text-sm text-text-muted">Cargando categorías...</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-warning">
                No tenés categorías. Andá a "Categorías" y creá al menos una para poder cargar gastos.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const selected = category === c.name;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.name)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        selected
                          ? 'border-primary text-primary bg-primary/10'
                          : 'border-border text-text-muted hover:border-text-muted'
                      }`}
                      style={selected ? { borderColor: c.color, color: c.color, backgroundColor: `${c.color}15` } : {}}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
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

          {error && (
            <p className="text-sm text-danger bg-danger/[0.08] border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Sticky footer with actions */}
        <div className="flex gap-2 p-5 border-t border-border flex-shrink-0 pb-safe">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-border/50 hover:bg-border rounded-xl font-medium text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 py-3 bg-primary hover:bg-primary-dark text-background rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
