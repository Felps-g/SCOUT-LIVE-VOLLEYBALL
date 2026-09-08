import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import '../../css/detalhe-jogos.css';
import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';
import lixeiraImg from '../assets/IMG/lixeira.png';
import voltarImg from '../assets/IMG/voltar.png';
import relatorioImg from '../assets/IMG/relatorio.png'; // adicionar este arquivo em src/assets/IMG
import { apiRequest } from '../services/api.js';
import { listarTimes, listarJogadores } from '../services/time.js';

// spinner central exibido enquanto os dados do jogo ainda não chegaram da API
function CarregandoJogo() {
  return (
    <div className="carregando-jogos">
      <motion.div
        className="spinner"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      <span className="carregando-texto">Carregando jogo…</span>
    </div>
  );
}

// ordem de exibição dos fundamentos que pontuam, dos que não pontuam e das posições
const FUNDAMENTOS_PONTUAM = ['ataque', 'saque', 'bloqueio'];
const NOME_FUNDAMENTO = { ataque: 'Ataque', saque: 'Saque', bloqueio: 'Bloqueio' };

const FUNDAMENTOS_NAO_PONTUAM = ['recepcao', 'levantamento', 'defesa'];
const NOME_FUNDAMENTO_NAO_PONTUA = { recepcao: 'Recepção', levantamento: 'Levantamento', defesa: 'Defesa' };

const POSICOES_ORDEM = ['Levantador', 'Oposto', 'Ponteiro', 'Central', 'Libero'];
const NOME_POSICAO = { Levantador: 'Levantador', Oposto: 'Oposto', Ponteiro: 'Ponteiro', Central: 'Central', Libero: 'Líbero' };

function formatarData(isoDate) {
  if (!isoDate) return '—';
  const [ano, mes, dia] = isoDate.split('T')[0].split('-');
  return `${dia}/${mes}/${ano}`;
}

function aproveitamento(acertos, erros) {
  return acertos + erros > 0 ? Math.round((acertos / (acertos + erros)) * 100) : 0;
}

