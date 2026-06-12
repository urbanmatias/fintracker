import { useState, useEffect, useRef } from 'react';
import { PiggyBank, Wallet, RotateCcw, Trash2 } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { useDataRefresh } from '../context/DataContext';

interface Adjustment {
  id: string;
  type: 'excedent' | 'month_remaining';
  delta: number;
  previous_value: number;
  target_value: number;
  description: string | null;
  applied_date: string;
  created_at: string;
}

interface Props {
  type: 'excedent' | 'month_remaining';
  currentValue: number;
  onClose: () => void;
}

const TYPE_LABELS = {
  excedent: { title: 'Ajustar excedente', icon: PiggyBank, color: '#FBBF24' },
  month_remaining: { title: 'Ajustar restante del mes', icon: Wallet, color: '#4ADEDE' },
};

export default function AdjustmentModal({ type, currentValue, onClose }: Props) {
  const toast = useToast();
  const { refresh } = useDataRefresh();
  const [target, setTarget] = useState('');
  const [description, setDescription] = useState('');
  const [history, setHistory] = useState<Adjustment[]>([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const config = TYPE_LABELS[type];
  const Icon = config.icon;

  const loadHistory = () => {
    api.get('/adjustments')
      .then((res) => {
        const items: Adjustment[] = res.data.adjustments || [];
        setHistory(items.filter((a) => a.type === type));
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadHistory();
    setTimeout(() => inputRef.current?.focus(), 100);
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
    const targetNum = Number(target);
    if (!Number.isFinite(targetNum)) {
      toast.error('Valor inválido');
      return;
    }
    setSaving(true);
    try {
      await api.post('/adjustments', {
        type,
        target_value: targetNum,
        description: description.trim() || null,
      });
      toast.success(type === 'excedent' ? 'Excedente ajustado' : 'Restante del mes ajustado');
      refresh();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toast.error(axiosErr.response?.data?.error || 'Error al ajustar');
      setSaving(false);
    }
  };

  const resetToZero = async () => {
    if (!confirm(`¿Querés ${type === 'excedent' ? 'reiniciar el excedente a $0' : 'poner el restante en $0'}?`)) return;
    setSaving(true);
    try {
      await api.post('/adjustments', {
        type,
        target_value: 0,
        description: type === 'excedent' ? 'Reset a 0' : 'Reset a 0',
      });
      toast.success('Reiniciado a $0');
      refresh();
      onClose();
    } catch {
      toast.error('Error al reiniciar');
      setSaving(false);
    }
  };

  const deleteAdjustment = async (id: string) => {
    if (!confirm('¿Revertir este ajuste? Va a volver a calcularse el valor original.')) return;
    try {
      await api.delete(`/adjustments/${id}`);
      toast.success('Ajuste revertido');
      loadHistory();
      refresh();
    } catch {
      toast.error('Error al revertir');
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
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config.color}20`, border: `1px solid ${config.color}40` }}>
              <Icon className="w-4 h-4" style={{ color: config.color }} />
            </div>
            <h2 className="text-lg font-semibold">{config.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text text-xl leading-none w-8 h-8 flex items-center justify-center rounded-md hover:bg-border/50 transition-colors"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          <div className="bg-background rounded-xl p-4 border border-border">
            <p className="text-[11px] text-text-muted uppercase tracking-wide font-semibold">Valor actual</p>
            <p className="money text-2xl font-bold mt-1" style={{ color: config.color }}>
              ${currentValue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <label htmlFor="adj-target" className="block text-xs text-text-muted mb-1">Cambiar a</label>
            <input
              ref={inputRef}
              id="adj-target"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-text text-2xl font-bold money"
              placeholder="0.00"
              required
            />
            {target && Number.isFinite(Number(target)) && (
              <p className="text-[11px] text-text-muted mt-2">
                Diferencia: <span className={`money font-semibold ${Number(target) > currentValue ? 'text-primary' : 'text-danger'}`}>
                  {Number(target) > currentValue ? '+' : ''}${(Number(target) - currentValue).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </p>
            )}
          </div>

          <div>
            <label htmlFor="adj-desc" className="block text-xs text-text-muted mb-1">Motivo (opcional)</label>
            <input
              id="adj-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-text text-sm"
              placeholder="Ej: Me olvidé de cargar el almuerzo del lunes"
            />
          </div>

          {/* Reset to zero shortcut */}
          <button
            type="button"
            onClick={resetToZero}
            disabled={saving || currentValue === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-xl text-sm text-text-muted hover:border-danger hover:text-danger transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar a $0
          </button>

          {/* History */}
          {history.length > 0 && (
            <div className="pt-2">
              <p className="text-[11px] text-text-muted uppercase tracking-wide font-semibold mb-2">Ajustes anteriores</p>
              <div className="space-y-1">
                {history.slice(0, 5).map((adj) => (
                  <div key={adj.id} className="flex items-center justify-between p-2 bg-background border border-border rounded-lg text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="text-text-muted truncate">
                        {new Date(adj.applied_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                        {' · '}
                        <span className={`money font-semibold ${Number(adj.delta) >= 0 ? 'text-primary' : 'text-danger'}`}>
                          {Number(adj.delta) >= 0 ? '+' : ''}${Number(adj.delta).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                        </span>
                      </p>
                      {adj.description && (
                        <p className="text-text-muted/70 truncate text-[10px]">{adj.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteAdjustment(adj.id)}
                      className="text-text-muted/40 hover:text-danger transition-colors w-7 h-7 flex items-center justify-center rounded-md hover:bg-danger/10 flex-shrink-0"
                      aria-label="Revertir"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
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
            disabled={saving || !target}
            className="flex-1 py-3 bg-primary hover:bg-primary-dark text-background rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar ajuste'}
          </button>
        </div>
      </form>
    </div>
  );
}
