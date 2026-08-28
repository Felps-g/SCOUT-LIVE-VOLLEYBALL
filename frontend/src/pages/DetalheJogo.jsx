import { useEffect, useRef, useState } from 'react';
import '../../css/detalhe-jogos.css';
import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';
import lixeiraImg from '../assets/IMG/lixeira.png';
import voltarImg from '../assets/IMG/voltar.png';
import relatorioImg from '../assets/IMG/relatorio.png'; // adicionar este arquivo em src/assets/IMG
import { apiRequest } from '../services/api.js';
import { listarTimes, listarJogadores } from '../services/time.js';
import {
  formatarData, aproveitamento, calcularEvolucaoSets, calcularFundamentos,
  calcularFundamentosNaoPontuam, calcularDesempenhoPosicao, calcularRanking,
  COR_ACERTO, COR_ACERTO_FUNDO, COR_ERRO, COR_ERRO_FUNDO, COR_DOURADO, OPCOES_BASE
} from '../utils/estatisticasJogo.js';

export default function DetalheJogo() {
  const evolucaoCanvasRef    = useRef(null);
  const evolucaoChartRef     = useRef(null);
  const fundamentosCanvasRef = useRef(null);
  const fundamentosChartRef  = useRef(null);
  const fundamentosNaoCanvasRef = useRef(null);
  const fundamentosNaoChartRef  = useRef(null);
  const posicaoCanvasRef     = useRef(null);
  const posicaoChartRef      = useRef(null);

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
  const [ranking, setRanking]     = useState([]);
  const [adversarioNome, setAdversarioNome] = useState('Adversário');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

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
      const jogadores = jogoCarregado.time_id ? await listarJogadores(jogoCarregado.time_id) : [];
      const nomesJogadores = {};
      const posicoesJogadores = {};
      jogadores.forEach(j => { nomesJogadores[j.id] = j.name; posicoesJogadores[j.id] = j.position; });

      setRanking(calcularRanking(acoesCarregadas, nomesJogadores, posicoesJogadores));
    } catch (err) {
      setErro(err.message || 'Erro ao carregar o jogo');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, [jogoId]);

  // gráfico 1 — evolução do aproveitamento por set
  useEffect(() => {
    if (!evolucaoCanvasRef.current || carregando || evolucaoSets.length === 0) return;

    if (evolucaoChartRef.current) evolucaoChartRef.current.destroy();

    evolucaoChartRef.current = new Chart(evolucaoCanvasRef.current, {
      type: 'line',
      data: {
        labels: evolucaoSets.map(s => `Set ${s.numero}`),
        datasets: [
          {
            label: 'Aproveitamento (%)',
            data: evolucaoSets.map(s => s.aproveitamento),
            borderColor: COR_ACERTO,
            backgroundColor: COR_ACERTO_FUNDO,
            pointBackgroundColor: COR_ACERTO,
            borderWidth: 2,
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        ...OPCOES_BASE,
        scales: {
          ...OPCOES_BASE.scales,
          y: { ...OPCOES_BASE.scales.y, suggestedMax: 100, ticks: { ...OPCOES_BASE.scales.y.ticks, callback: v => `${v}%` } },
        },
      },
    });

    return () => { if (evolucaoChartRef.current) evolucaoChartRef.current.destroy(); };
  }, [evolucaoSets, carregando]);

  // gráfico 2 — acertos x erros por fundamento
  useEffect(() => {
    if (!fundamentosCanvasRef.current || carregando || fundamentos.length === 0) return;

    if (fundamentosChartRef.current) fundamentosChartRef.current.destroy();

    fundamentosChartRef.current = new Chart(fundamentosCanvasRef.current, {
      type: 'bar',
      data: {
        labels: fundamentos.map(f => f.fundamento),
        datasets: [
          {
            label: 'Acertos',
            data: fundamentos.map(f => f.acertos),
            backgroundColor: COR_ACERTO_FUNDO,
            borderColor: COR_ACERTO,
            borderWidth: 1,
            borderRadius: 5,
          },
          {
            label: 'Erros',
            data: fundamentos.map(f => f.erros),
            backgroundColor: COR_ERRO_FUNDO,
            borderColor: COR_ERRO,
            borderWidth: 1,
            borderRadius: 5,
          },
        ],
      },
      options: OPCOES_BASE,
    });

    return () => { if (fundamentosChartRef.current) fundamentosChartRef.current.destroy(); };
  }, [fundamentos, carregando]);

  // gráfico 2b — acertos x erros por fundamento (não pontuam)
  useEffect(() => {
    if (!fundamentosNaoCanvasRef.current || carregando || fundamentosNaoPontuam.length === 0) return;

    if (fundamentosNaoChartRef.current) fundamentosNaoChartRef.current.destroy();

    fundamentosNaoChartRef.current = new Chart(fundamentosNaoCanvasRef.current, {
      type: 'bar',
      data: {
        labels: fundamentosNaoPontuam.map(f => f.fundamento),
        datasets: [
          {
            label: 'Acertos',
            data: fundamentosNaoPontuam.map(f => f.acertos),
            backgroundColor: COR_ACERTO_FUNDO,
            borderColor: COR_ACERTO,
            borderWidth: 1,
            borderRadius: 5,
          },
          {
            label: 'Erros',
            data: fundamentosNaoPontuam.map(f => f.erros),
            backgroundColor: COR_ERRO_FUNDO,
            borderColor: COR_ERRO,
            borderWidth: 1,
            borderRadius: 5,
          },
        ],
      },
      options: OPCOES_BASE,
    });

    return () => { if (fundamentosNaoChartRef.current) fundamentosNaoChartRef.current.destroy(); };
  }, [fundamentosNaoPontuam, carregando]);

  // gráfico 3 — % de aproveitamento por posição (barra)
  useEffect(() => {
    if (!posicaoCanvasRef.current || carregando || desempenhoPosicao.length === 0) return;

    if (posicaoChartRef.current) posicaoChartRef.current.destroy();

    posicaoChartRef.current = new Chart(posicaoCanvasRef.current, {
      type: 'bar',
      data: {
        labels: desempenhoPosicao.map(p => p.posicao),
        datasets: [
          {
            label: 'Aproveitamento (%)',
            data: desempenhoPosicao.map(p => p.aproveitamento),
            backgroundColor: COR_DOURADO,
            borderColor: 'rgba(255, 200, 50, 1)',
            borderWidth: 1,
            borderRadius: 5,
          },
        ],
      },
      options: {
        ...OPCOES_BASE,
        plugins: { legend: { display: false } },
        scales: {
          ...OPCOES_BASE.scales,
          y: { ...OPCOES_BASE.scales.y, suggestedMax: 100, ticks: { ...OPCOES_BASE.scales.y.ticks, callback: v => `${v}%` } },
        },
      },
    });

    return () => { if (posicaoChartRef.current) posicaoChartRef.current.destroy(); };
  }, [desempenhoPosicao, carregando]);

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

  function handleGerarRelatorio() {
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

    // gráficos (captura os canvases já renderizados na tela)
    const larguraGrafico = (larguraPagina - margem * 2 - 6) / 2;
    const alturaGrafico = larguraGrafico * 0.62;

    function adicionarGrafico(canvasRef, titulo, x, yPos) {
      if (!canvasRef.current) return;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(titulo, x, yPos);
      const imagem = canvasRef.current.toDataURL('image/png', 1.0);
      doc.addImage(imagem, 'PNG', x, yPos + 2, larguraGrafico, alturaGrafico);
    }

    adicionarGrafico(evolucaoCanvasRef, 'Evolução por Set', margem, y);
    adicionarGrafico(fundamentosCanvasRef, 'Fundamentos (pontuam)', margem + larguraGrafico + 6, y);
    y += alturaGrafico + 12;

    adicionarGrafico(posicaoCanvasRef, 'Aproveitamento por Posição', margem, y);
    adicionarGrafico(fundamentosNaoCanvasRef, 'Fundamentos (não pontuam)', margem + larguraGrafico + 6, y);
    y += alturaGrafico + 14;

    // ranking de atletas
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
  }

  if (carregando) {
    return (
      <div className="pagina-app">
        <div className="titulo-wrapper"><h1 className="titulo-pagina">Jogos</h1></div>
        <main className="conteudo">
          <p style={{ color: '#fff', opacity: 0.7 }}>Carregando jogo…</p>
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
            <button className="btn-relatorio" onClick={handleGerarRelatorio}>
              <img src={relatorioImg} className="icone-relatorio" />
              Gerar Relatório
            </button>
            <button className="btn-excluir" id="btnExcluir" onClick={handleExcluir}>
              <img src={lixeiraImg} className="icone-lixo" />
              Excluir jogo
            </button>
          </div>
        </div>

        <div className="grade-principal">

          {/* Gráfico 1 — evolução por set */}
          <div className="card card-grafico card-evolucao">
            <div className="card-titulo">
              <span>Evolução do aproveitamento por Set</span>
            </div>
            <div className="grafico-wrapper">
              {acoes.length === 0
                ? <p className="grafico-vazio">Nenhuma ação de scout registrada neste jogo ainda.</p>
                : <canvas ref={evolucaoCanvasRef}></canvas>}
            </div>
          </div>

          {/* Gráfico 2 — fundamentos que pontuam */}
          <div className="card card-grafico card-fundamentos">
            <div className="card-titulo">
              <span>Acertos × Erros por Fundamento</span>
            </div>
            <div className="grafico-wrapper">
              {acoes.length === 0
                ? <p className="grafico-vazio">Sem dados suficientes.</p>
                : <canvas ref={fundamentosCanvasRef}></canvas>}
            </div>
          </div>

          {/* Gráfico 2b — fundamentos que não pontuam */}
          <div className="card card-grafico card-fundamentos-nao">
            <div className="card-titulo">
              <span>Fundamentos que não pontuam</span>
            </div>
            <div className="grafico-wrapper">
              {acoes.length === 0
                ? <p className="grafico-vazio">Sem dados suficientes.</p>
                : <canvas ref={fundamentosNaoCanvasRef}></canvas>}
            </div>
          </div>

          {/* Gráfico 3 — posição */}
          <div className="card card-grafico card-posicao">
            <div className="card-titulo">
              <span>Aproveitamento por Posição</span>
            </div>
            <div className="grafico-wrapper">
              {desempenhoPosicao.length === 0
                ? <p className="grafico-vazio">Sem dados suficientes.</p>
                : <canvas ref={posicaoCanvasRef}></canvas>}
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