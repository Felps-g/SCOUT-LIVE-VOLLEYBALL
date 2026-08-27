import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../../css/scoutlive.css';
import { apiRequest } from '../services/api.js';
import { getTimeSelecionado, listarJogadores, listarTimes, criarTime } from '../services/time.js';

/* ── ÍCONES SVG INLINE ─────────────────────────────────── */

const IcSave = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

const IcSwap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9"/>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
    <polyline points="7 23 3 19 7 15"/>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>
);

const IcCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IcX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IcHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IcPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const IcMinus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

/* ── REGRAS DE POSIÇÃO / FUNDAMENTOS ───────────────────── */

// ordem de exibição dos botões de posição na escalação
const POSICOES = ['Levantador', 'Oposto', 'Ponteiro', 'Central', 'Libero'];

// quantos titulares de cada posição uma escalação válida precisa ter
const POSICOES_REQUERIDAS = { Levantador: 1, Oposto: 1, Ponteiro: 2, Central: 2, Libero: 1 };

const TOTAL_TITULARES = Object.values(POSICOES_REQUERIDAS).reduce((a, b) => a + b, 0); // 7

// nome de exibição (Líbero tem acento, mas a chave interna fica sem para simplificar)
const NOME_POSICAO = { Levantador: 'Levantador', Oposto: 'Oposto', Ponteiro: 'Ponteiro', Central: 'Central', Libero: 'Líbero' };

// fundamentos que geram ponto, por posição
const FUNDAMENTOS_PONTUAM = {
  Levantador: ['Saque', 'Bloqueio', 'Ataque'],
  Ponteiro:   ['Ataque', 'Saque', 'Bloqueio'],
  Oposto:     ['Ataque', 'Saque', 'Bloqueio'],
  Central:    ['Ataque', 'Saque', 'Bloqueio'],
  Libero:     [],
};

// fundamentos que não geram ponto, por posição
// (recepção, defesa e levantamento valem pra todas as posições em quadra)
const FUNDAMENTOS_NAO_PONTUAM = {
  Levantador: ['Recepção', 'Defesa', 'Levantamento'],
  Libero:     ['Recepção', 'Defesa', 'Levantamento'],
  Ponteiro:   ['Recepção', 'Defesa', 'Levantamento'],
  Oposto:     ['Recepção', 'Defesa', 'Levantamento'],
  Central:    ['Recepção', 'Defesa', 'Levantamento'],
};

// todos os fundamentos de uma posição, na ordem em que devem aparecer no card
function fundamentosDaPosicao(posicao) {
  return [...(FUNDAMENTOS_PONTUAM[posicao] || []), ...(FUNDAMENTOS_NAO_PONTUAM[posicao] || [])];
}

/* ── HELPERS ────────────────────────────────────────────── */

// número de cadastro (camisa) do jogador, direto do cadastro do atleta
function cadastroDoJogador(j) {
  return j?.jersey_number ?? j?.number ?? j?.numero ?? j?.camisa ?? '—';
}

// quebra o nome completo cadastrado em partes (ex: "João Lucas Pereira" -> ["João","Lucas","Pereira"])
function partesDoNome(nomeCompleto) {
  return (nomeCompleto || '').trim().split(/\s+/).filter(Boolean);
}

// monta o mapa { jogadorId: nomeCurto } exibido nas telas: só primeiro e
// segundo nome do cadastro; se dois atletas do time tiverem o mesmo primeiro
// e segundo nome, usa a inicial do terceiro nome (sobrenome) pra diferenciar
function montarNomesExibicao(listaJogadores) {
  const grupos = {};
  listaJogadores.forEach(j => {
    const partes = partesDoNome(j.name || j.nome);
    const base = partes.slice(0, 2).join(' ') || 'Atleta';
    if (!grupos[base]) grupos[base] = [];
    grupos[base].push({ id: j.id, partes, base });
  });

  const mapa = {};
  Object.values(grupos).forEach(grupo => {
    const precisaDiferenciar = grupo.length > 1;
    grupo.forEach(({ id, partes, base }) => {
      if (!precisaDiferenciar) {
        mapa[id] = base;
        return;
      }
      const sobrenome = partes[2];
      mapa[id] = sobrenome ? `${base} ${sobrenome[0].toUpperCase()}.` : base;
    });
  });
  return mapa;
}

// graduação da recepção (qualidade do passe), só usada na tabela de desktop:
// A = perfeita, B = boa, C = ruim (mas em jogo), Erro = ponto do adversário
const RECEPCAO_SUBTIPOS = [
  { chave: 'a', rotulo: 'A' },
  { chave: 'b', rotulo: 'B' },
  { chave: 'c', rotulo: 'C' },
  { chave: 'erro', rotulo: 'Erro' },
];

/* ── COMPONENTE: SPINNER DE CARREGANDO ──────────────────── */

function CarregandoAtletas() {
  return (
    <div className="carregando-jogos">
      <motion.div
        className="spinner"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      <span className="carregando-texto">Carregando atletas…</span>
    </div>
  );
}

