import { useState, useEffect } from 'react';
import { TrendingUp, Trash2, Target, Wallet, BarChart3, Link2, Unlink, RefreshCw, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDataRefresh } from '../context/DataContext';
import EmptyState from '../components/EmptyState';

interface Investment {
  id: string;
  amount: number;
  date: string;
  description: string | null;
  ticker: string | null;
  quantity: number | null;
  price_per_unit: number | null;
  platform: string | null;
}

interface InvestmentsData {
  investments: Investment[];
  total_invested: number;
  total_recommended: number;
  diff: number;
  diff_percent: number | null;
  by_month: Array<{ month: string; total: number }>;
}

interface IolStatus {
  connected: boolean;
  username?: string;
  last_sync_at?: string | null;
}

interface IolPosition {
  id: string;
  country: string;
  symbol: string;
  description: string | null;
  instrument_type: string | null;
  quantity: number;
  last_price: number | null;
  ppc: number | null;
  valuation: number | null;
  profit_loss: number | null;
  profit_loss_percent: number | null;
  currency: string | null;
}

export default function Investments() {
  const { user } = useAuth();
  const { refreshKey } = useDataRefresh();
  const [data, setData] = useState<InvestmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [iolStatus, setIolStatus] = useState<IolStatus | null>(null);
  const [iolPortfolio, setIolPortfolio] = useState<IolPosition[]>([]);
  const [iolFormOpen, setIolFormOpen] = useState(false);
  const [iolUsername, setIolUsername] = useState('');
  const [iolPassword, setIolPassword] = useState('');
  const [iolError, setIolError] = useState('');
  const [iolLoading, setIolLoading] = useState(false);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [ticker, setTicker] = useState('');
  const [platform, setPlatform] = useState(user?.investment_destination || '');

  const load = () => {
    api.get('/investments')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const loadIol = () => {
    api.get('/iol/status')
      .then((res) => {
        setIolStatus(res.data);
        if (res.data.connected) {
          api.get('/iol/portfolio').then((p) => setIolPortfolio(p.data.portfolio || []));
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    load();
    loadIol();
  }, [refreshKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/investments', {
        amount: Number(amount),
        date,
        description: description || null,
        ticker: ticker.toUpperCase() || null,
        platform: platform || null,
      });
      setAmount('');
      setDescription('');
      setTicker('');
      setShowForm(false);
      load();
    } catch (err) {
      console.error(err);
      alert('Error al guardar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro de inversión?')) return;
    try {
      await api.delete(`/investments/${id}`);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConnectIol = async (e: React.FormEvent) => {
    e.preventDefault();
    setIolError('');
    setIolLoading(true);
    try {
      await api.post('/iol/connect', { username: iolUsername, password: iolPassword });
      setIolUsername('');
      setIolPassword('');
      setIolFormOpen(false);
      loadIol();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setIolError(axiosErr.response?.data?.error || 'No se pudo conectar');
    } finally {
      setIolLoading(false);
    }
  };

  const handleSyncIol = async () => {
    setIolLoading(true);
    try {
      await api.post('/iol/sync', {});
      loadIol();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      alert(axiosErr.response?.data?.error || 'Error al sincronizar');
    } finally {
      setIolLoading(false);
    }
  };

  const handleDisconnectIol = async () => {
    if (!confirm('¿Desconectar IOL? Se eliminarán las credenciales y el portfolio sincronizado.')) return;
    try {
      await api.post('/iol/disconnect', {});
      loadIol();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 bg-surface rounded-xl animate-pulse"></div>)}
        </div>
        <div className="h-64 bg-surface rounded-xl animate-pulse"></div>
      </div>
    );
  }

  if (!data) return null;

  const monthlyData = data.by_month.map((m) => ({
    month: new Date(m.month + '-01').toLocaleString('es-AR', { month: 'short', year: '2-digit' }),
    total: m.total,
  }));

  const totalIolValuation = iolPortfolio.reduce((sum, p) => sum + Number(p.valuation || 0), 0);
  const totalIolPL = iolPortfolio.reduce((sum, p) => sum + Number(p.profit_loss || 0), 0);

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold hidden md:block">Inversiones</h1>
          <p className="text-text-muted text-xs md:text-sm md:mt-1">
            Registrá lo que efectivamente transferís a tus instrumentos
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-background rounded-[10px] font-semibold text-sm transition-colors self-start"
        >
          {showForm ? 'Cancelar' : '+ Nueva inversión'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-surface rounded-2xl p-5 border border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-xs text-text-muted">Total invertido</p>
          </div>
          <p className="money text-2xl font-bold text-primary">
            ${data.total_invested.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-text-muted mt-1">{data.investments.length} {data.investments.length === 1 ? 'transferencia' : 'transferencias'}</p>
        </div>

        <div className="bg-surface rounded-2xl p-5 border border-secondary/25">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-secondary" />
            <p className="text-xs text-text-muted">Recomendado por la app</p>
          </div>
          <p className="money text-2xl font-bold text-secondary">
            ${data.total_recommended.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-text-muted mt-1">Suma de todos los días positivos</p>
        </div>

        <div className={`bg-surface rounded-2xl p-5 border ${data.diff >= 0 ? 'border-primary/30' : 'border-warning/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className={`w-4 h-4 ${data.diff >= 0 ? 'text-primary' : 'text-warning'}`} />
            <p className="text-xs text-text-muted">Diferencia</p>
          </div>
          <p className={`money text-2xl font-bold ${data.diff >= 0 ? 'text-primary' : 'text-warning'}`}>
            {data.diff >= 0 ? '+' : ''}${data.diff.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-text-muted mt-1">
            {data.diff_percent !== null
              ? `${data.diff >= 0 ? '+' : ''}${data.diff_percent.toFixed(1)}% vs sugerido`
              : 'Sin referencia aún'}
          </p>
        </div>
      </div>

      {/* IOL Integration */}
      <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Invertir Online (IOL)</h3>
              <p className="text-xs text-text-muted mt-0.5">
                {iolStatus?.connected
                  ? `Conectado como ${iolStatus.username}${iolStatus.last_sync_at ? ` · Última sincronización: ${new Date(iolStatus.last_sync_at).toLocaleString('es-AR')}` : ''}`
                  : 'Conectá tu cuenta de IOL para ver tu portfolio en tiempo real'}
              </p>
            </div>
          </div>
          {iolStatus?.connected ? (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleSyncIol}
                disabled={iolLoading}
                className="px-3 py-2 bg-primary/15 hover:bg-primary/25 text-primary rounded-[10px] font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${iolLoading ? 'animate-spin' : ''}`} />
                Sincronizar
              </button>
              <button
                onClick={handleDisconnectIol}
                className="px-3 py-2 bg-danger/10 hover:bg-danger/20 text-danger rounded-[10px] font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <Unlink className="w-3.5 h-3.5" />
                Desconectar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIolFormOpen(!iolFormOpen)}
              className="px-3 py-2 bg-primary hover:bg-primary-dark text-background rounded-[10px] font-semibold text-xs transition-colors flex-shrink-0"
            >
              {iolFormOpen ? 'Cancelar' : 'Conectar'}
            </button>
          )}
        </div>

        {iolFormOpen && !iolStatus?.connected && (
          <form onSubmit={handleConnectIol} className="space-y-3 pt-4 border-t border-border">
            <div className="bg-warning/[0.06] border border-warning/20 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-xs text-text-muted">
                Tus credenciales se guardan cifradas (AES-256-GCM) y solo se usan para llamar a la API de IOL.
                No las usamos para nada más. Si querés podés desconectar cuando quieras.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="iol-user" className="block text-xs text-text-muted mb-1">Usuario IOL</label>
                <input
                  id="iol-user"
                  type="text"
                  value={iolUsername}
                  onChange={(e) => setIolUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-text text-sm"
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="iol-pass" className="block text-xs text-text-muted mb-1">Contraseña IOL</label>
                <input
                  id="iol-pass"
                  type="password"
                  value={iolPassword}
                  onChange={(e) => setIolPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-text text-sm"
                  required
                  autoComplete="off"
                />
              </div>
            </div>
            {iolError && <p className="text-sm text-danger">{iolError}</p>}
            <button
              type="submit"
              disabled={iolLoading}
              className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-background rounded-[10px] font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {iolLoading ? 'Conectando...' : 'Conectar y sincronizar'}
            </button>
          </form>
        )}

        {iolStatus?.connected && iolPortfolio.length > 0 && (
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h4 className="text-xs text-text-muted uppercase tracking-wide font-semibold">Portfolio IOL</h4>
              <div className="flex gap-4 text-xs">
                <span className="text-text-muted">Valor: <span className="text-text font-semibold money">${totalIolValuation.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></span>
                <span className="text-text-muted">P/L: <span className={`font-semibold money ${totalIolPL >= 0 ? 'text-primary' : 'text-danger'}`}>
                  {totalIolPL >= 0 ? '+' : ''}${totalIolPL.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span></span>
              </div>
            </div>
            <div className="overflow-x-auto -mx-5 md:mx-0">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-border text-text-muted text-[11px] uppercase">
                    <th className="text-left p-2 font-medium">Símbolo</th>
                    <th className="text-right p-2 font-medium">Cant.</th>
                    <th className="text-right p-2 font-medium">PPC</th>
                    <th className="text-right p-2 font-medium">Último</th>
                    <th className="text-right p-2 font-medium">Valor</th>
                    <th className="text-right p-2 font-medium">P/L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {iolPortfolio.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-light/30">
                      <td className="p-2">
                        <p className="font-semibold">{p.symbol}</p>
                        <p className="text-[10px] text-text-muted truncate max-w-[200px]">{p.description}</p>
                      </td>
                      <td className="p-2 text-right money">{Number(p.quantity).toLocaleString('es-AR', { maximumFractionDigits: 4 })}</td>
                      <td className="p-2 text-right money text-text-muted">{p.ppc ? `$${Number(p.ppc).toLocaleString('es-AR', { maximumFractionDigits: 2 })}` : '-'}</td>
                      <td className="p-2 text-right money">{p.last_price ? `$${Number(p.last_price).toLocaleString('es-AR', { maximumFractionDigits: 2 })}` : '-'}</td>
                      <td className="p-2 text-right money font-semibold">{p.valuation ? `$${Number(p.valuation).toLocaleString('es-AR', { maximumFractionDigits: 2 })}` : '-'}</td>
                      <td className={`p-2 text-right money font-semibold ${Number(p.profit_loss || 0) >= 0 ? 'text-primary' : 'text-danger'}`}>
                        {p.profit_loss !== null ? (
                          <>
                            {Number(p.profit_loss) >= 0 ? '+' : ''}${Number(p.profit_loss).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                            <div className="text-[10px] opacity-70">{Number(p.profit_loss_percent || 0).toFixed(2)}%</div>
                          </>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {iolStatus?.connected && iolPortfolio.length === 0 && (
          <div className="pt-4 border-t border-border text-center text-sm text-text-muted py-4">
            No hay posiciones en el portfolio. Sincronizá para actualizar.
          </div>
        )}
      </div>

      {/* Manual investment form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-2xl p-5 md:p-6 border border-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="inv-amount" className="block text-sm text-text-muted mb-1">Monto ($)</label>
              <input
                id="inv-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-text money"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label htmlFor="inv-date" className="block text-sm text-text-muted mb-1">Fecha</label>
              <input
                id="inv-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-text"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="inv-platform" className="block text-sm text-text-muted mb-1">Plataforma / Destino</label>
              <input
                id="inv-platform"
                type="text"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-text"
                placeholder="Ej: IOL, Bull Market, Cocos"
              />
            </div>
            <div>
              <label htmlFor="inv-ticker" className="block text-sm text-text-muted mb-1">Ticker (opcional)</label>
              <input
                id="inv-ticker"
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-text uppercase"
                placeholder="AAPL, GOOGL, MSFT..."
              />
            </div>
          </div>

          <div>
            <label htmlFor="inv-desc" className="block text-sm text-text-muted mb-1">Descripción (opcional)</label>
            <input
              id="inv-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-text"
              placeholder="Ej: Compra mensual"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-background rounded-[10px] font-semibold text-sm transition-colors"
          >
            Registrar
          </button>
        </form>
      )}

      {monthlyData.length > 0 && (
        <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-text-muted" />
            <h3 className="font-semibold text-sm">Inversión por mes</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2B3642" />
              <XAxis dataKey="month" stroke="#9BA9B4" fontSize={12} />
              <YAxis stroke="#9BA9B4" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1E2730', border: '1px solid #2B3642', borderRadius: '10px' }}
                formatter={(value) => [`$${Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`, 'Invertido']}
              />
              <Line type="monotone" dataKey="total" stroke="#19C37D" strokeWidth={2} dot={{ fill: '#19C37D', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        {data.investments.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Sin inversiones aún"
            description="Cuando transfieras plata a tus instrumentos, registralo acá para llevar el control."
          />
        ) : (
          <>
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-sm">Histórico de transferencias</h3>
            </div>
            <div className="divide-y divide-border">
              {data.investments.map((inv) => (
                <div key={inv.id} className="flex justify-between items-center p-4 hover:bg-surface-light/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">
                        {inv.description || (inv.ticker ? `Compra ${inv.ticker}` : 'Transferencia')}
                      </p>
                      {inv.ticker && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-primary/15 text-primary rounded font-semibold">
                          {inv.ticker}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <p className="text-xs text-text-muted">
                        {new Date(inv.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      {inv.platform && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-secondary/15 text-secondary rounded">
                          {inv.platform}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <p className="money text-primary font-semibold text-sm">
                      +${Number(inv.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="text-text-muted/40 hover:text-danger transition-colors w-7 h-7 flex items-center justify-center rounded-md hover:bg-danger/10"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
