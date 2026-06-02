import { useState } from 'react';
import { ChevronRight, ChevronLeft, Wallet, Pin, Sparkles } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Props {
  onComplete: () => void;
}

const FIXED_SUGGESTIONS = ['Alquiler', 'Servicios (Luz, Gas, Internet)', 'Suscripciones'];

export default function Onboarding({ onComplete }: Props) {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1: Income
  const [income, setIncome] = useState('');

  // Step 2: Fixed expenses
  const [fixedItems, setFixedItems] = useState<{ name: string; amount: string; category: string }[]>([
    { name: '', amount: '', category: 'Alquiler' },
  ]);

  // Step 3: Distribution
  const [investmentPct, setInvestmentPct] = useState('75');
  const [destination, setDestination] = useState('CEDEARs en IOL');

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const addFixedItem = () => {
    setFixedItems([...fixedItems, { name: '', amount: '', category: 'Otros' }]);
  };

  const updateFixedItem = (idx: number, field: string, value: string) => {
    const next = [...fixedItems];
    next[idx] = { ...next[idx], [field]: value };
    setFixedItems(next);
  };

  const removeFixedItem = (idx: number) => {
    setFixedItems(fixedItems.filter((_, i) => i !== idx));
  };

  const finish = async () => {
    setSaving(true);
    try {
      // Save income + distribution
      await api.put('/user/settings', {
        monthly_income: Number(income) || 0,
        investment_percent: Number(investmentPct),
        savings_percent: 100 - Number(investmentPct),
        investment_destination: destination,
      });

      // Save fixed expenses (only completed ones)
      const validFixed = fixedItems.filter((f) => f.name.trim() && Number(f.amount) > 0);
      for (const f of validFixed) {
        await api.post('/fixed-expenses', {
          name: f.name.trim(),
          amount: Number(f.amount),
          category: f.category,
        });
      }

      updateUser({
        monthly_income: Number(income) || 0,
        investment_percent: Number(investmentPct),
        savings_percent: 100 - Number(investmentPct),
        investment_destination: destination,
      });

      localStorage.setItem('onboarding_completed', '1');
      onComplete();
    } catch (err) {
      console.error(err);
      alert('Error al guardar configuración inicial');
      setSaving(false);
    }
  };

  const skip = () => {
    localStorage.setItem('onboarding_completed', '1');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/95 backdrop-blur-md">
      <div className="w-full max-w-lg bg-surface rounded-3xl border border-border overflow-hidden shadow-2xl">
        {/* Progress dots */}
        <div className="px-6 pt-6 flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i <= step ? 'bg-primary flex-1' : 'bg-border w-6'
              }`}
            />
          ))}
        </div>

        <div className="p-6 md:p-8 min-h-[400px] flex flex-col">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center fade-in">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-background" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                Hola {user?.name?.split(' ')[0]}
              </h2>
              <p className="text-text-muted max-w-sm">
                Vamos a configurar tu cuenta en 3 pasos rápidos. Después podés ajustar todo desde Configuración.
              </p>
            </div>
          )}

          {/* Step 1: Income */}
          {step === 1 && (
            <div className="flex-1 flex flex-col fade-in">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-text-muted uppercase tracking-wide font-semibold">Paso 1 de 3</span>
              </div>
              <h2 className="text-xl font-bold mt-3">¿Cuánto ganás por mes?</h2>
              <p className="text-text-muted text-sm mt-1 mb-6">
                Tu ingreso mensual neto. Lo usamos para calcular tu presupuesto diario.
              </p>

              <input
                type="number"
                inputMode="decimal"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className="w-full px-5 py-4 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-text text-2xl font-bold money"
                placeholder="$0"
                autoFocus
              />

              {income && Number(income) > 0 && (
                <div className="mt-4 bg-primary/[0.06] border border-primary/20 rounded-xl p-4">
                  <p className="text-xs text-text-muted">Presupuesto diario estimado (sin gastos fijos)</p>
                  <p className="money text-lg font-bold text-primary mt-1">
                    ${(Number(income) / 30).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Fixed expenses */}
          {step === 2 && (
            <div className="flex-1 flex flex-col fade-in">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-warning/15 border border-warning/30 flex items-center justify-center">
                  <Pin className="w-5 h-5 text-warning" />
                </div>
                <span className="text-xs text-text-muted uppercase tracking-wide font-semibold">Paso 2 de 3</span>
              </div>
              <h2 className="text-xl font-bold mt-3">Gastos fijos del mes</h2>
              <p className="text-text-muted text-sm mt-1 mb-4">
                Alquiler, servicios, suscripciones. Podés saltearte este paso.
              </p>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {fixedItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={item.name}
                      onChange={(e) => updateFixedItem(idx, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-text text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Monto"
                      value={item.amount}
                      onChange={(e) => updateFixedItem(idx, 'amount', e.target.value)}
                      className="w-28 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-text text-sm money"
                    />
                    {fixedItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFixedItem(idx)}
                        className="text-text-muted/50 hover:text-danger transition-colors w-9 flex items-center justify-center"
                        aria-label="Quitar"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addFixedItem}
                className="text-primary text-sm font-medium mt-3 self-start hover:underline"
              >
                + Agregar otro
              </button>

              {fixedItems.every((f) => !f.name) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {FIXED_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateFixedItem(0, 'name', s)}
                      className="text-xs px-2.5 py-1 bg-border/40 hover:bg-border rounded-md text-text-muted"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Distribution */}
          {step === 3 && (
            <div className="flex-1 flex flex-col fade-in">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-secondary/15 border border-secondary/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-secondary" />
                </div>
                <span className="text-xs text-text-muted uppercase tracking-wide font-semibold">Paso 3 de 3</span>
              </div>
              <h2 className="text-xl font-bold mt-3">Regla de distribución</h2>
              <p className="text-text-muted text-sm mt-1 mb-6">
                Cuando termina el día y no gastaste todo el presupuesto, ¿qué hacemos con lo que sobró?
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-text-muted block mb-2">A inversión</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={investmentPct}
                      onChange={(e) => setInvestmentPct(e.target.value)}
                      className="flex-1 accent-primary"
                    />
                    <span className="money text-lg font-bold text-primary w-14 text-right">{investmentPct}%</span>
                  </div>
                </div>

                <div className="bg-background rounded-xl p-4 border border-border">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-primary font-semibold">Inversión {investmentPct}%</span>
                    <span className="text-warning font-semibold">Excedente {100 - Number(investmentPct)}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden flex bg-border">
                    <div className="bg-primary h-full" style={{ width: `${investmentPct}%` }}></div>
                    <div className="bg-warning h-full" style={{ width: `${100 - Number(investmentPct)}%` }}></div>
                  </div>
                  <p className="text-[11px] text-text-muted mt-3">
                    El excedente es un colchón que se usa cuando te pasás del presupuesto algún día.
                  </p>
                </div>

                <div>
                  <label htmlFor="dest" className="text-xs text-text-muted block mb-2">¿Adónde vas a invertir?</label>
                  <input
                    id="dest"
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-text text-sm"
                    placeholder="CEDEARs, FCI, Crypto..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-border flex items-center justify-between gap-3">
          {step > 0 ? (
            <button
              onClick={prev}
              className="flex items-center gap-1 px-3 py-2 text-sm text-text-muted hover:text-text transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Atrás
            </button>
          ) : (
            <button
              onClick={skip}
              className="text-sm text-text-muted hover:text-text transition-colors"
            >
              Saltar onboarding
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={next}
              disabled={step === 1 && (!income || Number(income) <= 0)}
              className="flex items-center gap-1 px-5 py-2.5 bg-primary hover:bg-primary-dark text-background rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {step === 0 ? 'Empezar' : 'Siguiente'}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={saving}
              className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-background rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Finalizar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
