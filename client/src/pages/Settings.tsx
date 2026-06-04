import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/client';
import BucketsEditor from '../components/BucketsEditor';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [income, setIncome] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setIncome(String(user.monthly_income || ''));
    }
  }, [user]);

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/user/settings', {
        monthly_income: Number(income),
      });
      updateUser(res.data);
      toast.success('Ingreso actualizado');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toast.error(axiosErr.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const dailyBudgetPreview = income ? (Number(income) / 30).toFixed(2) : '0.00';

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl md:text-2xl font-bold hidden md:block">Configuración</h1>

      {/* Income */}
      <form onSubmit={handleIncomeSubmit} className="bg-surface rounded-[14px] p-6 border border-border space-y-4">
        <h3 className="font-semibold text-sm">Ingreso mensual</h3>
        <div>
          <label htmlFor="income" className="block text-sm text-text-muted mb-1">Monto ($)</label>
          <input
            id="income"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            className="w-full px-4 py-2.5 bg-background border border-border rounded-[10px] focus:outline-none focus:border-primary text-text money"
            placeholder="Ej: 500000"
          />
        </div>
        {income && (
          <p className="text-text-muted text-sm">
            Presupuesto diario estimado (sin gastos fijos): ${dailyBudgetPreview}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-background rounded-[10px] font-semibold text-sm transition-colors disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar ingreso'}
        </button>
      </form>

      {/* Distribution buckets */}
      <BucketsEditor />
    </div>
  );
}
