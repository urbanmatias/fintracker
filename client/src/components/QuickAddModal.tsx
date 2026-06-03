import { useState, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import api from '../api/client';
import { useCategories } from '../hooks/useCategories';
import { useDataRefresh } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useHaptic } from '../hooks/useHaptic';
import { quickParse } from '../utils/quickParse';

interface QuickAddModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export default function QuickAddModal({ onClose, onSaved }: QuickAddModalProps) {
  const { categories, loading: catsLoading } = useCategories('daily');
  const { refresh } = useDataRefresh();
  const toast = useToast();
  const haptic = useHaptic();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [quickInput, setQuickInput] = useState('');
  const [quickMode, setQuickMode] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const quickRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (categories.length > 0 && !category) {
      setCategory(categories[0].name);
    }
  }, [categories, category]);

  useEffect(() => {
    setTimeout(() => {
      if (quickMode) quickRef.current?.focus();
      else amountRef.current?.focus();
    }, 100);
  }, [quickMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Live parsing in quick mode
  const parsed = quickInput
    ? quickParse(quickInput, categories.map((c) => c.name))
    : { amount: null, description: '', category: null, tags: [] };

  const canSubmit = quickMode
    ? !!parsed.amount && parsed.amount > 0 && !!parsed.description
    : !!amount && Number(amount) > 0 && !!description.trim() && !!category && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let payloadAmount: number;
    let payloadDescription: string;
    let payloadCategory: string;
    let payloadTags: string[];

    if (quickMode) {
      if (!parsed.amount || parsed.amount <= 0) {
        setError('No detecté un monto. Escribí algo como "comida 2500"');
        return;
      }
      if (!parsed.description) {
        setError('Falta la descripción');
        return;
      }
      payloadAmount = parsed.amount;
      payloadDescription = parsed.description;
      payloadCategory = parsed.category || categories[0]?.name || '';
      payloadTags = parsed.tags;
    } else {
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
      payloadAmount = Number(amount);
      payloadDescription = description.trim();
      payloadCategory = category;
      payloadTags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    }

    if (!payloadCategory) {
      setError('Necesitás al menos una categoría creada');
      return;
    }

    setSaving(true);
    try {
      await api.post('/daily-expenses', {
        amount: payloadAmount,
        description: payloadDescription,
        category: payloadCategory,
        date,
        tags: payloadTags,
      });
      refresh();
      toast.success('Gasto guardado');
      haptic.trigger('success');
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
        className="w-full md:max-w-md bg-surface rounded-t-2xl md:rounded-2xl border-t md:border border-border flex flex-col max-h-[90vh] animate-in"
      >
        <div className="flex justify-between items-center p-5 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold">Agregar gasto</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuickMode(!quickMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                quickMode ? 'bg-primary/15 text-primary' : 'bg-border/40 text-text-muted hover:bg-border'
              }`}
              title="Modo rápido (parser)"
            >
              <Zap className="w-3 h-3" />
              {quickMode ? 'Rápido' : 'Rápido'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-text text-xl leading-none w-8 h-8 flex items-center justify-center rounded-md hover:bg-border/50 transition-colors"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {quickMode ? (
            <>
              <div>
                <label htmlFor="qa-quick" className="block text-xs text-text-muted mb-1">
                  Escribí libre: monto + descripción + #tags + categoría
                </label>
                <input
                  ref={quickRef}
                  id="qa-quick"
                  type="text"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-text text-base"
                  placeholder="almuerzo 2500 comida #urgente"
                />
                <p className="text-[11px] text-text-muted mt-1.5 leading-relaxed">
                  Ej: <span className="font-mono text-primary/80">"uber 1200 transporte"</span> ·{' '}
                  <span className="font-mono text-primary/80">"cafe 800 #trabajo"</span>
                </p>
              </div>

              {/* Live preview */}
              {quickInput && (
                <div className="bg-background border border-border rounded-xl p-3 space-y-1 fade-in">
                  <p className="text-[11px] text-text-muted uppercase tracking-wide font-semibold">Vista previa</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Monto</span>
                    <span className={`money text-sm font-semibold ${parsed.amount ? 'text-primary' : 'text-text-muted/50'}`}>
                      {parsed.amount ? `$${parsed.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Descripción</span>
                    <span className="text-sm font-medium truncate ml-2">
                      {parsed.description || <span className="text-text-muted/50">—</span>}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Categoría</span>
                    <span className="text-sm">
                      {parsed.category || <span className="text-text-muted/50">{categories[0]?.name || '—'}</span>}
                    </span>
                  </div>
                  {parsed.tags.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-muted">Tags</span>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {parsed.tags.map((t) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 bg-secondary/15 text-secondary rounded">#{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
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
                <label htmlFor="qa-tags-manual" className="block text-xs text-text-muted mb-1">Tags (opcional, separados por coma)</label>
                <input
                  id="qa-tags-manual"
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-text text-sm"
                  placeholder="urgente, regalo..."
                />
              </div>
            </>
          )}

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
