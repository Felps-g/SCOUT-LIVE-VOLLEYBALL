// ============================================
// SERVIÇO DE TIME / JOGADORES (frontend)
// ============================================
// Centraliza:
// - chamadas reais à API para times e jogadores
// - qual é o "time selecionado" no momento (persistido no localStorage
//   para ser compartilhado entre Atletas, AdicionarAtletas e ScoutLive)

import { apiRequest } from './api.js';
import { TIME_SELECIONADO_KEY as CHAVE_TIME_SELECIONADO } from '../constants/storage.js';

export function getTimeSelecionado() {
  try {
    const bruto = localStorage.getItem(CHAVE_TIME_SELECIONADO);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

export function setTimeSelecionado(time) {
  if (time && time.id) {
    localStorage.setItem(CHAVE_TIME_SELECIONADO, JSON.stringify(time));
  }
}

export function limparTimeSelecionado() {
  localStorage.removeItem(CHAVE_TIME_SELECIONADO);
}

// GET /api/times -> array de times do técnico logado
export async function listarTimes() {
  return apiRequest('/times');
}

// POST /api/times -> { mensagem, time }
// category tem um padrão ("Adversário") porque o ScoutLive cria times
// adversários automaticamente só pelo nome, sem pedir categoria — só as
// equipes de verdade do técnico (criadas pela tela de Equipes) informam
// uma categoria real.
export async function criarTime(name, category = 'Adversário') {
  const resposta = await apiRequest('/times', {
    method: 'POST',
    body: { name, category }
  });
  return resposta.time;
}

// PUT /api/times/:id -> { mensagem, time }
export async function atualizarTime(id, payload) {
  const resposta = await apiRequest(`/times/${id}`, {
    method: 'PUT',
    body: payload
  });
  return resposta.time;
}

// GET /api/players?team_id=... -> array de jogadores do time
export async function listarJogadores(teamId) {
  if (!teamId) return [];
  return apiRequest(`/players?team_id=${encodeURIComponent(teamId)}`);
}

// POST /api/players -> { mensagem, jogador }
export async function criarJogador(payload) {
  const resposta = await apiRequest('/players', {
    method: 'POST',
    body: payload
  });
  return resposta.jogador;
}

// PUT /api/players/:id -> { mensagem, jogador }
export async function atualizarJogador(id, payload) {
  const resposta = await apiRequest(`/players/${id}`, {
    method: 'PUT',
    body: payload
  });
  return resposta.jogador;
}