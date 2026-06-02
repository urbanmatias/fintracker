import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { getMarketNews, getCompanyNews, FinnhubError } from '../services/finnhub';

const router = Router();

router.get('/market', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const category = String(req.query.category || 'general');
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 100) : 30;

    const news = await getMarketNews(category);
    res.json({ news: news.slice(0, limit) });
  } catch (error) {
    if (error instanceof FinnhubError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('Market news error:', error);
    res.status(500).json({ error: 'Error al obtener noticias' });
  }
});

router.get('/company/:symbol', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const symbol = String(req.params.symbol);
    const daysBack = req.query.days ? Math.min(Number(req.query.days), 30) : 7;
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 50) : 15;

    const news = await getCompanyNews(symbol, daysBack);
    res.json({ news: news.slice(0, limit) });
  } catch (error) {
    if (error instanceof FinnhubError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('Company news error:', error);
    res.status(500).json({ error: 'Error al obtener noticias' });
  }
});

export default router;
