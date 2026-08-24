import { Router } from 'express';

import {
  listarJogadores,
  buscarJogador,
  criarJogador,
  atualizarJogador,
  deletarJogador
} from '../controllers/jogadorController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

// Todas as rotas de jogadores requerem autenticação
// ('/jogadores' e '/jogador' foram removidas — o frontend só usa
// '/players', que fica como a única rota pra este recurso)
router.get('/players', authenticateToken, listarJogadores);
router.get('/players/:id', authenticateToken, buscarJogador);
router.post('/players', authenticateToken, criarJogador);
router.put('/players/:id', authenticateToken, atualizarJogador);
router.delete('/players/:id', authenticateToken, deletarJogador);

export default router;
