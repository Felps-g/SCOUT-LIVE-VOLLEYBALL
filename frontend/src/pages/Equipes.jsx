import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import '../../css/equipes.css';
import '../../css/ui-estados.css';
import MenuHamburguer from '../components/MenuHamburguer.jsx';
import atletasImg from '../assets/IMG/atletas.png';
import bolaImg from '../assets/IMG/bola.png';
import MensagemErro from '../components/ui/MensagemErro.jsx';
import EstadoVazio from '../components/ui/EstadoVazio.jsx';
import {
  listarTimes,
  criarTime,
  atualizarTime,
  deletarTime,
  getTimeSelecionado,
  setTimeSelecionado,
  limparTimeSelecionado
} from '../services/time.js';

/* ───────── ícones (SVG inline: herdam a cor do botão via currentColor) ───────── */

function Svg({ children, size = 16, ...resto }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...resto}
    >
      {children}
    </svg>
  );
}

const IconeCheck = props => <Svg {...props}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
const IconeX = props => <Svg {...props}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
const IconeMais = props => <Svg {...props}><path d="M12 5v14M5 12h14" /></Svg>;
const IconeLapis = props => (
  <Svg {...props}>
    <path d="M4 20l4-1 11-11a2.1 2.1 0 00-3-3L5 16l-1 4z" />
    <path d="M14.5 6.5l3 3" />
  </Svg>
);
const IconeLixeira = props => (
  <Svg {...props}>
    <path d="M4 7h16M10 11v6M14 11v6" />
    <path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
  </Svg>
);

// spinner central exibido enquanto as equipes ainda não chegaram da API
function CarregandoEquipes() {
  return (
    <div className="carregando-jogos">
      <motion.div
        className="spinner"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      <span className="carregando-texto">Carregando equipes…</span>
    </div>
  );
}

// sugestões de categoria — viram atalhos clicáveis no formulário, mas o
// técnico continua livre pra digitar qualquer outra categoria
const CATEGORIAS_SUGERIDAS = ['Sub-15', 'Sub-17', 'Sub-19', 'Adulto Masculino', 'Adulto Feminino'];

// monograma da equipe: iniciais + um tom fixo (derivado do id) dentro da
// família azul/verde-água/índigo, pra cada equipe ser reconhecível de relance
const TONS_EQUIPE = [212, 188, 252, 160];