// gráfico — % de aproveitamento da equipe por set (evolução ao longo do jogo)
function calcularEvolucaoSets(acoes, setIdParaNumero) {
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

// gráfico — acertos x erros por fundamento (o que a equipe mais precisa treinar)
function calcularFundamentos(acoes) {
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

// gráfico — acertos x erros nos fundamentos que não pontuam (recepção, levantamento, defesa) — visão geral da equipe
function calcularFundamentosNaoPontuam(acoes) {
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

// gráfico — % de aproveitamento por posição (onde está o problema do time)
function calcularDesempenhoPosicao(acoes) {
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

// gráficos — desempenho individual por atleta em um fundamento específico
// (usado para os novos gráficos de Passes/Recepção, Levantamentos e Defesas)
function calcularPorAtleta(acoes, tipoAcao, nomesJogadores) {
  const porJogador = {};

  acoes.forEach(acao => {
    if ((acao.tipo_acao || '').toLowerCase() !== tipoAcao) return;
    const id = acao.jogador_id;
    if (!porJogador[id]) porJogador[id] = { ponto: 0, erro: 0, neutro: 0 };
    if (acao.resultado === 'ponto') porJogador[id].ponto += 1;
    else if (acao.resultado === 'erro') porJogador[id].erro += 1;
    else porJogador[id].neutro += 1;
  });

  return Object.entries(porJogador)
    .map(([jogadorId, v]) => {
      const total = v.ponto + v.erro + v.neutro;
      return {
        jogadorId,
        nome: nomesJogadores[jogadorId] || 'Atleta',
        ponto: v.ponto,
        erro: v.erro,
        neutro: v.neutro,
        total,
        aproveitamento: aproveitamento(v.ponto, v.erro),
      };
    })
    .sort((a, b) => b.total - a.total);
}

// ranking — todos os atletas que tiveram ações no jogo, ordenados por aproveitamento
function calcularRanking(acoes, nomesJogadores, posicoesJogadores) {
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

// lista de todos os gráficos disponíveis na tela — controla o seletor E o relatório em PDF
// "tipo" indica se o gráfico é de Linha ou de Barra, mostrado como selo no cartão do seletor
const CHART_DEFS = [
  { id: 'evolucao',       titulo: 'Evolução por Set',           subtitulo: 'Aproveitamento ao longo do jogo',   cor: 'azul',    tipo: 'linha' },
  { id: 'fundamentos',    titulo: 'Fundamentos que Pontuam',    subtitulo: 'Ataque, saque e bloqueio',          cor: 'azul',    tipo: 'barra' },
  { id: 'fundamentosNao', titulo: 'Fundamentos que Não Pontuam', subtitulo: 'Recepção, levantamento e defesa', cor: 'azul',    tipo: 'barra' },
  { id: 'passes',         titulo: 'Passes (Recepção)',          subtitulo: 'Desempenho por atleta',             cor: 'verde',   tipo: 'barra' },
  { id: 'levantamentos',  titulo: 'Levantamentos',              subtitulo: 'Desempenho por atleta',             cor: 'verde',   tipo: 'barra' },
  { id: 'defesas',        titulo: 'Defesas',                    subtitulo: 'Desempenho por atleta',             cor: 'verde',   tipo: 'barra' },
  { id: 'posicao',        titulo: 'Aproveitamento por Posição', subtitulo: 'Onde está o problema do time',      cor: 'dourado', tipo: 'barra' },
];

const NOME_TIPO_GRAFICO = { linha: 'Linha', barra: 'Barra' };

// cores padrão reaproveitadas em todos os gráficos — tema 'escuro' (tela) e 'claro' (PDF)
function paletaTema(tema) {
  if (tema === 'claro') {
    return {
      acertoBorda: 'rgba(45,127,255,1)',   acertoFundo: 'rgba(45,127,255,0.65)',
      erroBorda:   'rgba(214,39,58,1)',    erroFundo:   'rgba(214,39,58,0.55)',
      neutroBorda: 'rgba(90,95,115,0.9)',  neutroFundo: 'rgba(90,95,115,0.35)',
      douradoBorda: 'rgba(195,145,15,1)',  douradoFundo: 'rgba(230,180,40,0.75)',
      legenda: 'rgba(0,0,0,0.8)', ticks: 'rgba(0,0,0,0.7)', grid: 'rgba(0,0,0,0.08)',
    };
  }
  return {
    acertoBorda: 'rgba(45, 127, 255, 1)',   acertoFundo: 'rgba(45, 127, 255, 0.7)',
    erroBorda:   'rgba(232, 39, 58, 1)',    erroFundo:   'rgba(232, 39, 58, 0.6)',
    neutroBorda: 'rgba(255,255,255,0.45)',  neutroFundo: 'rgba(255,255,255,0.22)',
    douradoBorda: 'rgba(255, 200, 50, 1)',  douradoFundo: 'rgba(255, 200, 50, 0.85)',
    legenda: 'rgba(255,255,255,0.6)', ticks: 'rgba(255,255,255,0.5)', grid: 'rgba(255,255,255,0.05)',
  };
}

function buildOpcoesBase(pal) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: pal.legenda,
          font: { family: 'Nexa, Arial, sans-serif', size: 11 },
          boxWidth: 12,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: pal.ticks, font: { size: 11 } },
        grid:  { color: pal.grid },
      },
      y: {
        beginAtZero: true,
        ticks: { color: pal.ticks, font: { size: 11 } },
        grid:  { color: pal.grid },
      },
    },
  };
}

