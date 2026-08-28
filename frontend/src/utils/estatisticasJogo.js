// utils/estatisticasJogo.js
// Cálculos usados nos gráficos e no ranking da tela de Detalhe do Jogo.
// Tudo aqui é função pura (entra dado, sai dado) — nada depende de
// estado de componente, por isso vive fora do DetalheJogo.jsx.

const FUNDAMENTOS_PONTUAM = ['ataque', 'saque', 'bloqueio'];
const NOME_FUNDAMENTO = { ataque: 'Ataque', saque: 'Saque', bloqueio: 'Bloqueio' };

const FUNDAMENTOS_NAO_PONTUAM = ['recepcao', 'levantamento', 'defesa'];
const NOME_FUNDAMENTO_NAO_PONTUA = { recepcao: 'Recepção', levantamento: 'Levantamento', defesa: 'Defesa' };

const POSICOES_ORDEM = ['Levantador', 'Oposto', 'Ponteiro', 'Central', 'Libero'];
const NOME_POSICAO = { Levantador: 'Levantador', Oposto: 'Oposto', Ponteiro: 'Ponteiro', Central: 'Central', Libero: 'Líbero' };

export function formatarData(isoDate) {
  if (!isoDate) return '—';
  const [ano, mes, dia] = isoDate.split('T')[0].split('-');
  return `${dia}/${mes}/${ano}`;
}

export function aproveitamento(acertos, erros) {
  return acertos + erros > 0 ? Math.round((acertos / (acertos + erros)) * 100) : 0;
}

// gráfico 1 — % de aproveitamento da equipe por set (evolução ao longo do jogo)
export function calcularEvolucaoSets(acoes, setIdParaNumero) {
  const sets = {};

  acoes.forEach(acao => {
    const numeroSet = setIdParaNumero[acao.set_id] ?? '?';
    if (!sets[numeroSet]) sets[numeroSet] = { acertos: 0, erros: 0 };

    if (acao.resultado === 'ponto') sets[numeroSet].acertos += 1;
    if (acao.resultado === 'erro')  sets[numeroSet].erros += 1;
  });

  return Object.entries(sets)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([numero, { acertos, erros }]) => ({
      numero,
      acertos,
      erros,
      aproveitamento: aproveitamento(acertos, erros),
    }));
}

// gráfico 2 — acertos x erros por fundamento (o que a equipe mais precisa treinar)
export function calcularFundamentos(acoes) {
  const porFundamento = {};
  FUNDAMENTOS_PONTUAM.forEach(f => { porFundamento[f] = { acertos: 0, erros: 0 }; });

  acoes.forEach(acao => {
    const tipo = (acao.tipo_acao || '').toLowerCase();
    if (!porFundamento[tipo]) return;
    if (acao.resultado === 'ponto') porFundamento[tipo].acertos += 1;
    if (acao.resultado === 'erro')  porFundamento[tipo].erros += 1;
  });

  return FUNDAMENTOS_PONTUAM.map(tipo => ({
    fundamento: NOME_FUNDAMENTO[tipo],
    acertos: porFundamento[tipo].acertos,
    erros: porFundamento[tipo].erros,
  }));
}

// gráfico 2b — acertos x erros nos fundamentos que não pontuam (recepção, levantamento, defesa)
export function calcularFundamentosNaoPontuam(acoes) {
  const porFundamento = {};
  FUNDAMENTOS_NAO_PONTUAM.forEach(f => { porFundamento[f] = { acertos: 0, erros: 0 }; });

  acoes.forEach(acao => {
    const tipo = (acao.tipo_acao || '').toLowerCase();
    if (!porFundamento[tipo]) return;
    if (acao.resultado === 'ponto') porFundamento[tipo].acertos += 1;
    if (acao.resultado === 'erro')  porFundamento[tipo].erros += 1;
  });

  return FUNDAMENTOS_NAO_PONTUAM.map(tipo => ({
    fundamento: NOME_FUNDAMENTO_NAO_PONTUA[tipo],
    acertos: porFundamento[tipo].acertos,
    erros: porFundamento[tipo].erros,
  }));
}

// gráfico 3 — % de aproveitamento por posição (onde está o problema do time)
export function calcularDesempenhoPosicao(acoes) {
  const porPosicao = {};
  POSICOES_ORDEM.forEach(p => { porPosicao[p] = { acertos: 0, erros: 0 }; });

  acoes.forEach(acao => {
    const posicao = acao.posicao_jogador;
    if (!porPosicao[posicao]) return;
    if (acao.resultado === 'ponto') porPosicao[posicao].acertos += 1;
    if (acao.resultado === 'erro')  porPosicao[posicao].erros += 1;
  });

  return POSICOES_ORDEM
    .map(posicao => ({
      posicao: NOME_POSICAO[posicao],
      aproveitamento: aproveitamento(porPosicao[posicao].acertos, porPosicao[posicao].erros),
      acertos: porPosicao[posicao].acertos,
      erros: porPosicao[posicao].erros,
    }))
    .filter(p => p.acertos + p.erros > 0);
}

// ranking — todos os atletas que tiveram ações no jogo, ordenados por aproveitamento
export function calcularRanking(acoes, nomesJogadores, posicoesJogadores) {
  const porJogador = {};

  acoes.forEach(acao => {
    if (!porJogador[acao.jogador_id]) porJogador[acao.jogador_id] = { acertos: 0, erros: 0 };
    if (acao.resultado === 'ponto') porJogador[acao.jogador_id].acertos += 1;
    if (acao.resultado === 'erro')  porJogador[acao.jogador_id].erros += 1;
  });

  return Object.entries(porJogador)
    .map(([jogadorId, { acertos, erros }]) => ({
      jogadorId,
      nome: nomesJogadores[jogadorId] || 'Atleta',
      posicao: posicoesJogadores[jogadorId] ? NOME_POSICAO[posicoesJogadores[jogadorId]] || posicoesJogadores[jogadorId] : '—',
      acertos,
      erros,
      aproveitamento: aproveitamento(acertos, erros),
    }))
    .sort((a, b) => b.aproveitamento - a.aproveitamento || (b.acertos - a.erros) - (a.acertos - a.erros));
}

// cores e opções padrão reaproveitadas em todos os gráficos da tela
export const COR_ACERTO = 'rgba(45, 127, 255, 1)';
export const COR_ACERTO_FUNDO = 'rgba(45, 127, 255, 0.7)';
export const COR_ERRO = 'rgba(232, 39, 58, 1)';
export const COR_ERRO_FUNDO = 'rgba(232, 39, 58, 0.6)';
export const COR_DOURADO = 'rgba(255, 200, 50, 0.85)';

export const OPCOES_BASE = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: 'rgba(255,255,255,0.6)',
        font: { family: 'Nexa, Arial, sans-serif', size: 11 },
        boxWidth: 12,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
      grid:  { color: 'rgba(255,255,255,0.05)' },
    },
    y: {
      beginAtZero: true,
      ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
      grid:  { color: 'rgba(255,255,255,0.05)' },
    },
  },
};
