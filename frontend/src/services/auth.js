// services/auth.js — controla a sessão do usuário no front-end.
// Guarda os dados do técnico logado no localStorage (separado do token,
// que já é tratado em api.js) e oferece funções prontas pra usar nas telas.

import { getAuthToken, clearAuthToken, apiRequest } from './api.js';
import { USUARIO_KEY, EQUIPE_PENDENTE_KEY } from '../constants/storage.js';

// retorna o usuário salvo no localStorage (ou null se não tiver ninguém logado)
export function getUsuarioLogado() {
  const bruto = localStorage.getItem(USUARIO_KEY);
  if (!bruto) return null;

  try {
    return JSON.parse(bruto);
  } catch {
    return null;
  }
}

// true só quando existe token E dados do usuário salvos
export function estaLogado() {
  return Boolean(getAuthToken()) && Boolean(getUsuarioLogado());
}

export function salvarUsuarioLogado(usuario) {
  if (usuario) localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}

// limpa token + dados do usuário (usar no "Sair da conta")
export function limparSessao() {
  clearAuthToken();
  localStorage.removeItem(USUARIO_KEY);
  try { sessionStorage.removeItem(EQUIPE_PENDENTE_KEY); } catch { /* ignora */ }
}

// pega as iniciais do nome (ou do e-mail, se não tiver nome) pra mostrar no avatar
export function obterIniciais(nomeOuEmail) {
  if (!nomeOuEmail) return '?';

  const nome = nomeOuEmail.includes('@') ? nomeOuEmail.split('@')[0] : nomeOuEmail;
  const partes = nome.trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase();

  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}

// busca os dados atualizados do técnico direto no backend (nome, email etc.)
// e já atualiza o que está salvo no localStorage.
export async function buscarPerfilAtual() {
  const dados = await apiRequest('/auth/profile');
  const usuarioApi = dados.usuario || {};

  const usuario = {
    id: usuarioApi.id,
    email: usuarioApi.email,
    nome: usuarioApi.user_metadata?.nome || usuarioApi.email?.split('@')[0] || '',
    fotoUrl: usuarioApi.user_metadata?.foto_url || '',
  };

  salvarUsuarioLogado(usuario);
  return usuario;
}