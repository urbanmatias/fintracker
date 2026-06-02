import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import {
  connectIol,
  disconnectIol,
  syncPortfolio,
  getConnectionStatus,
  getStoredPortfolio,
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
    // Try an initial sync (best effort)
    try {
      await syncPortfolio(req.user!.id);
    } catch (err) {
      console.error('Initial IOL sync failed:', err);
    }

    res.json({ message: 'Conectado a IOL' });
  } catch (error) {
    if (error instanceof IolApiError) {
      res.status(error.status === 400 ? 401 : error.status).json({ error: 'Credenciales inválidas o error en IOL' });
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
    const portfolio = await getStoredPortfolio(req.user!.id);
    res.json({ portfolio });
  } catch (error) {
    if (error instanceof IolApiError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('IOL sync error:', error);
    res.status(500).json({ error: 'Error al sincronizar con IOL' });
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

export default router;