// monta a configuração do Chart.js para um gráfico específico, a partir dos
// dados já calculados. usada tanto pro gráfico ativo na tela quanto pra
// gerar as imagens do relatório em PDF (tema 'claro' nesse caso)
function construirConfigGrafico(id, tema, dados) {
  const pal = paletaTema(tema);
  const base = buildOpcoesBase(pal);

  switch (id) {
    case 'evolucao': {
      if (dados.evolucaoSets.length === 0) return null;
      return {
        type: 'line',
        data: {
          labels: dados.evolucaoSets.map(s => `Set ${s.numero}`),
          datasets: [{
            label: 'Aproveitamento (%)',
            data: dados.evolucaoSets.map(s => s.aproveitamento),
            borderColor: pal.acertoBorda,
            backgroundColor: pal.acertoFundo,
            pointBackgroundColor: pal.acertoBorda,
            borderWidth: 2,
            tension: 0.3,
            fill: true,
          }],
        },
        options: {
          ...base,
          scales: {
            ...base.scales,
            y: { ...base.scales.y, suggestedMax: 100, ticks: { ...base.scales.y.ticks, callback: v => `${v}%` } },
          },
        },
      };
    }

    case 'fundamentos': {
      if (dados.fundamentos.every(f => f.acertos + f.erros === 0)) return null;
      return {
        type: 'bar',
        data: {
          labels: dados.fundamentos.map(f => f.fundamento),
          datasets: [
            { label: 'Acertos', data: dados.fundamentos.map(f => f.acertos), backgroundColor: pal.acertoFundo, borderColor: pal.acertoBorda, borderWidth: 1, borderRadius: 5 },
            { label: 'Erros',   data: dados.fundamentos.map(f => f.erros),   backgroundColor: pal.erroFundo,   borderColor: pal.erroBorda,   borderWidth: 1, borderRadius: 5 },
          ],
        },
        options: base,
      };
    }

    case 'fundamentosNao': {
      if (dados.fundamentosNaoPontuam.every(f => f.acertos + f.erros === 0)) return null;
      return {
        type: 'bar',
        data: {
          labels: dados.fundamentosNaoPontuam.map(f => f.fundamento),
          datasets: [
            { label: 'Acertos', data: dados.fundamentosNaoPontuam.map(f => f.acertos), backgroundColor: pal.acertoFundo, borderColor: pal.acertoBorda, borderWidth: 1, borderRadius: 5 },
            { label: 'Erros',   data: dados.fundamentosNaoPontuam.map(f => f.erros),   backgroundColor: pal.erroFundo,   borderColor: pal.erroBorda,   borderWidth: 1, borderRadius: 5 },
          ],
        },
        options: base,
      };
    }

    // gráficos individuais por atleta (Passes/Recepção, Levantamentos, Defesas)
    // barras verticais agrupadas lado a lado (mesmo estilo do gráfico de Fundamentos) — sem empilhar
    case 'passes':
    case 'levantamentos':
    case 'defesas': {
      const lista = id === 'passes' ? dados.passes : id === 'levantamentos' ? dados.levantamentos : dados.defesas;
      if (lista.length === 0) return null;
      return {
        type: 'bar',
        data: {
          labels: lista.map(a => a.nome),
          datasets: [
            { label: 'Ponto',  data: lista.map(a => a.ponto),  backgroundColor: pal.acertoFundo, borderColor: pal.acertoBorda, borderWidth: 1, borderRadius: 5 },
            { label: 'Neutro', data: lista.map(a => a.neutro), backgroundColor: pal.neutroFundo, borderColor: pal.neutroBorda, borderWidth: 1, borderRadius: 5 },
            { label: 'Erro',   data: lista.map(a => a.erro),   backgroundColor: pal.erroFundo,   borderColor: pal.erroBorda,   borderWidth: 1, borderRadius: 5 },
          ],
        },
        options: base,
      };
    }

    case 'posicao': {
      if (dados.desempenhoPosicao.length === 0) return null;
      return {
        type: 'bar',
        data: {
          labels: dados.desempenhoPosicao.map(p => p.posicao),
          datasets: [{
            label: 'Aproveitamento (%)',
            data: dados.desempenhoPosicao.map(p => p.aproveitamento),
            backgroundColor: pal.douradoFundo,
            borderColor: pal.douradoBorda,
            borderWidth: 1,
            borderRadius: 5,
          }],
        },
        options: {
          ...base,
          plugins: { legend: { display: false } },
          scales: {
            ...base.scales,
            y: { ...base.scales.y, suggestedMax: 100, ticks: { ...base.scales.y.ticks, callback: v => `${v}%` } },
          },
        },
      };
    }

    default:
      return null;
  }
}

// renderiza um gráfico "fora da tela" (canvas não anexado ao DOM), só pra
// capturar a imagem PNG usada no relatório em PDF — assim o PDF sempre
// inclui todos os gráficos, não só o que está selecionado na tela
function renderizarGraficoOffscreen(cfg, largura = 900, altura = 560) {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const chart = new Chart(canvas, {
      ...cfg,
      options: { ...cfg.options, responsive: false, animation: false },
    });
    requestAnimationFrame(() => {
      const imagem = canvas.toDataURL('image/png', 1.0);
      chart.destroy();
      resolve(imagem);
    });
  });
}