/* ── COMPONENTE: LINHA DE JOGADOR (tela principal) ──────── */

function LinhaJogador({ titular, fundamentos, contagem, onClick }) {
  return (
    <button type="button" className="linha-jogador" onClick={onClick}>
      <div className="lj-jogador">
        <span className="lj-numero">{titular.numero}</span>
        <div className="lj-nomes">
          <span className="lj-nome">{titular.nome}</span>
          <span className="lj-posicao">{NOME_POSICAO[titular.posicao]}</span>
        </div>
      </div>
      <div className="lj-fundamentos">
        {fundamentos.map(f => {
          const c = contagem(f);
          return (
            <div key={f} className="lj-fundamento">
              <span className="lj-flabel">{f}</span>
              <div className="lj-fpills">
                <span className="lj-fpill lj-fpill--acerto"><IcCheck /> {c.acerto}</span>
                <span className="lj-fpill lj-fpill--erro"><IcX /> {c.erro}</span>
              </div>
            </div>
          );
        })}
      </div>
    </button>
  );
}

/* ── COMPONENTE: CÉLULA DE CONTADOR (tabela de desktop) ─── */

function CelulaContador({ valor, onMais, onMenos, cor }) {
  return (
    <div className="cc">
      <button type="button" className={`cc-btn cc-btn--${cor}`} onClick={onMais} aria-label="adicionar">
        <IcPlus />
      </button>
      <span className="cc-valor">{valor}</span>
      <button type="button" className={`cc-btn cc-btn--${cor}`} onClick={onMenos} disabled={valor === 0} aria-label="remover">
        <IcMinus />
      </button>
    </div>
  );
}

/* ── COMPONENTE PRINCIPAL ───────────────────────────────── */

