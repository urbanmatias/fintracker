import { Router, Response } from 'express';
import { AuthRequest, authenticate, authenticateAny } from '../middleware/auth';
import db from '../database/connection';
import {
  connectIol,
  disconnectIol,
  syncPortfolio,
  syncOperations,
  syncDividends,
  getDividendsSummary,
  getConnectionStatus,
  getStoredPortfolio,
  getStoredOperations,
  getSnapshots,
  searchInstrument,
  getQuote,
  getInstrumentHistory,
  IolApiError,
} from '../services/iol';

const router = Router();

router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const status = await getConnectionStatus(req.user!.id);
    res.json(status);
  } catch (error) {
    console.error('IOL status error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/connect', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
      return;
    }

    await connectIol(req.user!.id, username, password);
    try {
      await syncPortfolio(req.user!.id);
      await syncOperations(req.user!.id);
      await syncDividends(req.user!.id);
    } catch (err) {
      console.error('Initial IOL sync failed:', err);
    }

    res.json({ message: 'Conectado a IOL' });
  } catch (error) {
    if (error instanceof IolApiError) {
      // Send the actual error message so the user knows what's wrong
      res.status(error.status === 400 || error.status === 401 ? 401 : error.status).json({ error: error.message });
      return;
    }
    console.error('IOL connect error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/disconnect', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await disconnectIol(req.user!.id);
    res.json({ message: 'Desconectado de IOL' });
  } catch (error) {
    console.error('IOL disconnect error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/sync', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await syncPortfolio(req.user!.id);
    const opsResult = await syncOperations(req.user!.id).catch(() => ({ imported: 0, autoCreated: 0 }));
    const divResult = await syncDividends(req.user!.id).catch(() => ({ imported: 0 }));
    const portfolio = await getStoredPortfolio(req.user!.id);
    res.json({
      portfolio,
      ...opsResult,
      dividends_imported: divResult.imported,
    });
  } catch (error) {
    if (error instanceof IolApiError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('IOL sync error:', error);
    res.status(500).json({ error: 'Error al sincronizar con IOL' });
  }
});

router.get('/dividends', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const summary = await getDividendsSummary(req.user!.id);
    res.json(summary);
  } catch (error) {
    console.error('IOL dividends error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/portfolio', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const portfolio = await getStoredPortfolio(req.user!.id);
    res.json({ portfolio });
  } catch (error) {
    console.error('IOL portfolio error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/operations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 500) : 100;
    const operations = await getStoredOperations(req.user!.id, limit);
    res.json({ operations });
  } catch (error) {
    console.error('IOL operations error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/snapshots', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const days = req.query.days ? Math.min(Number(req.query.days), 365) : 90;
    const snapshots = await getSnapshots(req.user!.id, days);
    res.json({ snapshots });
  } catch (error) {
    console.error('IOL snapshots error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      res.json({ results: [] });
      return;
    }
    const results = await searchInstrument(req.user!.id, q);
    res.json({ results });
  } catch (error) {
    if (error instanceof IolApiError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('IOL search error:', error);
    res.status(500).json({ error: 'Error al buscar instrumento' });
  }
});

router.get('/quote/:market/:symbol', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const market = String(req.params.market);
    const symbol = String(req.params.symbol);
    const quote = await getQuote(req.user!.id, market, symbol);
    res.json(quote);
  } catch (error) {
    if (error instanceof IolApiError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('IOL quote error:', error);
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
});

router.get('/history/:market/:symbol', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const market = String(req.params.market);
    const symbol = String(req.params.symbol);
    const days = req.query.days ? Math.min(Number(req.query.days), 365 * 3) : 90;

    const today = new Date();
    const from = new Date();
    from.setDate(today.getDate() - days);

    const history = await getInstrumentHistory(
      req.user!.id,
      market,
      symbol,
      from.toISOString().split('T')[0],
      today.toISOString().split('T')[0]
    );
    res.json({ history });
  } catch (error) {
    if (error instanceof IolApiError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('IOL history error:', error);
    res.status(500).json({ error: 'Error al obtener histórico' });
  }
});

interface IngestPosition {
  country: string;
  symbol: string;
  description?: string | null;
  instrument_type?: string | null;
  quantity: number;
  last_price?: number | null;
  ppc?: number | null;
  valuation?: number | null;
  profit_loss?: number | null;
  profit_loss_percent?: number | null;
  currency?: string | null;
}

interface IngestOperation {
  iol_operation_id: number;
  date: string;
  type: string;
  status?: string | null;
  symbol?: string | null;
  market?: string | null;
  quantity?: number | null;
  price?: number | null;
  total?: number | null;
  currency?: string | null;
  description?: string | null;
  raw?: unknown;
}

interface IngestDividend {
  iol_movement_id: number;
  date: string;
  symbol?: string | null;
  type?: string | null;
  amount: number;
  currency?: string | null;
  description?: string | null;
  raw?: unknown;
}

interface IngestPayload {
  username?: string;
  positions?: IngestPosition[];
  operations?: IngestOperation[];
  dividends?: IngestDividend[];
}

const DIVIDEND_KEYWORDS = ['dividendo', 'dividend', 'renta', 'cobro de cupon', 'cobro de cupón', 'cupon', 'cupón'];
function isDividendType(typeOrDesc: string): boolean {
  const lower = (typeOrDesc || '').toLowerCase();
  return DIVIDEND_KEYWORDS.some((k) => lower.includes(k));
}

/**
 * Local sync client posts portfolio + operations + dividends here.
 * Uses API token (Authorization: Bearer ft_...) so it's separate from the
 * normal browser session.
 */
router.post('/ingest', authenticateAny, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const payload = req.body as IngestPayload;

    let portfolioCount = 0;
    let operationsImported = 0;
    let autoCreatedInvestments = 0;
    let dividendsImported = 0;

    // Mark connection as active (without storing IOL credentials!)
    if (payload.username) {
      const { encrypt } = await import('../services/crypto');
      await db('iol_connections')
        .insert({
          user_id: userId,
          username_encrypted: encrypt(payload.username),
          // Empty placeholders - we never store the password when using local sync
          password_encrypted: encrypt(''),
          access_token: '',
          refresh_token: '',
          token_expires_at: new Date(0),
          last_sync_at: new Date(),
        })
        .onConflict('user_id')
        .merge({
          username_encrypted: encrypt(payload.username),
          last_sync_at: new Date(),
          updated_at: new Date(),
        });
    } else {
      await db('iol_connections')
        .where({ user_id: userId })
        .update({ last_sync_at: new Date() });
    }

    // 1. Portfolio (replace all)
    if (Array.isArray(payload.positions)) {
      await db('iol_portfolio').where({ user_id: userId }).del();

      const rows = payload.positions.map((p) => ({
        user_id: userId,
        country: p.country,
        symbol: p.symbol,
        description: p.description ?? null,
        instrument_type: p.instrument_type ?? null,
        quantity: p.quantity,
        last_price: p.last_price ?? null,
        ppc: p.ppc ?? null,
        valuation: p.valuation ?? null,
        profit_loss: p.profit_loss ?? null,
        profit_loss_percent: p.profit_loss_percent ?? null,
        currency: p.currency ?? null,
      }));

      if (rows.length > 0) {
        await db('iol_portfolio').insert(rows);
      }
      portfolioCount = rows.length;

      // Daily snapshot
      const totalValuation = payload.positions.reduce((s, p) => s + Number(p.valuation || 0), 0);
      const totalPL = payload.positions.reduce((s, p) => s + Number(p.profit_loss || 0), 0);
      const today = new Date().toISOString().split('T')[0];

      await db('portfolio_snapshots')
        .insert({
          user_id: userId,
          date: today,
          total_valuation: totalValuation,
          total_profit_loss: totalPL,
          positions_count: payload.positions.length,
          raw_positions: JSON.stringify(payload.positions),
        })
        .onConflict(['user_id', 'date'])
        .merge({
          total_valuation: totalValuation,
          total_profit_loss: totalPL,
          positions_count: payload.positions.length,
          raw_positions: JSON.stringify(payload.positions),
          updated_at: new Date(),
        });
    }

    // 2. Operations (upsert by iol_operation_id, auto-create investments)
    if (Array.isArray(payload.operations)) {
      for (const op of payload.operations) {
        if (!op.iol_operation_id || !op.date) continue;

        const existing = await db('iol_operations')
          .where({ user_id: userId, iol_operation_id: op.iol_operation_id })
          .first();

        if (existing) continue;

        const [inserted] = await db('iol_operations')
          .insert({
            user_id: userId,
            iol_operation_id: op.iol_operation_id,
            date: op.date,
            type: op.type,
            status: op.status ?? null,
            symbol: op.symbol ?? null,
            market: op.market ?? null,
            quantity: op.quantity ?? null,
            price: op.price ?? null,
            total: op.total ?? null,
            currency: op.currency ?? null,
            raw_data: op.raw ? JSON.stringify(op.raw) : null,
          })
          .returning('id');

        operationsImported++;

        // Auto-create investment for purchases
        const isPurchase = (op.type || '').toLowerCase().includes('compra');
        const total = Number(op.total || 0);
        if (isPurchase && total > 0 && op.symbol) {
          const [inv] = await db('investments')
            .insert({
              user_id: userId,
              amount: total,
              date: op.date,
              description: `${op.type} ${op.symbol}`,
              ticker: op.symbol,
              quantity: op.quantity ?? null,
              price_per_unit: op.price ?? null,
              platform: 'IOL',
              iol_operation_id: op.iol_operation_id,
              auto_generated: true,
            })
            .returning('id');

          await db('iol_operations').where({ id: inserted.id }).update({ matched_investment_id: inv.id });
          autoCreatedInvestments++;
        }
      }
    }

    // 3. Dividends (upsert by iol_movement_id, only those that match keywords)
    if (Array.isArray(payload.dividends)) {
      for (const d of payload.dividends) {
        if (!d.iol_movement_id || !d.date || !d.amount) continue;
        // Either client filters or we double-check
        const lookText = `${d.type || ''} ${d.description || ''}`;
        if (!isDividendType(lookText)) continue;

        const existing = await db('iol_dividends')
          .where({ user_id: userId, iol_movement_id: d.iol_movement_id })
          .first();
        if (existing) continue;

        await db('iol_dividends').insert({
          user_id: userId,
          iol_movement_id: d.iol_movement_id,
          date: d.date,
          symbol: d.symbol ?? null,
          type: d.type ?? null,
          amount: d.amount,
          currency: d.currency ?? null,
          description: d.description ?? null,
          raw_data: d.raw ? JSON.stringify(d.raw) : null,
        });
        dividendsImported++;
      }
    }

    res.json({
      ok: true,
      portfolio_count: portfolioCount,
      operations_imported: operationsImported,
      auto_created_investments: autoCreatedInvestments,
      dividends_imported: dividendsImported,
    });
  } catch (error) {
    console.error('IOL ingest error:', error);
    res.status(500).json({ error: 'Error al procesar datos' });
  }
});

export default router;