function iniciais(nome) {
  const partes = (nome || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function tomDaEquipe(chave) {
  let h = 0;
  for (const ch of String(chave)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONS_EQUIPE[h % TONS_EQUIPE.length];
}

export default function Equipes() {
  const reduzirMovimento = useReducedMotion();

  const [times, setTimes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [timeAtualId, setTimeAtualId] = useState(getTimeSelecionado()?.id || '');

  const [formAberto, setFormAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [sucesso, setSucesso] = useState('');

  // edição inline do nome da equipe
  const [editandoId, setEditandoId] = useState('');
  const [nomeEditado, setNomeEditado] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState('');

  // exclusão
  const [excluindoId, setExcluindoId] = useState('');
  const [erroExclusao, setErroExclusao] = useState('');

  async function carregar() {
    setCarregando(true);
    setErro('');
    try {
      const lista = await listarTimes();
      // times criados automaticamente como adversário (ver services/time.js)
      // não são equipes que o técnico gerencia — não aparecem aqui
      setTimes((lista || []).filter(t => t.category !== 'Adversário'));
    } catch (err) {
      setErro(err.message || 'Erro ao carregar equipes');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  function selecionar(time) {
    setTimeSelecionado(time);
    setTimeAtualId(time.id);
  }

  async function handleCriar(e) {
    e.preventDefault();
    setErroForm('');

    if (!nome.trim()) { setErroForm('Digite o nome da equipe.'); return; }
    if (!categoria.trim()) { setErroForm('Escolha ou digite a categoria.'); return; }

    setSalvando(true);
    try {
      const novo = await criarTime(nome.trim(), categoria.trim());
      setTimes(prev => [...prev, novo].sort((a, b) => a.name.localeCompare(b.name)));
      selecionar(novo);
      setNome('');
      setCategoria('');
      setFormAberto(false);
      setSucesso(`Equipe "${novo.name}" criada.`);
      setTimeout(() => setSucesso(''), 3000);
    } catch (err) {
      // erro 409 do backend (nome repetido) já vem com mensagem pronta pro usuário
      setErroForm(err.message || 'Erro ao criar equipe');
    } finally {
      setSalvando(false);
    }
  }

  function fecharForm() {
    setFormAberto(false);
    setErroForm('');
    setNome('');
    setCategoria('');
  }

  function iniciarEdicao(time) {
    setEditandoId(time.id);
    setNomeEditado(time.name);
    setErroEdicao('');
  }

  function cancelarEdicao() {
    setEditandoId('');
    setNomeEditado('');
    setErroEdicao('');
  }

  async function salvarEdicao(time) {
    const novoNome = nomeEditado.trim();
    if (!novoNome) { setErroEdicao('Digite um nome.'); return; }
    if (novoNome === time.name) { cancelarEdicao(); return; }

    setSalvandoEdicao(true);
    setErroEdicao('');
    try {
      const atualizado = await atualizarTime(time.id, { name: novoNome });
      setTimes(prev => prev.map(t => (t.id === time.id ? atualizado : t)).sort((a, b) => a.name.localeCompare(b.name)));
      if (time.id === timeAtualId) setTimeSelecionado(atualizado);
      cancelarEdicao();
    } catch (err) {
      setErroEdicao(err.message || 'Erro ao renomear equipe');
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function excluir(time) {
    if (!window.confirm(`Excluir a equipe "${time.name}"? Essa ação não pode ser desfeita.`)) return;

    setExcluindoId(time.id);
    setErroExclusao('');
    try {
      await deletarTime(time.id);
      setTimes(prev => prev.filter(t => t.id !== time.id));
      if (time.id === timeAtualId) {
        limparTimeSelecionado();
        setTimeAtualId('');
      }
    } catch (err) {
      // erro 409 do backend (equipe com jogos/jogadores) já vem com mensagem pronta
      setErroExclusao(err.message || 'Erro ao excluir equipe');
    } finally {
      setExcluindoId('');
    }
  }

  const timeAtual = times.find(t => t.id === timeAtualId);
  const mostrarLista = !carregando && !erro && times.length > 0;

  return (
    <div className="pagina-app">
      <MenuHamburguer />
      <div className="atletas-titulo-wrapper">
        <h1 className="atletas-titulo">Equipes</h1>
      </div>

      <main className="eq-conteudo">

        {sucesso && (
          <p className="eq-aviso eq-aviso--sucesso" role="status">
            <IconeCheck size={16} />
            {sucesso}
          </p>
        )}
        {erroExclusao && <p className="eq-aviso eq-aviso--erro" role="alert">{erroExclusao}</p>}

        {/* barra de topo: quantas equipes + criar */}
        {!carregando && !erro && (
          <div className="eq-topo">
            <p className="eq-resumo">
              {times.length === 0
                ? 'Nenhuma equipe ainda'
                : times.length === 1 ? '1 equipe' : `${times.length} equipes`}
            </p>
            {!formAberto && (
              <button type="button" className="eq-btn-criar" onClick={() => setFormAberto(true)}>
                <IconeMais size={16} />
                Criar equipe
              </button>
            )}
          </div>
        )}

        <AnimatePresence initial={false}>
          {formAberto && (
            <motion.form
              key="form-criar"
              className="eq-form"
              onSubmit={handleCriar}
              initial={reduzirMovimento ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <h2 className="eq-form-titulo">Nova equipe</h2>

              <div className="eq-campo">
                <label className="eq-label" htmlFor="eq-nome">Nome da equipe</label>
                <input
                  id="eq-nome"
                  type="text"
                  className="eq-input"
                  placeholder="Ex: Vôlei Vinhedo"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="eq-campo">
                <label className="eq-label" htmlFor="eq-categoria">Categoria</label>
                <input
                  id="eq-categoria"
                  type="text"
                  className="eq-input"
                  placeholder="Ex: Sub-17 ou outra categoria"
                  value={categoria}
                  onChange={e => setCategoria(e.target.value)}
                />
                <div className="eq-chips" role="group" aria-label="Categorias sugeridas">
                  {CATEGORIAS_SUGERIDAS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`eq-chip-opcao${categoria === c ? ' eq-chip-opcao--ativo' : ''}`}
                      aria-pressed={categoria === c}
                      onClick={() => setCategoria(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {erroForm && <p className="eq-aviso eq-aviso--erro" role="alert">{erroForm}</p>}

              <div className="eq-form-acoes">
                <button type="button" className="eq-btn-secundario" onClick={fecharForm}>
                  Cancelar
                </button>
                <button type="submit" className="eq-btn-primario" disabled={salvando}>
                  {!salvando && <IconeCheck size={16} />}
                  {salvando ? 'Salvando…' : 'Salvar equipe'}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {carregando && (
            <motion.div
              key="carregando"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CarregandoEquipes />
            </motion.div>
          )}
        </AnimatePresence>
        <MensagemErro mensagem={erro} aoTentarNovamente={carregar} />

        {!carregando && !erro && times.length === 0 && !formAberto && (
          <div className="eq-vazio">
            <EstadoVazio texto="Você ainda não tem nenhuma equipe. Crie a primeira para começar a cadastrar atletas e jogos." />
            <button type="button" className="eq-btn-primario" onClick={() => setFormAberto(true)}>
              <IconeMais size={16} />
              Criar primeira equipe
            </button>
          </div>
        )}

        {mostrarLista && (
          <ul className="eq-lista">
            {times.map(time => {
              const ativa = time.id === timeAtualId;
              const editando = editandoId === time.id;
              const excluindo = excluindoId === time.id;

              return (
                <li
                  key={time.id}
                  className={`eq-card${ativa ? ' eq-card--ativa' : ''}${editando ? ' eq-card--editando' : ''}`}
                >
                  <span
                    className="eq-monograma"
                    style={{ '--tom': tomDaEquipe(time.id ?? time.name) }}
                    aria-hidden="true"
                  >
                    {iniciais(editando ? nomeEditado || time.name : time.name)}
                  </span>

                  {editando ? (
                    <form
                      className="eq-edicao"
                      onSubmit={e => { e.preventDefault(); salvarEdicao(time); }}
                    >
                      <div className="eq-edicao-campo">
                        <label className="eq-label" htmlFor={`eq-edit-${time.id}`}>Nome da equipe</label>
                        <input
                          id={`eq-edit-${time.id}`}
                          type="text"
                          className="eq-input"
                          value={nomeEditado}
                          onChange={e => setNomeEditado(e.target.value)}
                          autoFocus
                        />
                        {erroEdicao && <span className="eq-erro-inline" role="alert">{erroEdicao}</span>}
                      </div>

                      <div className="eq-edicao-acoes">
                        <button
                          type="button"
                          className="eq-icone eq-icone--cancelar"
                          onClick={cancelarEdicao}
                          title="Cancelar edição"
                          aria-label="Cancelar edição"
                        >
                          <IconeX size={18} />
                        </button>
                        <button
                          type="submit"
                          className="eq-icone eq-icone--salvar"
                          disabled={salvandoEdicao}
                          title="Salvar novo nome"
                          aria-label="Salvar novo nome"
                        >
                          <IconeCheck size={18} />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="eq-info">
                        <span className="eq-nome">{time.name}</span>
                        {time.category && <span className="eq-categoria">{time.category}</span>}
                      </div>

                      <div className="eq-acoes">
                        <button
                          type="button"
                          className="eq-icone eq-icone--editar"
                          onClick={() => iniciarEdicao(time)}
                          title="Editar equipe"
                          aria-label={`Editar ${time.name}`}
                        >
                          <IconeLapis size={16} />
                        </button>

                        <button
                          type="button"
                          className="eq-icone eq-icone--excluir"
                          onClick={() => excluir(time)}
                          disabled={excluindo}
                          title={excluindo ? 'Excluindo…' : 'Excluir equipe'}
                          aria-label={excluindo ? 'Excluindo…' : `Excluir ${time.name}`}
                        >
                          <IconeLixeira size={16} />
                        </button>

                        <button
                          type="button"
                          className={`eq-btn-selecionar${ativa ? ' eq-btn-selecionar--ativa' : ''}`}
                          onClick={() => selecionar(time)}
                          aria-pressed={ativa}
                        >
                          {ativa && <IconeCheck size={15} />}
                          {ativa ? 'Selecionada' : 'Selecionar'}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {timeAtualId && mostrarLista && (
          <section className="eq-atalhos" aria-label="Atalhos da equipe selecionada">
            <h2 className="eq-atalhos-titulo">
              Gerenciar {timeAtual ? timeAtual.name : 'equipe selecionada'}
            </h2>
            <div className="eq-atalhos-grade">
              <a href="#/app/atletas" className="eq-atalho">
                <img src={atletasImg} className="eq-atalho-icone" alt="" />
                Atletas
              </a>
              <a href="#/app/jogos" className="eq-atalho">
                <img src={bolaImg} className="eq-atalho-icone" alt="" />
                Jogos
              </a>
              <a href="#/app/scout" className="eq-atalho">
                {/* mesmo ícone do "Scout Live" usado na tela inicial */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#e8273a"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="eq-atalho-icone"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" fill="#e8273a" stroke="none" />
                </svg>
                Scout ao vivo
              </a>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}