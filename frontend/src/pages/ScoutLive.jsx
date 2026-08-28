import { useState, useEffect, useMemo } from 'react';
import '../../css/scoutlive.css';
import { apiRequest } from '../services/api.js';
import { getTimeSelecionado, listarJogadores, listarTimes, criarTime } from '../services/time.js';
import SeletorTime from '../components/SeletorTime.jsx';
import { IcSave, IcSwap, IcCheck, IcX, IcHome } from '../components/IconesScout.jsx';
import LinhaJogadorScout from '../components/LinhaJogadorScout.jsx';
import {
  POSICOES, POSICOES_REQUERIDAS, TOTAL_TITULARES, NOME_POSICAO,
  fundamentosDaPosicao, cadastroDoJogador
} from '../constants/volei.js';

/* ── COMPONENTE PRINCIPAL ───────────────────────────────── */

export default function ScoutLive() {
  const [timeAtual, setTimeAtual] = useState(getTimeSelecionado());
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
  const [errosForm, setErrosForm]       = useState([]);
  const [salvando, setSalvando]         = useState(false);

  const [avisoVisivel, setAvisoVisivel] = useState(false);

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

  function handleTimeChange(time) {
    setTimeAtual(time);
    setSelecoes({});
    carregarJogadores(time);
  }

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
      return { id, nome: j?.name || j?.nome || 'Atleta', numero: numerosMap[id], posicao };
    }).sort((a, b) => a.numero - b.numero);

    setTitulares(lista);
    setEscalacaoAberta(false);
  }

  /* ── BANCO (reservas disponíveis para troca) ── */
  const banco = useMemo(() => {
    const idsEmQuadra = new Set(titulares.map(t => t.id));
    return jogadores
      .filter(j => !idsEmQuadra.has(j.id))
      .map(j => ({ id: j.id, nome: j.name || j.nome || 'Atleta', numero: numerosMap[j.id] }))
      .sort((a, b) => a.numero - b.numero);
  }, [jogadores, titulares, numerosMap]);

  /* ── MARCAÇÃO DE FUNDAMENTOS ── */
  function marcar(jogadorId, fundamento, tipo) {
    setDados(prev => {
      const d = { ...prev };
      d[jogadorId] = { ...(d[jogadorId] || {}) };
      const atualDoSet = d[jogadorId][setAtual] || { acerto: 0, erro: 0, eventos: [] };
      d[jogadorId][setAtual] = {
        acerto: atualDoSet.acerto + (tipo === 'acerto' ? 1 : 0),
        erro: atualDoSet.erro + (tipo === 'erro' ? 1 : 0),
        eventos: [...atualDoSet.eventos, { fundamento, tipo }],
      };
      return d;
    });
    setJogadorAberto(null);
  }

  // acertos/erros de UM fundamento específico, dentro do set atual
  function getContagemFundamento(jogadorId, fundamento) {
    const eventos = dados?.[jogadorId]?.[setAtual]?.eventos || [];
    let acerto = 0, erro = 0;
    eventos.forEach(ev => {
      if (ev.fundamento === fundamento) {
        if (ev.tipo === 'acerto') acerto += 1; else erro += 1;
      }
    });
    return { acerto, erro };
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
        nome: entrou.name || entrou.nome || 'Atleta',
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
    setSalvarAberto(true);
  }

  function fecharSalvar() {
    setSalvarAberto(false);
    setMAdv(''); setMPlacarNos(''); setMPlacarAdv(''); setErrosForm([]);
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
    if (e.length) { setErrosForm(e); setTimeout(() => setErrosForm([]), 2000); return; }

    try {
      setSalvando(true);

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
            promessas.push(apiRequest(`/matches/${matchId}/acoes`, {
              method: 'POST',
              body: {
                jogador_id: jogadorId,
                set_id: setId,
                tipo_acao: TIPO_ACAO_POR_FUNDAMENTO[evento.fundamento] || 'ataque',
                resultado: evento.tipo === 'acerto' ? 'ponto' : 'erro',
                posicao_jogador: titulares.find(t => t.id === jogadorId)?.posicao || 'desconhecido',
                descricao: evento.fundamento,
                action_order: index + 1
              }
            }));
          });
        });
      });

      await Promise.all(promessas);

      // grava o placar final e o resultado (vitória/derrota pelo placar de sets)
      await apiRequest(`/matches/${matchId}/finalizar`, {
        method: 'PUT',
        body: {
          resultado_final: Number(mPlacarNos) >= Number(mPlacarAdv) ? 'vitoria' : 'derrota',
          placar_final: `${mPlacarNos}x${mPlacarAdv}`
        }
      });

      fecharSalvar();
      setAvisoVisivel(true);
      setTimeout(() => setAvisoVisivel(false), 2500);

      // encerra a partida e volta para a tela de escalação
      setTitulares([]);
      setSelecoes({});
      setDados({});
      setSetAtual(1);
      setEscalacaoAberta(true);
    } catch (err) {
      alert(err.message || 'Erro ao salvar o scout');
    } finally {
      setSalvando(false);
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

            <div style={{ padding: '0 0 6px' }}>
              <SeletorTime onChange={handleTimeChange} />
            </div>

            <div className="escalacao-contador">
              {totalSelecionados}/{TOTAL_TITULARES} titulares selecionados
            </div>

            <div className="escalacao-lista">
              {carregandoJogadores && <p className="escalacao-msg">Carregando atletas…</p>}
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
                        <span className="ej-nome">{j.name || j.nome}</span>
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

          <div className="legenda">
            <span className="legenda-item"><i className="ponto ponto--verde" /> pontua</span>
            <span className="legenda-item"><i className="ponto ponto--cinza" /> não pontua</span>
          </div>

          <div className="toque-label">Toque no jogador para marcar</div>

          <div className="grade-jogadores">
            {titulares.map(t => (
              <LinhaJogadorScout
                key={t.id}
                titular={t}
                fundamentos={fundamentosDaPosicao(t.posicao)}
                contagem={f => getContagemFundamento(t.id, f)}
                onClick={() => setJogadorAberto(t.id)}
              />
            ))}
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

      {/* ── AVISO ── */}
      <div className={`aviso${avisoVisivel ? ' vis' : ''}`}>Scout salvo com sucesso!</div>

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

            <div className="modal-acoes">
              <button type="button" className="mbtn-cancel" onClick={fecharSalvar}>Cancelar</button>
              <button type="button" className="mbtn-ok" onClick={confirmarSalvar} disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}