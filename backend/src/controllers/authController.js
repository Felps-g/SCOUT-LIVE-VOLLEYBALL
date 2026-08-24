/**
 * CONTROLLER DE AUTENTICAÇÃO
 * Validação de entrada + status HTTP. A regra de negócio (chamadas ao
 * Supabase) fica em services/authService.js.
 */

import * as authService from '../services/authService.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    const resultado = await authService.login(email, password);

    res.status(200).json({ mensagem: 'Login realizado com sucesso', ...resultado });
  } catch (erro) {
    console.error('Erro no login:', erro);
    res.status(401).json({ erro: 'Falha na autenticação', detalhes: erro.message });
  }
};

export const registrar = async (req, res) => {
  try {
    const { email, password, nome } = req.body;

    if (!email || !password) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ erro: 'Senha deve ter pelo menos 6 caracteres' });
    }

    const usuario = await authService.registrar(email, password, nome);

    res.status(201).json({ mensagem: 'Registro realizado com sucesso', usuario });
  } catch (erro) {
    console.error('Erro ao registrar:', erro);
    res.status(400).json({ erro: 'Erro ao registrar', detalhes: erro.message, codigo: erro.codigo });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ erro: 'Refresh token é obrigatório' });
    }

    const resultado = await authService.renovarToken(refresh_token);

    res.status(200).json({ mensagem: 'Token renovado com sucesso', ...resultado });
  } catch (erro) {
    console.error('Erro ao renovar token:', erro);
    res.status(401).json({ erro: 'Falha ao renovar token', detalhes: erro.message });
  }
};

export const logout = async (req, res) => {
  try {
    await authService.logout();
    res.status(200).json({ mensagem: 'Logout realizado com sucesso' });
  } catch (erro) {
    console.error('Erro no logout:', erro);
    res.status(400).json({ erro: 'Erro ao fazer logout', detalhes: erro.message });
  }
};

export const buscarPerfil = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ erro: 'Token não fornecido' });
    }

    const usuario = await authService.buscarPerfil(token);

    res.status(200).json({ mensagem: 'Perfil do técnico', usuario });
  } catch (erro) {
    res.status(erro.status || 401).json({ erro: 'Token inválido', detalhes: erro.message });
  }
};

export const atualizarPerfil = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ erro: 'Token não fornecido' });
    }

    const usuario = await authService.atualizarPerfil(token, req.body);

    res.status(200).json({ mensagem: 'Perfil atualizado com sucesso', usuario });
  } catch (erro) {
    console.error('Erro ao atualizar perfil:', erro);
    const status = erro.status || 400;
    res.status(status).json({
      erro: status === 401 ? 'Token inválido' : 'Erro ao atualizar perfil',
      detalhes: erro.message
    });
  }
};

export const trocarSenha = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ erro: 'Token não fornecido' });
    }

    const { senha_atual, senha_nova } = req.body;

    if (!senha_atual || !senha_nova) {
      return res.status(400).json({ erro: 'Senha atual e nova são obrigatórias' });
    }

    await authService.trocarSenha(token, senha_nova);

    res.status(200).json({ mensagem: 'Senha alterada com sucesso' });
  } catch (erro) {
    console.error('Erro ao trocar senha:', erro);
    const status = erro.status || 400;
    res.status(status).json({
      erro: status === 401 ? 'Token inválido' : 'Erro ao trocar senha',
      detalhes: erro.message
    });
  }
};
