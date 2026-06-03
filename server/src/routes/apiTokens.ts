import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { createApiToken, listApiTokens, revokeApiToken } from '../services/apiTokens';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tokens = await listApiTokens(req.user!.id);
    res.json({ tokens });
  } catch (error) {
    console.error('List tokens error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Nombre requerido' });
      return;
    }
    const result = await createApiToken(req.user!.id, name.trim());
    res.status(201).json(result);
  } catch (error) {
    console.error('Create token error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const ok = await revokeApiToken(req.user!.id, String(req.params.id));
    if (!ok) {
      res.status(404).json({ error: 'Token no encontrado' });
      return;
    }
    res.json({ message: 'Token revocado' });
  } catch (error) {
    console.error('Revoke token error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
