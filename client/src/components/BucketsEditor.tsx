import { useState, useEffect } from 'react';
import { Plus, Trash2, TrendingUp, PiggyBank, Sparkles } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

export interface Bucket {
  id?: string;
  name: string;
  percent: number;
  type: 'investment' | 'excedent' | 'custom';
  color: string;
  sort_order: number;
  description: string | null;
}

const PRESET_COLORS = [
  '#19C37D', '#FBBF24', '#4ADEDE', '#FF5D73', '#A78BFA',
  '#F472B6', '#34D399', '#818CF8', '#22D3EE', '#FB923C',
];

const TYPE_OPTIONS: Array<{ value: Bucket['type']; label: string; icon: typeof TrendingUp; hint: string }> = [
  { value: 'investment', label: 'Inversión', icon: TrendingUp, hint: 'Va a un instrumento (CEDEAR, FCI, etc.)' },
  { value: 'excedent', label: 'Excedente', icon: PiggyBank, hint: 'Colchón que se usa cuando te pasás del presupuesto' },
  { value: 'custom', label: 'Personalizado', icon: Sparkles, hint: 'Cualquier otro destino (tarjeta, ahorro, etc.)' },
];

interface Props {
  onChange?: () => void;
}

export default function BucketsEditor({ onChange }: Props) {
  const toast = useToast();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    api.get('/buckets')
      .then((res) => setBuckets(res.data.buckets || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const total = buckets.reduce((s, b) => s + Number(b.percent || 0), 0);
  const balanced = Math.abs(total - 100) < 0.01;

  const addBucket = () => {
    setBuckets((curr) => [
      ...curr,
      {
        name: '',
        percent: 0,
        type: 'custom',
        color: PRESET_COLORS[curr.length % PRESET_COLORS.length],
        sort_order: curr.length,
        description: null,
      },
    ]);
  };

  const removeBucket = (idx: number) => {
    setBuckets((curr) => curr.filter((_, i) => i !== idx));
  };

  const updateBucket = (idx: number, patch: Partial<Bucket>) => {
    setBuckets((curr) => curr.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  };

  const moveBucket = (idx: number, direction: -1 | 1) => {
    setBuckets((curr) => {
      const next = [...curr];
      const target = idx + direction;
      if (target < 0 || target >= next.length) return curr;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((b, i) => ({ ...b, sort_order: i }));
    });
  };

  const distributeEvenly = () => {
    if (buckets.length === 0) return;
    const each = Math.floor((100 / buckets.length) * 100) / 100;
    const remainder = 100 - each * buckets.length;
    setBuckets((curr) =>
      curr.map((b, i) => ({
        ...b,
        percent: i === 0 ? each + remainder : each,
      }))
    );
  };

  const save = async () => {
    setError('');

    const cleanBuckets = buckets.filter((b) => b.name.trim());
    if (cleanBuckets.length === 0) {
      setError('Tenés que tener al menos un bucket con nombre');
      return;
    }

    const sum = cleanBuckets.reduce((s, b) => s + Number(b.percent || 0), 0);
    if (Math.abs(sum - 100) > 0.01) {
      setError(`Los porcentajes deben sumar 100% (suma actual: ${sum}%)`);
      return;
    }

    setSaving(true);
    try {
      await api.put('/buckets', {
        buckets: cleanBuckets.map((b, i) => ({
          name: b.name.trim(),
          percent: Number(b.percent),
          type: b.type,
          color: b.color,
          sort_order: i,
          description: b.description?.trim() || null,
        })),
      });
      toast.success('Distribución guardada');
      onChange?.();
      load();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="bg-surface rounded-2xl p-6 border border-border h-48 animate-pulse"></div>;
  }

  return (
    <div className="bg-surface rounded-[14px] p-6 border border-border space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm">Distribución del ahorro</h3>
          <p className="text-text-muted text-xs mt-1">
            Cuando te sobra plata al final del día, así se reparte. Los porcentajes tienen que sumar 100%.
          </p>
        </div>
        <button
          type="button"
          onClick={distributeEvenly}
          className="text-xs text-primary hover:underline whitespace-nowrap"
          title="Distribuir igual entre todos"
        >
          Igualar %
        </button>
      </div>

      {/* Visual bar showing distribution */}
      {buckets.length > 0 && (
        <div className="space-y-1.5">
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-border">
            {buckets.map((b, i) =>
              Number(b.percent) > 0 ? (
                <div
                  key={i}
                  className="h-full transition-all"
                  style={{
                    width: `${Number(b.percent)}%`,
                    backgroundColor: b.color,
                  }}
                  title={`${b.name}: ${b.percent}%`}
                />
              ) : null
            )}
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-text-muted">Total</span>
            <span className={balanced ? 'text-primary font-semibold' : 'text-warning font-semibold'}>
              {total.toFixed(2)}%{balanced ? ' ✓' : ` (faltan ${(100 - total).toFixed(2)}%)`}
            </span>
          </div>
        </div>
      )}

      {/* Buckets list */}
      <div className="space-y-3">
        {buckets.map((bucket, idx) => {
          const TypeIcon = TYPE_OPTIONS.find((t) => t.value === bucket.type)?.icon || Sparkles;
          return (
            <div
              key={idx}
              className="bg-background rounded-xl p-4 border border-border space-y-3"
            >
              {/* Row 1: drag, color, name, percent, delete */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveBucket(idx, -1)}
                    disabled={idx === 0}
                    className="text-text-muted/40 hover:text-text disabled:opacity-30 leading-none"
                    aria-label="Mover arriba"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBucket(idx, 1)}
                    disabled={idx === buckets.length - 1}
                    className="text-text-muted/40 hover:text-text disabled:opacity-30 leading-none"
                    aria-label="Mover abajo"
                  >
                    ▼
                  </button>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    className="w-7 h-7 rounded-md border border-border"
                    style={{ backgroundColor: bucket.color }}
                    aria-label="Color"
                  />
                  <input
                    type="color"
                    value={bucket.color}
                    onChange={(e) => updateBucket(idx, { color: e.target.value })}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Nombre (ej: Tarjeta de crédito)"
                  value={bucket.name}
                  onChange={(e) => updateBucket(idx, { name: e.target.value })}
                  className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary text-text text-sm"
                />

                <div className="relative w-24">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="0.01"
                    value={bucket.percent}
                    onChange={(e) => updateBucket(idx, { percent: Number(e.target.value) })}
                    className="w-full pl-3 pr-7 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary text-text text-sm money text-right"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">%</span>
                </div>

                <button
                  type="button"
                  onClick={() => removeBucket(idx)}
                  className="text-text-muted/40 hover:text-danger transition-colors w-8 h-8 flex items-center justify-center rounded-md hover:bg-danger/10"
                  aria-label="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Row 2: type + description */}
              <div className="flex flex-col md:flex-row gap-2 pl-9">
                <div className="md:w-1/3">
                  <label className="text-[11px] text-text-muted block mb-1 flex items-center gap-1">
                    <TypeIcon className="w-3 h-3" />
                    Tipo
                  </label>
                  <select
                    value={bucket.type}
                    onChange={(e) => updateBucket(idx, { type: e.target.value as Bucket['type'] })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary text-text text-sm"
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[11px] text-text-muted block mb-1">Descripción (opcional)</label>
                  <input
                    type="text"
                    placeholder={
                      bucket.type === 'investment' ? 'CEDEARs en IOL, FCI...' :
                      bucket.type === 'excedent' ? 'Colchón para días malos' :
                      'Visa Galicia, Modo, etc.'
                    }
                    value={bucket.description || ''}
                    onChange={(e) => updateBucket(idx, { description: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary text-text text-sm"
                  />
                </div>
              </div>

              <p className="text-[11px] text-text-muted/70 pl-9">
                {TYPE_OPTIONS.find((t) => t.value === bucket.type)?.hint}
              </p>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addBucket}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-xl text-sm text-text-muted hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="w-4 h-4" />
        Agregar bucket
      </button>

      {error && (
        <p className="text-sm text-danger bg-danger/[0.08] border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving || !balanced}
        className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-background rounded-[10px] font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Guardando...' : 'Guardar distribución'}
      </button>
    </div>
  );
}