export default function DetalheJogo() {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  // pega o id do jogo que veio na url: #/app/jogos/detalhes?id=123
  // (com hash routing o query string fica dentro do hash, não em location.search)
  const queryString = window.location.hash.split('?')[1] || '';
  const params = new URLSearchParams(queryString);
  const jogoId = params.get('id');

  const [jogo, setJogo]           = useState(null);
  const [acoes, setAcoes]         = useState([]);
  const [evolucaoSets, setEvolucaoSets]   = useState([]);
  const [fundamentos, setFundamentos]     = useState([]);
  const [fundamentosNaoPontuam, setFundamentosNaoPontuam] = useState([]);
  const [desempenhoPosicao, setDesempenhoPosicao] = useState([]);
  const [passesPorAtleta, setPassesPorAtleta] = useState([]);
  const [levantamentosPorAtleta, setLevantamentosPorAtleta] = useState([]);
  const [defesasPorAtleta, setDefesasPorAtleta] = useState([]);
  const [ranking, setRanking]     = useState([]);
  const [adversarioNome, setAdversarioNome] = useState('Adversário');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [selectedChart, setSelectedChart] = useState('evolucao');
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);

  async function carregar() {
    if (!jogoId) {
      setErro('Jogo não informado na URL.');
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro('');
    try {
      const [resJogo, resSets, resAcoes, times] = await Promise.all([
        apiRequest(`/matches/${jogoId}`),
        apiRequest(`/matches/${jogoId}/sets`),
        apiRequest(`/matches/${jogoId}/acoes`),
        listarTimes()
      ]);

      const jogoCarregado = resJogo.jogo;
      setJogo(jogoCarregado);

      const nomeAdv = times.find(t => t.id === jogoCarregado.time_adversario_id)?.name;
      setAdversarioNome(nomeAdv || 'Adversário');

      const setIdParaNumero = {};
      (resSets.sets || []).forEach(s => { setIdParaNumero[s.id] = s.set_number; });

      const acoesCarregadas = resAcoes.acoes || [];
      setAcoes(acoesCarregadas);
      setEvolucaoSets(calcularEvolucaoSets(acoesCarregadas, setIdParaNumero));
      setFundamentos(calcularFundamentos(acoesCarregadas));
      setFundamentosNaoPontuam(calcularFundamentosNaoPontuam(acoesCarregadas));
      setDesempenhoPosicao(calcularDesempenhoPosicao(acoesCarregadas));

      // busca nomes/posições reais dos atletas do time pra montar o ranking
      // e os gráficos individuais de passes, levantamentos e defesas
      const jogadores = jogoCarregado.time_id ? await listarJogadores(jogoCarregado.time_id) : [];
      const nomesJogadores = {};
      const posicoesJogadores = {};
      jogadores.forEach(j => { nomesJogadores[j.id] = j.name; posicoesJogadores[j.id] = j.position; });

      setRanking(calcularRanking(acoesCarregadas, nomesJogadores, posicoesJogadores));
      setPassesPorAtleta(calcularPorAtleta(acoesCarregadas, 'recepcao', nomesJogadores));
      setLevantamentosPorAtleta(calcularPorAtleta(acoesCarregadas, 'levantamento', nomesJogadores));
      setDefesasPorAtleta(calcularPorAtleta(acoesCarregadas, 'defesa', nomesJogadores));
    } catch (err) {
      setErro(err.message || 'Erro ao carregar o jogo');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, [jogoId]);

  // dados agrupados, usados tanto pra montar o gráfico ativo quanto o PDF
  const dadosGraficos = {
    evolucaoSets,
    fundamentos,
    fundamentosNaoPontuam,
    passes: passesPorAtleta,
    levantamentos: levantamentosPorAtleta,
    defesas: defesasPorAtleta,
    desempenhoPosicao,
  };

  // renderiza só o gráfico selecionado no seletor
  useEffect(() => {
    if (!canvasRef.current || carregando) return;

    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const cfg = construirConfigGrafico(selectedChart, 'escuro', dadosGraficos);
    if (!cfg) return;

    chartRef.current = new Chart(canvasRef.current, cfg);

    // força um recálculo de tamanho logo após montar — evita que a última
    // categoria do gráfico fique cortada na borda do card em algumas trocas
    // de aba, quando o canvas é medido antes do layout terminar de acomodar
    const raf = requestAnimationFrame(() => { chartRef.current?.resize(); });

    return () => {
      cancelAnimationFrame(raf);
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    };
  }, [
    selectedChart, carregando,
    evolucaoSets, fundamentos, fundamentosNaoPontuam,
    passesPorAtleta, levantamentosPorAtleta, defesasPorAtleta, desempenhoPosicao,
  ]);

  function temDados(id) {
    switch (id) {
      case 'evolucao':       return evolucaoSets.length > 0;
      case 'fundamentos':    return fundamentos.some(f => f.acertos + f.erros > 0);
      case 'fundamentosNao': return fundamentosNaoPontuam.some(f => f.acertos + f.erros > 0);
      case 'passes':         return passesPorAtleta.length > 0;
      case 'levantamentos':  return levantamentosPorAtleta.length > 0;
      case 'defesas':        return defesasPorAtleta.length > 0;
      case 'posicao':        return desempenhoPosicao.length > 0;
      default:                return false;
    }
  }

  async function handleExcluir() {
    const confirmar = window.confirm('Tem certeza que deseja excluir este jogo?');
    if (!confirmar) return;

    try {
      await apiRequest(`/matches/${jogoId}`, { method: 'DELETE' });
      window.location.hash = '#/app/jogos';
    } catch (err) {
      alert(err.message || 'Erro ao excluir jogo');
    }
  }

  async function handleGerarRelatorio() {
    if (gerandoRelatorio) return;
    setGerandoRelatorio(true);
    try {
      // renderiza (fora da tela) a imagem de todos os gráficos que têm dados,
      // independente de qual está selecionado no momento
      const graficosParaPdf = [];
      for (const def of CHART_DEFS) {
        const cfg = construirConfigGrafico(def.id, 'claro', dadosGraficos);
        if (!cfg) continue;
        const imagem = await renderizarGraficoOffscreen(cfg);
        graficosParaPdf.push({ titulo: def.titulo, imagem });
      }

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const larguraPagina = doc.internal.pageSize.getWidth();
      const margem = 15;
      let y = 18;

      // cabeçalho
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Relatório de Desempenho', margem, y);
      y += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Adversário: ${adversarioNome}`, margem, y);
      y += 6;
      doc.text(`Data: ${formatarData(jogo.data_jogo)}`, margem, y);
      y += 6;
      doc.text(`Placar: ${jogo.home_score ?? 0} x ${jogo.away_score ?? 0}`, margem, y);
      if (jogo.resultado_final) {
        doc.text(`Resultado: ${jogo.resultado_final === 'vitoria' ? 'Vitória' : 'Derrota'}`, margem + 70, y);
      }
      y += 10;

      // gráficos — grade de 2 colunas, quebrando de página quando necessário
      const larguraGrafico = (larguraPagina - margem * 2 - 6) / 2;
      const alturaGrafico = larguraGrafico * 0.62;
      let coluna = 0;

      graficosParaPdf.forEach(grafico => {
        if (coluna === 0 && y + alturaGrafico + 10 > 280) {
          doc.addPage();
          y = 18;
        }

        const x = margem + coluna * (larguraGrafico + 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(grafico.titulo, x, y);
        doc.addImage(grafico.imagem, 'PNG', x, y + 2, larguraGrafico, alturaGrafico);

        if (coluna === 1) {
          coluna = 0;
          y += alturaGrafico + 12;
        } else {
          coluna = 1;
        }
      });
      if (coluna === 1) y += alturaGrafico + 12;

      // ranking de atletas
      if (y > 260) { doc.addPage(); y = 18; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Ranking de Atletas', margem, y);
      y += 7;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('#', margem, y);
      doc.text('Atleta', margem + 10, y);
      doc.text('Posição', margem + 85, y);
      doc.text('Acertos', margem + 120, y);
      doc.text('Erros', margem + 145, y);
      doc.text('Aprov.', margem + 168, y);
      y += 2;
      doc.setDrawColor(200);
      doc.line(margem, y, larguraPagina - margem, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      ranking.forEach((atleta, index) => {
        if (y > 280) { doc.addPage(); y = 18; }
        doc.text(`${index + 1}º`, margem, y);
        doc.text(atleta.nome, margem + 10, y);
        doc.text(atleta.posicao, margem + 85, y);
        doc.text(String(atleta.acertos), margem + 120, y);
        doc.text(String(atleta.erros), margem + 145, y);
        doc.text(`${atleta.aproveitamento}%`, margem + 168, y);
        y += 6;
      });

      doc.save(`relatorio-${adversarioNome.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } catch (err) {
      alert(err.message || 'Erro ao gerar relatório');
    } finally {
      setGerandoRelatorio(false);
    }
  }

  if (carregando) {
    return (
      <div className="pagina-app">
        <div className="titulo-wrapper"><h1 className="titulo-pagina">Jogos</h1></div>
        <main className="conteudo">
          <CarregandoJogo />
        </main>
      </div>
    );
  }

  if (erro || !jogo) {
    return (
      <div className="pagina-app">
        <div className="titulo-wrapper"><h1 className="titulo-pagina">Jogos</h1></div>
        <main className="conteudo">
          <p style={{ color: '#ff6b7a' }}>{erro || 'Jogo não encontrado.'}</p>
        </main>
        <footer className="rodape">
          <a href="#/app/jogos" className="botao-voltar">
            <img src={voltarImg} className="icone-voltar" />
            Voltar
          </a>
        </footer>
      </div>
    );
  }

  const chartAtivo = CHART_DEFS.find(c => c.id === selectedChart);

  return (
    <div className="pagina-app">
      <div className="titulo-wrapper">
        <h1 className="titulo-pagina">Jogos</h1>
      </div>

      <main className="conteudo">

        <div className="jogo-topo">
          <div className="jogo-info">
            <span className="jogo-adversario">{adversarioNome}</span>
            <div className="jogo-meta">
              <span className="jogo-data">{formatarData(jogo.data_jogo)}</span>
              <span className="jogo-placar">
                {jogo.home_score ?? 0} <span className="x">×</span> {jogo.away_score ?? 0}
              </span>
              {jogo.resultado_final && (
                <span className={`jogo-resultado jogo-resultado--${jogo.resultado_final}`}>
                  {jogo.resultado_final === 'vitoria' ? 'Vitória' : 'Derrota'}
                </span>
              )}
            </div>
          </div>
          <div className="jogo-acoes">
            <button className="btn-relatorio" onClick={handleGerarRelatorio} disabled={gerandoRelatorio}>
              <img src={relatorioImg} className="icone-relatorio" />
              {gerandoRelatorio ? 'Gerando…' : 'Gerar Relatório'}
            </button>
            <button className="btn-excluir" id="btnExcluir" onClick={handleExcluir}>
              <img src={lixeiraImg} className="icone-lixo" />
              Excluir jogo
            </button>
          </div>
        </div>

        <div className="grade-principal">

          {/* Central de gráficos — seletor de cartões + gráfico ativo */}
          <div className="card card-grafico card-hub">
            <div className="card-titulo card-titulo--hub">
              <span>Análise Gráfica</span>
              {chartAtivo && <span className="card-subtitulo-hub">{chartAtivo.subtitulo}</span>}
            </div>

            <div className="grafico-seletor" role="tablist" aria-label="Selecionar gráfico">
              {CHART_DEFS.map(def => (
                <button
                  key={def.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedChart === def.id}
                  className={`grafico-tile grafico-tile--${def.cor}${selectedChart === def.id ? ' grafico-tile--ativo' : ''}`}
                  onClick={() => setSelectedChart(def.id)}
                >
                  <span className="grafico-tile-texto">
                    <span className="grafico-tile-titulo">{def.titulo}</span>
                    <span className="grafico-tile-tipo">{NOME_TIPO_GRAFICO[def.tipo]}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="grafico-wrapper">
              {acoes.length === 0 ? (
                <p className="grafico-vazio">Nenhuma ação de scout registrada neste jogo ainda.</p>
              ) : !temDados(selectedChart) ? (
                <p className="grafico-vazio">Sem dados suficientes para este gráfico ainda.</p>
              ) : (
                <canvas ref={canvasRef}></canvas>
              )}
            </div>
          </div>

          {/* Ranking de atletas */}
          <div className="card card-ranking">
            <div className="card-titulo">
              <span>Ranking de Atletas</span>
            </div>
            <div className="ranking-lista">
              {ranking.length === 0 && (
                <p className="grafico-vazio">Nenhum atleta com ações registradas.</p>
              )}
              {ranking.map((atleta, index) => (
                <div key={atleta.jogadorId} className={`ranking-item${index === 0 ? ' ranking-item--destaque' : ''}`}>
                  <span className="ranking-posicao-num">{index + 1}º</span>
                  <div className="ranking-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div className="ranking-info">
                    <span className="ranking-nome">{atleta.nome}</span>
                    <span className="ranking-detalhe">{atleta.posicao} · {atleta.acertos}A / {atleta.erros}E</span>
                  </div>
                  <span className="ranking-aproveitamento">{atleta.aproveitamento}%</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </main>

      <footer className="rodape">
        <a href="#/app/jogos" className="botao-voltar">
          <img src={voltarImg} className="icone-voltar" />
          Voltar
        </a>
      </footer>
    </div>
  );
}