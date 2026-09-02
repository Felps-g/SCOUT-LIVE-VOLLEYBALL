import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../../css/equipes.css';
import '../../css/ui-estados.css';
import maisImg from '../assets/IMG/mais.png';
import casaImg from '../assets/IMG/casa.png';
import cancelarImg from '../assets/IMG/cancelar.png';
import selecionarImg from '../assets/IMG/selecione.png';
import bolaImg from '../assets/IMG/bola.png';
import atletasImg from '../assets/IMG/atletas.png';
import salvarImg from '../assets/IMG/salvar.png';
import lixeiraImg from '../assets/IMG/lixeira.png';
import editarImg from '../assets/IMG/editar.png';
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

// sugestões de categoria (autocomplete via <datalist> — não trava o
// técnico num valor fixo, só ajuda a digitar mais rápido)
const CATEGORIAS_SUGERIDAS = ['Sub-15', 'Sub-17', 'Sub-19', 'Adulto Masculino', 'Adulto Feminino'];

export default function Equipes() {
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

  return (
    <div className="pagina-app">
      <div className="atletas-titulo-wrapper">
        <h1 className="atletas-titulo">Equipes</h1>
        <p className="equipes-subtitulo">Gerencie e organize suas equipes de análise</p>
      </div>

      <main className="equipes-conteudo">

        {sucesso && <p className="equipes-sucesso">{sucesso}</p>}
        {erroExclusao && <p className="equipes-erro">{erroExclusao}</p>}

        {!formAberto && (
          <button className="btn-adicionar" onClick={() => setFormAberto(true)}>
            <img src={maisImg} className="btn-mais" alt="" />
            Criar equipe
          </button>
        )}

        {formAberto && (
          <form className="equipes-form" onSubmit={handleCriar}>
            <div className="campo-grupo">
              <label className="campo-label">Nome da equipe</label>
              <input
                type="text"
                className="campo-input"
                placeholder="Ex: Vôlei Vinhedo"
                value={nome}
                onChange={e => setNome(e.target.value)}
                autoFocus
              />
            </div>

            <div className="campo-grupo">
              <label className="campo-label">Categoria</label>
              <input
                type="text"
                className="campo-input"
                list="categorias-sugeridas"
                placeholder="Ex: Sub-17"
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
              />
              <datalist id="categorias-sugeridas">
                {CATEGORIAS_SUGERIDAS.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            {erroForm && <p className="equipes-erro">{erroForm}</p>}

            <div className="equipes-form-acoes">
              <button
                type="button"
                className="btn-cancelar"
                onClick={() => { setFormAberto(false); setErroForm(''); setNome(''); setCategoria(''); }}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-salvar-equipe" disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar equipe'}
              </button>
            </div>
          </form>
        )}

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
          <EstadoVazio texto="Você ainda não tem nenhuma equipe. Crie a primeira para começar a cadastrar atletas e jogos." />
        )}

        <div className="equipes-lista">
          {times.map(time => {
            const ativa = time.id === timeAtualId;
            const editando = editandoId === time.id;

            return (
              <div key={time.id} className={`equipe-card${ativa ? ' equipe-card--ativa' : ''}`}>

                {editando ? (
                  <form
                    className="equipe-edicao-form"
                    onSubmit={e => { e.preventDefault(); salvarEdicao(time); }}
                  >
                    <input
                      type="text"
                      className="equipe-edicao-input"
                      value={nomeEditado}
                      onChange={e => setNomeEditado(e.target.value)}
                      autoFocus
                    />

                    {erroEdicao && <span className="equipes-erro equipes-erro--inline">{erroEdicao}</span>}

                    <div className="equipe-edicao-acoes">
                      <button
                        type="button"
                        className="btn-icone btn-icone--cancelar"
                        onClick={cancelarEdicao}
                        title="Cancelar edição"
                      >
                        <img src={cancelarImg} className="icone-cancelar-edicao" alt="" />
                      </button>
                      <button
                        type="submit"
                        className="btn-icone btn-icone--salvar"
                        disabled={salvandoEdicao}
                        title="Salvar novo nome"
                      >
                        {/* ícone mascarado: pega a cor verde do próprio botão em vez do branco original */}
                        <span
                          className="icone-salvar-edicao icone-mascarado"
                          style={{ WebkitMaskImage: `url(${salvarImg})`, maskImage: `url(${salvarImg})` }}
                        />
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <span className="equipe-nome">{time.name}</span>

                    <div className="equipe-card-acoes">
                      <button
                        className="btn-icone btn-icone--editar"
                        onClick={() => iniciarEdicao(time)}
                        title="Editar equipe"
                      >
                        {/* ícone mascarado: pega a cor azul do próprio botão em vez do branco original */}
                        <span
                          className="icone-editar-equipe icone-mascarado"
                          style={{ WebkitMaskImage: `url(${editarImg})`, maskImage: `url(${editarImg})` }}
                        />
                      </button>

                      <button
                        className={`btn-selecionar${ativa ? ' btn-selecionar--ativa' : ''}`}
                        onClick={() => selecionar(time)}
                      >
                        <img src={selecionarImg} className="icone-selecionar" alt="" />
                        Selecionar
                      </button>

                      <button
                        className="btn-excluir"
                        onClick={() => excluir(time)}
                        disabled={excluindoId === time.id}
                      >
                        <img src={lixeiraImg} className="icone-excluir" alt="" />
                        {excluindoId === time.id ? 'Excluindo…' : 'Excluir'}
                      </button>
                    </div>

                  </>
                )}

                {ativa && !editando && (
                  <div className="equipe-selecionada-aviso">
                    <img src={selecionarImg} className="icone-check-selecionada" alt="" />
                    Equipe selecionada com sucesso
                  </div>
                )}

              </div>
            );
          })}
        </div>

        {timeAtualId && (
          <div className="equipes-gerenciar">
            <span className="equipes-gerenciar-titulo">Gerenciar equipe selecionada</span>
            <div className="equipes-gerenciar-links">
              <a href="#/app/atletas" className="equipes-gerenciar-item">
                <img src={atletasImg} className="icone-atletas-gerenciar" alt="" />
                Atletas
              </a>
              <a href="#/app/jogos" className="equipes-gerenciar-item">
                <img src={bolaImg} className="icone-jogos-gerenciar" alt="" />
                Jogos
              </a>
              <a href="#/app/scout" className="equipes-gerenciar-item">
                {/* mesmo ícone do "Scout Live" usado na tela inicial */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#e8273a"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="icone-scout-vivo-gerenciar"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" fill="#e8273a" stroke="none" />
                </svg>
                Scout ao vivo
              </a>
            </div>
          </div>
        )}

      </main>

      <footer className="rodape">
        <a href="#/" className="botao-inicio">
          <img src={casaImg} className="icone-casa" alt="" />
          Início
        </a>
      </footer>
    </div>
  );
}