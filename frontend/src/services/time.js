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
export async function criarTime(name) {
  const resposta = await apiRequest('/times', {
    method: 'POST',
    body: { name }
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