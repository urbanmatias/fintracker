import { useState, useEffect } from 'react';
import { History, CheckCircle2 } from 'lucide-react';
import api from '../api/client';

interface Operation {
  id: string;
  iol_operation_id: number;
  date: string;
  type: string;
  status: string;
  symbol: string | null;
  market: string | null;
  quantity: number | null;
  price: number | null;
  total: number | null;
  currency: string | null;
  matched_investment_id: string | null;
}

interface Props {
  refreshKey: number;
}

export default function OperationsHistory({ refreshKey }: Props) {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/iol/operations', { params: { limit: 100 } })
      .then((res) => setOperations(res.data.operations || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="bg-surface rounded-2xl p-5 border border-border">
        <div className="h-6 w-48 bg-border/50 rounded animate-pulse"></div>
        <div className="h-32 bg-border/30 rounded mt-3 animate-pulse"></div>
      </div>
    );
  }

  if (operations.length === 0) {
    return (
      <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-text-muted" />
          <h3 className="font-semibold text-sm">Historial de operaciones IOL</h3>
        </div>
        <p className="text-sm text-text-muted text-center py-4">
          No hay operaciones registradas. Sincronizá para traerlas desde IOL.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-4 h-4 text-text-muted" />
        <h3 className="font-semibold text-sm">Historial de operaciones IOL</h3>
        <span className="text-xs text-text-muted ml-auto">{operations.length}</span>
      </div>

      <div className="overflow-x-auto -mx-5 md:mx-0">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-border text-text-muted text-[11px] uppercase">
              <th className="text-left p-2 font-medium">Fecha</th>
              <th className="text-left p-2 font-medium">Tipo</th>
              <th className="text-left p-2 font-medium">Símbolo</th>
              <th className="text-right p-2 font-medium">Cant.</th>
              <th className="text-right p-2 font-medium">Precio</th>
              <th className="text-right p-2 font-medium">Total</th>
              <th className="text-center p-2 font-medium">Match</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {operations.map((op) => {
              const isPurchase = (op.type || '').toLowerCase().includes('compra');
              const isSale = (op.type || '').toLowerCase().includes('venta');
              return (
                <tr key={op.id} className="hover:bg-surface-light/30">
                  <td className="p-2 text-xs text-text-muted">
                    {new Date(op.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="p-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                      isPurchase ? 'bg-primary/15 text-primary' :
                      isSale ? 'bg-danger/15 text-danger' :
                      'bg-border/50 text-text-muted'
                    }`}>
                      {op.type}
                    </span>
                  </td>
                  <td className="p-2 font-semibold">{op.symbol || '-'}</td>
                  <td className="p-2 text-right money">{op.quantity ? Number(op.quantity).toLocaleString('es-AR', { maximumFractionDigits: 4 }) : '-'}</td>
                  <td className="p-2 text-right money text-text-muted">{op.price ? `$${Number(op.price).toLocaleString('es-AR', { maximumFractionDigits: 2 })}` : '-'}</td>
                  <td className={`p-2 text-right money font-semibold ${isPurchase ? 'text-primary' : isSale ? 'text-danger' : ''}`}>
                    {op.total ? `$${Number(op.total).toLocaleString('es-AR', { maximumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="p-2 text-center">
                    {op.matched_investment_id ? (
                      <CheckCircle2 className="w-4 h-4 text-primary mx-auto" aria-label="Matcheada con inversión" />
                    ) : (
                      <span className="text-text-muted/40 text-xs">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-text-muted mt-3">
        Las compras se registran automáticamente como inversiones (icono ✓).
      </p>
    </div>
  );
}