export default function ScoutLive() {
  // fixo assim que a página abre — trocar de equipe agora só é feito na
  // tela de Equipes; aqui é só leitura
  const [timeAtual] = useState(getTimeSelecionado());
  const [jogadores, setJogadores] = useState([]);
  const [carregandoJogadores, setCarregandoJogadores] = useState(false);
  const [erroJogadores, setErroJogadores] = useState('');

  /* ── ESCALAÇÃO ── */
  const [escalacaoAberta, setEscalacaoAberta]     = useState(true);
  const [selecoes, setSelecoes]                   = useState({}); // { jogadorId: 'Ponteiro' }
  const [titulares, setTitulares]                 = useState([]); // [{id,nome,numero,posicao}]

  /* ── SCOUT ── */
  const [setAtual, setSetAtual] = useState(1);
  const [dados, setDados]       = useState({}); // dados[jogadorId][set] = { acerto, erro, eventos:[] }
  const [jogadorAberto, setJogadorAberto] = useState(null); // id do titular com modal de fundamentos aberto

  /* ── TROCA ── */
  const [trocaAberta, setTrocaAberta] = useState(false);
  const [trocaSai, setTrocaSai]       = useState(null);
  const [trocaEntra, setTrocaEntra]   = useState(null);

  /* ── SALVAR SCOUT ── */
  const [salvarAberto, setSalvarAberto] = useState(false);
  const [mData, setMData]               = useState('');
  const [mAdv, setMAdv]                 = useState('');
  const [mPlacarNos, setMPlacarNos]     = useState('');
  const [mPlacarAdv, setMPlacarAdv]     = useState('');
  const [mResultado, setMResultado]     = useState(''); // 'vitoria' | 'derrota'
  const [errosForm, setErrosForm]       = useState([]);

  // fases do modal de salvar: 'form' (preenchendo) -> 'salvando' (barra de
  // progresso) -> 'sucesso' (mensagem final com as duas opções)
  const [faseSalvar, setFaseSalvar]     = useState('form');
  const [progresso, setProgresso]       = useState(0);
  const [matchIdSalvo, setMatchIdSalvo] = useState(null);
  const salvando = faseSalvar === 'salvando';
  const progressoIntervalRef = useRef(null);

  /* busca os jogadores reais do time selecionado */
  async function carregarJogadores(time) {
    if (!time) {
      setJogadores([]);
      return;
    }
    setCarregandoJogadores(true);
    setErroJogadores('');
    try {
      const lista = await listarJogadores(time.id);
      setJogadores(lista || []);
    } catch (err) {
      setErroJogadores(err.message || 'Erro ao buscar atletas do time');
    } finally {
      setCarregandoJogadores(false);
    }
  }

  useEffect(() => {
    if (timeAtual) carregarJogadores(timeAtual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // número exibido ao lado do nome: sempre o número de cadastro do atleta
  // (campo jersey_number, preenchido no cadastro do jogador); só cai pra
  // ordem no elenco se o atleta não tiver número de cadastro salvo
  const numerosMap = useMemo(() => {
    const mapa = {};
    jogadores.forEach((j, i) => {
      mapa[j.id] = j.jersey_number ?? j.number ?? j.numero ?? j.camisa ?? (i + 1);
    });
    return mapa;
  }, [jogadores]);

  // nome curto exibido nas telas (primeiro + segundo nome do cadastro,
  // com a inicial do sobrenome quando dois atletas do time têm o mesmo)
  const nomesExibicaoMap = useMemo(() => montarNomesExibicao(jogadores), [jogadores]);

  /* ── ESCALAÇÃO: seleção de posição por jogador ── */
  const contagemPorPosicao = useMemo(() => {
    const c = { Levantador: 0, Oposto: 0, Ponteiro: 0, Central: 0, Libero: 0 };
    Object.values(selecoes).forEach(pos => { c[pos] = (c[pos] || 0) + 1; });
    return c;
  }, [selecoes]);

  const totalSelecionados = Object.keys(selecoes).length;
  const podeIniciar = totalSelecionados === TOTAL_TITULARES;

  function togglePosicao(jogadorId, posicao) {
    setSelecoes(prev => {
      const atual = { ...prev };
      if (atual[jogadorId] === posicao) {
        delete atual[jogadorId];
        return atual;
      }
      const jaTemNaPosicao = Object.entries(atual).filter(
        ([id, p]) => p === posicao && id !== jogadorId
      ).length;
      if (jaTemNaPosicao >= POSICOES_REQUERIDAS[posicao]) return prev; // vaga cheia
      atual[jogadorId] = posicao;
      return atual;
    });
  }

  function iniciarScout() {
    if (!podeIniciar) return;
    const lista = Object.entries(selecoes).map(([id, posicao]) => {
      const j = jogadores.find(x => x.id === id);
      return { id, nome: nomesExibicaoMap[id] || 'Atleta', numero: numerosMap[id], posicao };
    }).sort((a, b) => a.numero - b.numero);

    setTitulares(lista);
    setEscalacaoAberta(false);
  }

  /* ── BANCO (reservas disponíveis para troca) ── */
  const banco = useMemo(() => {
    const idsEmQuadra = new Set(titulares.map(t => t.id));
    return jogadores
      .filter(j => !idsEmQuadra.has(j.id))
      .map(j => ({ id: j.id, nome: nomesExibicaoMap[j.id] || 'Atleta', numero: numerosMap[j.id] }))
      .sort((a, b) => a.numero - b.numero);
  }, [jogadores, titulares, numerosMap, nomesExibicaoMap]);

  /* ── MARCAÇÃO DE FUNDAMENTOS ──
     tipo pode ser 'acerto'/'erro' (saque, ataque, bloqueio, defesa, levantamento)
     ou 'a'/'b'/'c'/'erro' (recepção, só na tabela de desktop) */
  function ajustarContagem(jogadorId, fundamento, tipo, delta) {
    setDados(prev => {
      const d = { ...prev };
      d[jogadorId] = { ...(d[jogadorId] || {}) };
      const atualDoSet = d[jogadorId][setAtual] || { acerto: 0, erro: 0, eventos: [] };
      let eventos = [...atualDoSet.eventos];

      if (delta > 0) {
        eventos.push({ fundamento, tipo });
      } else {
        for (let i = eventos.length - 1; i >= 0; i--) {
          if (eventos[i].fundamento === fundamento && eventos[i].tipo === tipo) {
            eventos.splice(i, 1);
            break;
          }
        }
      }

      d[jogadorId][setAtual] = {
        acerto: eventos.filter(e => e.tipo !== 'erro').length,
        erro: eventos.filter(e => e.tipo === 'erro').length,
        eventos,
      };
      return d;
    });
  }

  // usado pelo modal do celular: marca uma vez e fecha o modal
  function marcar(jogadorId, fundamento, tipo) {
    ajustarContagem(jogadorId, fundamento, tipo, 1);
    setJogadorAberto(null);
  }

  // acertos/erros de UM fundamento específico, dentro do set atual
  // (qualquer tipo diferente de 'erro' conta como acerto — cobre tanto o
  // 'acerto' genérico do modal do celular quanto o a/b/c da recepção)
  function getContagemFundamento(jogadorId, fundamento) {
    const eventos = dados?.[jogadorId]?.[setAtual]?.eventos || [];
    let acerto = 0, erro = 0;
    eventos.forEach(ev => {
      if (ev.fundamento === fundamento) {
        if (ev.tipo === 'erro') erro += 1; else acerto += 1;
      }
    });
    return { acerto, erro };
  }

  // contagem de UM subtipo específico dentro de um fundamento (usado na
  // tabela de desktop: acerto/erro simples, ou a/b/c/erro da recepção)
  function contagemSub(jogadorId, fundamento, tipo) {
    const eventos = dados?.[jogadorId]?.[setAtual]?.eventos || [];
    return eventos.filter(ev => ev.fundamento === fundamento && ev.tipo === tipo).length;
  }

  // par de células Acerto/Erro de um fundamento simples na tabela de desktop;
  // vira "–" quando a posição do jogador não tem esse fundamento
  function celulasBinarias(titular, fundamento) {
    const aplicavel = fundamentosDaPosicao(titular.posicao).includes(fundamento);
    if (!aplicavel) {
      return (
        <>
          <td className="td-vazia">–</td>
          <td className="td-vazia col-divisor">–</td>
        </>
      );
    }
    return (
      <>
        <td>
          <CelulaContador
            valor={contagemSub(titular.id, fundamento, 'acerto')}
            onMais={() => ajustarContagem(titular.id, fundamento, 'acerto', 1)}
            onMenos={() => ajustarContagem(titular.id, fundamento, 'acerto', -1)}
            cor="verde"
          />
        </td>
        <td className="col-divisor">
          <CelulaContador
            valor={contagemSub(titular.id, fundamento, 'erro')}
            onMais={() => ajustarContagem(titular.id, fundamento, 'erro', 1)}
            onMenos={() => ajustarContagem(titular.id, fundamento, 'erro', -1)}
            cor="vermelho"
          />
        </td>
      </>
    );
  }

  // as 4 células da recepção (A / B / C / Erro) na tabela de desktop
  function celulasRecepcao(titular) {
    const aplicavel = fundamentosDaPosicao(titular.posicao).includes('Recepção');
    if (!aplicavel) {
      return RECEPCAO_SUBTIPOS.map(({ chave }) => (
        <td key={chave} className={`td-vazia${chave === 'erro' ? ' col-divisor' : ''}`}>–</td>
      ));
    }
    return RECEPCAO_SUBTIPOS.map(({ chave }) => (
      <td key={chave} className={chave === 'erro' ? 'col-divisor' : undefined}>
        <CelulaContador
          valor={contagemSub(titular.id, 'Recepção', chave)}
          onMais={() => ajustarContagem(titular.id, 'Recepção', chave, 1)}
          onMenos={() => ajustarContagem(titular.id, 'Recepção', chave, -1)}
          cor={chave === 'erro' ? 'vermelho' : 'verde'}
        />
      </td>
    ));
  }

  const titularAberto = titulares.find(t => t.id === jogadorAberto) || null;

  /* ── TROCA ── */
  function abrirTroca() {
    setTrocaSai(null);
    setTrocaEntra(null);
    setTrocaAberta(true);
  }

  function confirmarTroca() {
    if (!trocaSai || !trocaEntra) return;
    setTitulares(prev => {
      const sai = prev.find(t => t.id === trocaSai);
      const entrou = jogadores.find(j => j.id === trocaEntra);
      const novo = {
        id: entrou.id,
        nome: nomesExibicaoMap[entrou.id] || 'Atleta',
        numero: numerosMap[entrou.id],
        posicao: sai.posicao,
      };
      return prev.map(t => (t.id === trocaSai ? novo : t)).sort((a, b) => a.numero - b.numero);
    });
    setTrocaAberta(false);
    setTrocaSai(null);
    setTrocaEntra(null);
  }

  /* ── SALVAR SCOUT ── */
  function abrirSalvar() {
    setMData(new Date().toISOString().split('T')[0]);
    setFaseSalvar('form');
    setProgresso(0);
    setMatchIdSalvo(null);
    setSalvarAberto(true);
  }

  function fecharSalvar() {
    if (faseSalvar === 'salvando') return; // não deixa fechar no meio do salvamento
    if (progressoIntervalRef.current) {
      clearInterval(progressoIntervalRef.current);
      progressoIntervalRef.current = null;
    }
    setSalvarAberto(false);
    setMAdv(''); setMPlacarNos(''); setMPlacarAdv(''); setMResultado(''); setErrosForm([]);
    setFaseSalvar('form');
    setProgresso(0);
    setMatchIdSalvo(null);
  }

  // fecha o modal e volta o técnico pra tela de início (dashboard)
  function finalizarSalvar() {
    fecharSalvar();
    window.location.hash = '#/';
  }

  // fecha o modal e leva o técnico direto pros detalhes do jogo salvo
  function verDetalhesSalvar() {
    const id = matchIdSalvo;
    fecharSalvar();
    if (id) window.location.hash = `#/app/jogos/detalhes?id=${id}`;
  }

  // mapeia o nome do fundamento (como aparece na tela) pro tipo_acao que a API espera
  const TIPO_ACAO_POR_FUNDAMENTO = {
    Saque: 'saque',
    Recepção: 'recepcao',
    Levantamento: 'levantamento',
    Ataque: 'ataque',
    Bloqueio: 'bloqueio',
    Defesa: 'defesa',
  };

  // o adversário aqui é só um nome digitado, mas o banco exige um
  // away_team_id real (uuid de um time cadastrado) — reaproveita um time
  // já existente com esse nome ou cria um novo (mesma lógica usada antes
  // desta tela ganhar a Escalação).
  async function resolverTimeAdversario(nome) {
    const nomeNormalizado = nome.trim().toLowerCase();
    const times = await listarTimes();
    const existente = times.find(t => (t.name || '').trim().toLowerCase() === nomeNormalizado);
    if (existente) return existente.id;
    const novo = await criarTime(nome.trim());
    return novo.id;
  }

  async function confirmarSalvar() {
    const e = [];
    if (!mData) e.push('data');
    if (!mAdv.trim()) e.push('adv');
    if (mPlacarNos === '') e.push('placarNos');
    if (mPlacarAdv === '') e.push('placarAdv');
    if (!mResultado) e.push('resultado');
    if (e.length) { setErrosForm(e); setTimeout(() => setErrosForm([]), 2000); return; }

    // avança pra tela de progresso e começa a "encher" a barra enquanto as
    // chamadas de API rodam de verdade em segundo plano; ela nunca passa de
    // 90% sozinha — o salto final pra 100% só acontece quando salva de fato
    setFaseSalvar('salvando');
    setProgresso(6);
    progressoIntervalRef.current = setInterval(() => {
      setProgresso(p => (p >= 90 ? p : p + Math.max(1, (90 - p) * 0.12)));
    }, 200);

    try {
      const teamId = timeAtual?.id;
      if (!teamId) throw new Error('Selecione ou crie um time antes de salvar o scout.');

      const awayTeamId = await resolverTimeAdversario(mAdv);

      // cria o jogo (o backend já cria o Set 1 automaticamente)
      const jogo = await apiRequest('/matches/novo', {
        method: 'POST',
        body: {
          home_team_id: teamId,
          away_team_id: awayTeamId,
          match_date: mData
        }
      });
      const matchId = jogo?.jogo?.id;
      if (!matchId) throw new Error('Não foi possível criar o jogo.');

      // descobre quais sets realmente têm ações marcadas (o técnico pode ter
      // usado as abas Set 1-5 durante a partida) e cria os que faltarem —
      // só o Set 1 já existe de fábrica
      const numerosComDados = new Set([1]);
      Object.values(dados).forEach(porSet => {
        Object.keys(porSet).forEach(n => numerosComDados.add(Number(n)));
      });

      const setIdPorNumero = {};
      const setAtualResp = await apiRequest(`/matches/${matchId}/sets/atual`);
      setIdPorNumero[1] = setAtualResp?.set?.id;

      for (const numero of numerosComDados) {
        if (numero === 1) continue;
        const resp = await apiRequest(`/matches/${matchId}/sets`, {
          method: 'POST',
          body: { numero_set: numero }
        });
        setIdPorNumero[numero] = resp?.set?.id;
      }

      // envia cada evento marcado como uma ação de scout
      const promessas = [];
      Object.entries(dados).forEach(([jogadorId, porSet]) => {
        Object.entries(porSet).forEach(([numeroSet, info]) => {
          const setId = setIdPorNumero[Number(numeroSet)];
          if (!setId) return;

          (info.eventos || []).forEach((evento, index) => {
            // recepção usa graduação a/b/c (qualidade do passe) em vez de
            // 'acerto' genérico; qualquer coisa diferente de 'erro' é ponto
            const ehGraduacaoRecepcao = ['a', 'b', 'c'].includes(evento.tipo);
            promessas.push(apiRequest(`/matches/${matchId}/acoes`, {
              method: 'POST',
              body: {
                jogador_id: jogadorId,
                set_id: setId,
                tipo_acao: TIPO_ACAO_POR_FUNDAMENTO[evento.fundamento] || 'ataque',
                resultado: evento.tipo === 'erro' ? 'erro' : 'ponto',
                posicao_jogador: titulares.find(t => t.id === jogadorId)?.posicao || 'desconhecido',
                descricao: ehGraduacaoRecepcao
                  ? `${evento.fundamento} ${evento.tipo.toUpperCase()}`
                  : evento.fundamento,
                action_order: index + 1
              }
            }));
          });
        });
      });

      await Promise.all(promessas);

      // grava o placar final e o resultado escolhido pelo técnico (vitória/derrota)
      await apiRequest(`/matches/${matchId}/finalizar`, {
        method: 'PUT',
        body: {
          resultado_final: mResultado,
          placar_final: `${mPlacarNos}x${mPlacarAdv}`
        }
      });

      // chegou aqui: salvou de verdade — completa a barra até 100%
      if (progressoIntervalRef.current) {
        clearInterval(progressoIntervalRef.current);
        progressoIntervalRef.current = null;
      }
      setProgresso(100);
      setMatchIdSalvo(matchId);

      // encerra a partida e volta para a tela de escalação (por trás do modal)
      setTitulares([]);
      setSelecoes({});
      setDados({});
      setSetAtual(1);
      setEscalacaoAberta(true);

      // pequena pausa pra deixar a barra chegar visualmente aos 100% antes
      // de trocar pra tela de sucesso
      setTimeout(() => setFaseSalvar('sucesso'), 450);
    } catch (err) {
      if (progressoIntervalRef.current) {
        clearInterval(progressoIntervalRef.current);
        progressoIntervalRef.current = null;
      }
      setProgresso(0);
      setFaseSalvar('form');
      alert(err.message || 'Erro ao salvar o scout');
    }
  }

  const ebForm = (id) => errosForm.includes(id) ? { borderColor: 'rgba(232,39,58,0.75)' } : {};

  /* ── RENDER ─────────────────────────────────────────── */
  return (
    <div className="app">

      {/* ── CABEÇALHO ── */}
      <header className="header">
        <div className="titulo">
          <span className="t-scout">SCOUT</span>
          <span className="t-live">LIVE</span>
        </div>
      </header>

      {/* ══════════════════════ ESCALAÇÃO ══════════════════════ */}
      {escalacaoAberta && (
        <div className="escalacao-overlay">
          <div className="escalacao-content">

            <h1 className="escalacao-titulo">Escalação da partida</h1>
            <p className="escalacao-sub">
              Escolha os 7 titulares e a posição de cada um <b>nesse jogo</b>.
            </p>

            <div className="escalacao-time-atual">
              <span className="escalacao-time-atual-rotulo">Equipe</span>
              {timeAtual ? (
                <span className="escalacao-time-atual-nome">{timeAtual.name}</span>
              ) : (
                <span className="escalacao-time-atual-vazio">
                  Nenhuma equipe selecionada — <a href="#/app/equipes">escolha uma na tela de Equipes</a>
                </span>
              )}
            </div>

            <div className="escalacao-contador">
              {totalSelecionados}/{TOTAL_TITULARES} titulares selecionados
            </div>

            <div className="escalacao-lista">
              {carregandoJogadores && <CarregandoAtletas />}
              {erroJogadores && <p className="escalacao-msg escalacao-msg--erro">{erroJogadores}</p>}
              {!carregandoJogadores && !erroJogadores && jogadores.length === 0 && (
                <p className="escalacao-msg">Selecione (ou crie) um time com atletas cadastrados.</p>
              )}

              {jogadores.map(j => {
                const posicaoEscolhida = selecoes[j.id];
                return (
                  <div key={j.id} className={`escalacao-jogador${posicaoEscolhida ? ' selecionado' : ''}`}>
                    <div className="ej-info">
                      <span className={`ej-radio${posicaoEscolhida ? ' marcado' : ''}`} />
                      <div className="ej-textos">
                        <span className="ej-nome">{nomesExibicaoMap[j.id] || j.name || j.nome}</span>
                        <span className="ej-cadastro">cadastro: {cadastroDoJogador(j)}</span>
                      </div>
                    </div>
                    <div className="ej-posicoes">
                      {POSICOES.map(pos => {
                        const ativa = posicaoEscolhida === pos;
                        const cheia = !ativa && contagemPorPosicao[pos] >= POSICOES_REQUERIDAS[pos];
                        return (
                          <button
                            key={pos}
                            type="button"
                            className={`ej-btn-pos${ativa ? ' ativo' : ''}`}
                            disabled={cheia}
                            onClick={() => togglePosicao(j.id, pos)}
                          >
                            {NOME_POSICAO[pos]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <button type="button" className="btn-iniciar-scout" disabled={!podeIniciar} onClick={iniciarScout}>
              Iniciar Scout
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════ TELA DE SCOUT ══════════════════════ */}
      {!escalacaoAberta && (
        <main className="main">
          <div className="topo-scout">
            <div className="scout-tabs">
              <span className="tabs-label">SET</span>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  className={`tab-set${n === setAtual ? ' ativo' : ''}`}
                  onClick={() => setSetAtual(n)}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="scout-acoes-topo">
              <button type="button" className="btn-trocar" onClick={abrirTroca}>
                <IcSwap /> Trocar
              </button>
              <button type="button" className="btn-salvar-scout" onClick={abrirSalvar}>
                <IcSave /> Salvar scout
              </button>
            </div>
          </div>

          {/* ── legenda + lista com modal: só no celular ── */}
          <div className="legenda so-mobile">
            <span className="legenda-item"><i className="ponto ponto--verde" /> pontua</span>
            <span className="legenda-item"><i className="ponto ponto--cinza" /> não pontua</span>
          </div>

          <div className="toque-label so-mobile">Toque no jogador para marcar</div>

          <div className="grade-jogadores so-mobile">
            {titulares.map(t => (
              <LinhaJogador
                key={t.id}
                titular={t}
                fundamentos={fundamentosDaPosicao(t.posicao)}
                contagem={f => getContagemFundamento(t.id, f)}
                onClick={() => setJogadorAberto(t.id)}
              />
            ))}
          </div>

          {/* ── tabela com +/- inline: só no desktop ── */}
          <div className="tabela-scout-wrap so-desktop">
            <div className="tabela-scroll">
              <table className="tabela-scout">
                <thead>
                  <tr className="tabela-grupo-row">
                    <th rowSpan={2} className="th-jogador">Jogador</th>
                    <th colSpan={2}>Saque</th>
                    <th colSpan={4}>Recepção</th>
                    <th colSpan={2}>Ataque</th>
                    <th colSpan={2}>Bloqueio</th>
                    <th colSpan={2}>Defesa</th>
                    <th colSpan={2}>Levantamento</th>
                  </tr>
                  <tr className="tabela-sub-row">
                    <th>Acerto</th><th className="col-divisor">Erro</th>
                    <th>A</th><th>B</th><th>C</th><th className="col-divisor">Erro</th>
                    <th>Acerto</th><th className="col-divisor">Erro</th>
                    <th>Acerto</th><th className="col-divisor">Erro</th>
                    <th>Acerto</th><th className="col-divisor">Erro</th>
                    <th>Acerto</th><th>Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {titulares.map(t => (
                    <tr key={t.id} className="tabela-linha">
                      <td className="td-jogador">
                        <div className="td-jogador-info">
                          <span className="td-jogador-numero">{t.numero}</span>
                          <div className="td-jogador-textos">
                            <span className="td-nome">{t.nome}</span>
                            <span className="td-posicao">{NOME_POSICAO[t.posicao]}</span>
                          </div>
                        </div>
                      </td>
                      {celulasBinarias(t, 'Saque')}
                      {celulasRecepcao(t)}
                      {celulasBinarias(t, 'Ataque')}
                      {celulasBinarias(t, 'Bloqueio')}
                      {celulasBinarias(t, 'Defesa')}
                      {celulasBinarias(t, 'Levantamento')}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* ── RODAPÉ ── */}
      <footer className="footer">
        <a href="#/" className="btn-inicio">
          <IcHome />
          <span>Início</span>
        </a>
      </footer>

      {/* ══════════════════ MODAL: FUNDAMENTOS DO JOGADOR ══════════════════ */}
      <div className={`overlay${titularAberto ? ' open' : ''}`}
           onClick={e => e.target === e.currentTarget && setJogadorAberto(null)}>
        {titularAberto && (
          <div className="modal modal-fundamentos">
            <div className="modal-handle" />
            <div className="mf-header">
              <div>
                <div className="mf-nome">{titularAberto.nome}</div>
                <div className="mf-posicao">{NOME_POSICAO[titularAberto.posicao]}</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setJogadorAberto(null)}>
                <IcX />
              </button>
            </div>

            {FUNDAMENTOS_PONTUAM[titularAberto.posicao]?.length > 0 && (
              <>
                <div className="secao-titulo secao-titulo--verde">Fundamentos que pontuam</div>
                <div className="lista-fundamentos">
                  {FUNDAMENTOS_PONTUAM[titularAberto.posicao].map(f => (
                    <div key={f} className="fundamento-card">
                      <span className="fundamento-nome">{f}</span>
                      <div className="fundamento-botoes">
                        <button type="button" className="fbtn facerto"
                                onClick={() => marcar(titularAberto.id, f, 'acerto')}>
                          <IcCheck /> Acerto
                        </button>
                        <button type="button" className="fbtn ferro"
                                onClick={() => marcar(titularAberto.id, f, 'erro')}>
                          <IcX /> Erro
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="secao-titulo secao-titulo--cinza">Fundamentos que não pontuam</div>
            <div className="lista-fundamentos">
              {FUNDAMENTOS_NAO_PONTUAM[titularAberto.posicao]?.map(f => (
                <div key={f} className="fundamento-card">
                  <span className="fundamento-nome">{f}</span>
                  <div className="fundamento-botoes">
                    <button type="button" className="fbtn facerto"
                            onClick={() => marcar(titularAberto.id, f, 'acerto')}>
                      <IcCheck /> Acerto
                    </button>
                    <button type="button" className="fbtn ferro"
                            onClick={() => marcar(titularAberto.id, f, 'erro')}>
                      <IcX /> Erro
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════ MODAL: TROCA ══════════════════════ */}
      <div className={`overlay${trocaAberta ? ' open' : ''}`}
           onClick={e => e.target === e.currentTarget && setTrocaAberta(false)}>
        {trocaAberta && (
          <div className="modal modal-troca">
            <div className="modal-handle" />
            <div className="mf-header">
              <span className="modal-titulo-simples">Trocar jogador</span>
              <button type="button" className="modal-close" onClick={() => setTrocaAberta(false)}>
                <IcX />
              </button>
            </div>

            <div className="secao-titulo secao-titulo--cinza">Quem sai</div>
            <div className="lista-troca">
              {titulares.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`troca-item${trocaSai === t.id ? ' sel' : ''}`}
                  onClick={() => setTrocaSai(t.id)}
                >
                  <span className="troca-nome">{t.nome} nº {t.numero}</span>
                  <span className="troca-pos">{NOME_POSICAO[t.posicao]}</span>
                </button>
              ))}
            </div>

            <div className="secao-titulo secao-titulo--cinza">Quem entra</div>
            <div className="lista-troca">
              {banco.length === 0 && <p className="escalacao-msg">Nenhum reserva disponível.</p>}
              {banco.map(b => (
                <button
                  key={b.id}
                  type="button"
                  className={`troca-item${trocaEntra === b.id ? ' sel' : ''}`}
                  onClick={() => setTrocaEntra(b.id)}
                >
                  <span className="troca-nome">{b.nome} nº {b.numero}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn-confirmar-troca"
              disabled={!trocaSai || !trocaEntra}
              onClick={confirmarTroca}
            >
              Confirmar troca
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════ MODAL: SALVAR SCOUT ══════════════════════ */}
      <div className={`overlay${salvarAberto ? ' open' : ''}`}
           onClick={e => e.target === e.currentTarget && fecharSalvar()}>
        {salvarAberto && (
          <div className="modal modal-salvar">
            <div className="modal-handle" />

            <AnimatePresence mode="wait">
              {/* ── FASE 1: FORMULÁRIO ── */}
              {faseSalvar === 'form' && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="salvar-fase"
                >
                  <div className="mf-header">
                    <span className="modal-titulo-simples">Salvar scout</span>
                    <button type="button" className="modal-close" onClick={fecharSalvar}>
                      <IcX />
                    </button>
                  </div>

                  <div className="mcampo">
                    <label className="mlabel">Seu time</label>
                    <div className="minput minput-somente-leitura">
                      {timeAtual?.name || 'Nenhum time selecionado'}
                    </div>
                  </div>

                  <div className="mcampo">
                    <label className="mlabel">Data do jogo</label>
                    <input className="minput" type="date" value={mData}
                           onChange={e => setMData(e.target.value)} style={ebForm('data')} />
                  </div>

                  <div className="mcampo">
                    <label className="mlabel">Adversário</label>
                    <input className="minput" type="text" placeholder="Nome do time adversário"
                           value={mAdv} onChange={e => setMAdv(e.target.value)} style={ebForm('adv')} />
                  </div>

                  <div className="mcampo">
                    <label className="mlabel">Placar final (sets)</label>
                    <div className="placar-row">
                      <input className="minput" type="number" min="0" max="5" placeholder="0"
                             value={mPlacarNos} onChange={e => setMPlacarNos(e.target.value)}
                             style={ebForm('placarNos')} />
                      <span className="placar-x">×</span>
                      <input className="minput" type="number" min="0" max="5" placeholder="0"
                             value={mPlacarAdv} onChange={e => setMPlacarAdv(e.target.value)}
                             style={ebForm('placarAdv')} />
                    </div>
                    <span className="placar-legenda">{timeAtual?.name || 'Seu time'} × Adversário</span>
                  </div>

                  <div className="mcampo">
                    <label className="mlabel">Resultado</label>
                    <div className="resultado-row">
                      <button
                        type="button"
                        className={`resultado-btn resultado-btn--vitoria${mResultado === 'vitoria' ? ' sel' : ''}`}
                        onClick={() => setMResultado('vitoria')}
                        style={ebForm('resultado')}
                      >
                        <IcCheck /> Vitória
                      </button>
                      <button
                        type="button"
                        className={`resultado-btn resultado-btn--derrota${mResultado === 'derrota' ? ' sel' : ''}`}
                        onClick={() => setMResultado('derrota')}
                        style={ebForm('resultado')}
                      >
                        <IcX /> Derrota
                      </button>
                    </div>
                  </div>

                  <div className="modal-acoes">
                    <button type="button" className="mbtn-cancel" onClick={fecharSalvar}>Cancelar</button>
                    <button type="button" className="mbtn-ok" onClick={confirmarSalvar}>Salvar</button>
                  </div>
                </motion.div>
              )}

              {/* ── FASE 2: SALVANDO (barra de progresso) ── */}
              {faseSalvar === 'salvando' && (
                <motion.div
                  key="salvando"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="salvar-fase salvar-fase--centro"
                >
                  <span className="modal-titulo-simples">Salvando scout…</span>
                  <div className="barra-progresso">
                    <motion.div
                      className="barra-progresso-fill"
                      animate={{ width: `${progresso}%` }}
                      transition={{ ease: 'easeOut', duration: 0.2 }}
                    />
                  </div>
                  <span className="barra-progresso-label">{Math.round(progresso)}%</span>
                </motion.div>
              )}

              {/* ── FASE 3: SUCESSO ── */}
              {faseSalvar === 'sucesso' && (
                <motion.div
                  key="sucesso"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.22 }}
                  className="salvar-fase salvar-fase--centro"
                >
                  <motion.div
                    className="sucesso-icone"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.05 }}
                  >
                    <IcCheck />
                  </motion.div>
                  <span className="sucesso-mensagem">Seu scout foi salvo com sucesso</span>

                  <div className="sucesso-acoes">
                    <button type="button" className="mbtn-ok" onClick={verDetalhesSalvar}>
                      Ver Detalhes
                    </button>
                    <button type="button" className="mbtn-cancel" onClick={finalizarSalvar}>
                      Finalizar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

    </div>
  );
}