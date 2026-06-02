import { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api/client';

interface Instrument {
  simbolo: string;
  descripcion?: string;
  mercado?: string;
  ultimoPrecio?: number;
  moneda?: string;
}

interface Quote {
  simbolo: string;
  descripcion?: string;
  ultimoPrecio?: number;
  variacion?: number;
  variacionPorcentual?: number;
  apertura?: number;
  maximo?: number;
  minimo?: number;
  cierreAnterior?: number;
  fechaHora?: string;
  moneda?: string;
}

interface HistoryEntry {
  fechaHora: string;
  ultimoPrecio: number;
}

const RANGES = [
  { label: '1S', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1A', days: 365 },
  { label: '3A', days: 365 * 3 },
];

export default function InstrumentSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Instrument[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Instrument | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [range, setRange] = useState(90);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      setSearching(true);
      api.get('/iol/search', { params: { q: query } })
        .then((res) => setResults(res.data.results || []))
        .catch(console.error)
        .finally(() => setSearching(false));
    }, 400);
  }, [query]);

  const selectInstrument = async (inst: Instrument) => {
    setSelected(inst);
    setResults([]);
    setQuery(inst.simbolo);
    setLoadingDetail(true);
    try {
      const [q, h] = await Promise.all([
        api.get(`/iol/quote/${inst.mercado}/${inst.simbolo}`),
        api.get(`/iol/history/${inst.mercado}/${inst.simbolo}`, { params: { days: range } }),
      ]);
      setQuote(q.data);
      setHistory(h.data.history || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const changeRange = async (days: number) => {
    if (!selected) return;
    setRange(days);
    setLoadingDetail(true);
    try {
      const h = await api.get(`/iol/history/${selected.mercado}/${selected.simbolo}`, { params: { days } });
      setHistory(h.data.history || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const clear = () => {
    setSelected(null);
    setQuote(null);
    setHistory([]);
    setQuery('');
  };

  const chartData = history
    .filter((h) => h.ultimoPrecio > 0)
    .map((h) => ({
      date: new Date(h.fechaHora).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
      price: Number(h.ultimoPrecio),
    }));

  const isPositive = (quote?.variacionPorcentual ?? 0) >= 0;

  return (
    <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-4 h-4 text-text-muted" />
        <h3 className="font-semibold text-sm">Buscar instrumento</h3>
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          placeholder="Ticker (ej: AAPL, MELI, GGAL)"
          className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary text-text uppercase"
        />
        {query && (
          <button
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
            aria-label="Limpiar"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {results.length > 0 && !selected && (
          <div className="absolute z-10 left-0 right-0 mt-1 bg-surface border border-border rounded-xl overflow-hidden shadow-2xl">
            {results.map((r) => (
              <button
                key={`${r.mercado}-${r.simbolo}`}
                onClick={() => selectInstrument(r)}
                className="w-full text-left px-4 py-3 hover:bg-surface-light/50 border-b border-border last:border-0 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm">{r.simbolo}</p>
                    <p className="text-xs text-text-muted truncate">{r.descripcion || ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {r.ultimoPrecio !== undefined && (
                      <p className="money text-sm font-semibold">
                        ${Number(r.ultimoPrecio).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                      </p>
                    )}
                    <p className="text-[10px] text-text-muted uppercase">{r.mercado}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {searching && <p className="text-sm text-text-muted mt-3">Buscando...</p>}

      {selected && quote && (
        <div className="mt-5 space-y-4">
          {/* Quote header */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-bold">{quote.simbolo}</h4>
                <span className="text-[10px] px-1.5 py-0.5 bg-secondary/15 text-secondary rounded uppercase">{selected.mercado}</span>
              </div>
              <p className="text-xs text-text-muted">{quote.descripcion}</p>
            </div>
            <div className="text-right">
              <p className="money text-2xl font-bold">
                ${Number(quote.ultimoPrecio || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
              <p className={`text-xs font-semibold flex items-center justify-end gap-1 ${isPositive ? 'text-primary' : 'text-danger'}`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? '+' : ''}{Number(quote.variacionPorcentual || 0).toFixed(2)}%
                <span className="text-text-muted ml-1">
                  ({isPositive ? '+' : ''}${Number(quote.variacion || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })})
                </span>
              </p>
            </div>
          </div>

          {/* Range selector */}
          <div className="flex gap-1 flex-wrap">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => changeRange(r.days)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  range === r.days
                    ? 'bg-primary/15 text-primary'
                    : 'bg-border/40 text-text-muted hover:bg-border/60'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-background rounded-xl p-4 border border-border">
            {loadingDetail ? (
              <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">Cargando...</div>
            ) : chartData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">Sin datos para este período</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isPositive ? '#19C37D' : '#FF5D73'} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={isPositive ? '#19C37D' : '#FF5D73'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2B3642" />
                  <XAxis dataKey="date" stroke="#9BA9B4" fontSize={11} interval="preserveStartEnd" />
                  <YAxis stroke="#9BA9B4" fontSize={11} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E2730', border: '1px solid #2B3642', borderRadius: '10px' }}
                    formatter={(value) => [`$${Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`, 'Precio']}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={isPositive ? '#19C37D' : '#FF5D73'}
                    strokeWidth={2}
                    dot={false}
                    fill="url(#priceGrad)"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quote details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-background rounded-lg p-3 border border-border">
              <p className="text-text-muted">Apertura</p>
              <p className="money font-semibold mt-1">${Number(quote.apertura || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-background rounded-lg p-3 border border-border">
              <p className="text-text-muted">Máximo</p>
              <p className="money font-semibold mt-1 text-primary">${Number(quote.maximo || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-background rounded-lg p-3 border border-border">
              <p className="text-text-muted">Mínimo</p>
              <p className="money font-semibold mt-1 text-danger">${Number(quote.minimo || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-background rounded-lg p-3 border border-border">
              <p className="text-text-muted">Cierre ant.</p>
              <p className="money font-semibold mt-1">${Number(quote.cierreAnterior || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
