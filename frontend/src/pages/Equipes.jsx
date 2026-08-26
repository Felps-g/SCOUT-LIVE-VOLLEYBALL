import { useState, useEffect } from 'react';
import '../../css/equipes.css';
import maisImg from '../assets/IMG/mais.png';
import casaImg from '../assets/IMG/casa.png';
import { listarTimes, criarTime, getTimeSelecionado, setTimeSelecionado } from '../services/time.js';

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

  async function carregar() {
    setCarregando(true);
    setErro('');
    try {
      const lista = await listarTimes();
      setTimes(lista || []);
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

  return (
    <div className="pagina-app">
      <div className="atletas-titulo-wrapper">
        <h1 className="atletas-titulo">Equipes</h1>
      </div>

      <main className="equipes-conteudo">

        {sucesso && <p className="equipes-sucesso">{sucesso}</p>}

        {!formAberto && (
          <button className="btn-adicionar" onClick={() => setFormAberto(true)}>
            <img src={maisImg} className="btn-mais" />
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

        {carregando && <p style={{ color: '#fff', opacity: 0.7 }}>Carregando equipes…</p>}
        {erro && <p style={{ color: '#ff6b7a' }}>{erro}</p>}
        {!carregando && !erro && times.length === 0 && !formAberto && (
          <p style={{ color: '#fff', opacity: 0.7 }}>
            Você ainda não tem nenhuma equipe. Crie a primeira para começar a cadastrar atletas e jogos.
          </p>
        )}

        <div className="equipes-lista">
          {times.map(time => (
            <div key={time.id} className={`equipe-card${time.id === timeAtualId ? ' equipe-card--ativa' : ''}`}>
              <div className="equipe-card-info">
                <span className="equipe-nome">{time.name}</span>
                {time.category && <span className="equipe-categoria">{time.category}</span>}
              </div>

              {time.id === timeAtualId ? (
                <span className="equipe-selecionada">Selecionada</span>
              ) : (
                <button className="btn-selecionar" onClick={() => selecionar(time)}>Selecionar</button>
              )}
            </div>
          ))}
        </div>

        {timeAtualId && (
          <div className="equipes-gerenciar">
            <span className="equipes-gerenciar-titulo">Gerenciar equipe selecionada</span>
            <div className="equipes-gerenciar-links">
              <a href="#/app/atletas">Atletas</a>
              <a href="#/app/jogos">Jogos</a>
              <a href="#/app/scout">Scout ao vivo</a>
            </div>
          </div>
        )}

      </main>

      <footer className="rodape">
        <a href="#/" className="botao-inicio">
          <img src={casaImg} className="icone-casa" />
          Início
        </a>
      </footer>
    </div>
  );
}
