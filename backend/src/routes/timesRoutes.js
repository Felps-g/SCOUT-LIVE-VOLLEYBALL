import { Router } from 'express';
import { listarTimes, buscarTime, criarTime, atualizarTime, deletarTime } from '../controllers/timesController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

// Todas as rotas de times requerem autenticação
// (a rota em inglês '/teams' foi removida — o frontend só usa '/times',
// e mantê-la só servia como superfície de API morta)
router.get('/times', authenticateToken, listarTimes);
router.get('/times/:id', authenticateToken, buscarTime);
router.post('/times', authenticateToken, criarTime);
router.put('/times/:id', authenticateToken, atualizarTime);
router.delete('/times/:id', authenticateToken, deletarTime);

export default router;
