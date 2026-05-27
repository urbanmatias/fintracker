import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [income, setIncome] = useState('');
  const [savingsPercent, setSavingsPercent] = useState('');
  const [investmentPercent, setInvestmentPercent] = useState('');
  const [investmentDestination, setInvestmentDestination] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setIncome(String(user.monthly_income || ''));
      setSavingsPercent(String(user.savings_percent || 25));
      setInvestmentPercent(String(user.investment_percent || 75));
      setInvestmentDestination(user.investment_destination || '');
    }
  }, [user]);

  const handleSavingsChange = (value: string) => {
    const num = Number(value);
    setSavingsPercent(value);
    setInvestmentPercent(String(100 - num));
  };

  const handleInvestmentChange = (value: string) => {
    const num = Number(value);
    setInvestmentPercent(value);
    setSavingsPercent(String(100 - num));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const res = await api.put('/user/settings', {
        monthly_income: Number(income),
        savings_percent: Number(savingsPercent),
        investment_percent: Number(investmentPercent),
        investment_destination: investmentDestination,
      });
      updateUser(res.data);
      setMessage('Configuración guardada ✓');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setMessage(axiosErr.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const dailyBudgetPreview = income ? (Number(income) / 30).toFixed(2) : '0.00';

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Configuración</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Income */}
        <div className="backdrop-blur-xl bg-white/[0.05] rounded-2xl p-6 border border-white/[0.08] space-y-4">
          <h3 className="font-medium">Ingreso mensual</h3>
          <div>
            <label htmlFor="income" className="block text-sm text-white/50 mb-1">Monto ($)</label>
            <input
              id="income"
              type="number"
              step="0.01"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.1] rounded-xl focus:outline-none focus:border-primary/50 text-white placeholder-white/20"
              placeholder="Ej: 500000"
            />
          </div>
          {income && (
            <p className="text-white/30 text-sm">
              Presupuesto diario estimado (sin gastos fijos): ${dailyBudgetPreview}
            </p>
          )}
        </div>

        {/* Distribution rule */}
        <div className="backdrop-blur-xl bg-white/[0.05] rounded-2xl p-6 border border-white/[0.08] space-y-4">
          <h3 className="font-medium">Regla de distribución</h3>
          <p className="text-white/40 text-sm">
            Lo que no gastás cada día se distribuye según estos porcentajes:
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="investment" className="block text-sm text-white/50 mb-1">
                A inversión (%)
              </label>
              <input
                id="investment"
                type="number"
                min="0"
                max="100"
                value={investmentPercent}
                onChange={(e) => handleInvestmentChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.1] rounded-xl focus:outline-none focus:border-primary/50 text-white"
              />
            </div>
            <div>
              <label htmlFor="savings" className="block text-sm text-white/50 mb-1">
                Queda en cuenta (%)
              </label>
              <input
                id="savings"
                type="number"
                min="0"
                max="100"
                value={savingsPercent}
                onChange={(e) => handleSavingsChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.1] rounded-xl focus:outline-none focus:border-primary/50 text-white"
              />
            </div>
          </div>

          {/* Visual bar */}
          <div className="w-full h-4 rounded-full overflow-hidden flex backdrop-blur-sm">
            <div
              className="bg-primary/70 h-full transition-all"
              style={{ width: `${investmentPercent}%` }}
            ></div>
            <div
              className="bg-secondary/70 h-full transition-all"
              style={{ width: `${savingsPercent}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-white/30">
            <span>Inversión: {investmentPercent}%</span>
            <span>Cuenta: {savingsPercent}%</span>
          </div>

          <div>
            <label htmlFor="destination" className="block text-sm text-white/50 mb-1">
              Destino de inversión (descripción)
            </label>
            <input
              id="destination"
              type="text"
              value={investmentDestination}
              onChange={(e) => setInvestmentDestination(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.1] rounded-xl focus:outline-none focus:border-primary/50 text-white placeholder-white/20"
              placeholder="Ej: CEDEARs en IOL, FCI, Crypto..."
            />
          </div>
        </div>

        {message && (
          <p className={`text-sm ${message.includes('Error') ? 'text-danger' : 'text-secondary'}`}>
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-primary/80 hover:bg-primary rounded-xl font-medium transition-all disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </form>
    </div>
  );
}
