// constants/volei.js
// Regras de posição e fundamentos do vôlei usadas na escalação e no
// scout ao vivo. Extraído de ScoutLive.jsx: é regra de negócio pura,
// sem nenhuma dependência de estado do componente.

// ordem de exibição dos botões de posição na escalação
export const POSICOES = ['Levantador', 'Oposto', 'Ponteiro', 'Central', 'Libero'];

// quantos titulares de cada posição uma escalação válida precisa ter
export const POSICOES_REQUERIDAS = { Levantador: 1, Oposto: 1, Ponteiro: 2, Central: 2, Libero: 1 };

export const TOTAL_TITULARES = Object.values(POSICOES_REQUERIDAS).reduce((a, b) => a + b, 0); // 7

// nome de exibição (Líbero tem acento, mas a chave interna fica sem para simplificar)
export const NOME_POSICAO = { Levantador: 'Levantador', Oposto: 'Oposto', Ponteiro: 'Ponteiro', Central: 'Central', Libero: 'Líbero' };

// fundamentos que geram ponto, por posição
export const FUNDAMENTOS_PONTUAM = {
  Levantador: ['Saque', 'Bloqueio', 'Ataque'],
  Ponteiro:   ['Ataque', 'Saque', 'Bloqueio'],
  Oposto:     ['Ataque', 'Saque', 'Bloqueio'],
  Central:    ['Ataque', 'Saque', 'Bloqueio'],
  Libero:     [],
};

// fundamentos que não geram ponto, por posição
export const FUNDAMENTOS_NAO_PONTUAM = {
  Levantador: ['Levantamento'],
  Libero:     ['Recepção', 'Defesa', 'Levantamento'],
  Ponteiro:   ['Recepção'],
  Oposto:     ['Defesa'],
  Central:    ['Defesa'],
};

// todos os fundamentos de uma posição, na ordem em que devem aparecer no card
export function fundamentosDaPosicao(posicao) {
  return [...(FUNDAMENTOS_PONTUAM[posicao] || []), ...(FUNDAMENTOS_NAO_PONTUAM[posicao] || [])];
}

// número de cadastro (camisa) do jogador, direto do cadastro do atleta
export function cadastroDoJogador(j) {
  return j?.jersey_number ?? j?.number ?? j?.numero ?? j?.camisa ?? '—';
}
