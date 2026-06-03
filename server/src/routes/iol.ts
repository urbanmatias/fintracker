import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
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

export default router;
