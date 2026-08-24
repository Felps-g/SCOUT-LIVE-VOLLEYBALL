/**
 * ROTAS DE AUTENTICAÇÃO
 * Login, logout, registrar técnico
 * Integrado com Supabase Auth — regra de negócio em services/authService.js,
 * validação/status HTTP em controllers/authController.js.
 */

import { Router } from 'express';
import * as authController from '../controllers/authController.js';

const router = Router();

router.post('/login', authController.login);
router.post('/registrar', authController.registrar);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/profile', authController.buscarPerfil);
router.put('/profile', authController.atualizarPerfil);
router.post('/trocar-senha', authController.trocarSenha);

export default router;
