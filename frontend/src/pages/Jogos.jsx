import { useState, useEffect } from 'react';
import '../../css/jogos.css';
import '../../css/ui-estados.css';
import MenuHamburguer from '../components/MenuHamburguer.jsx';
import lupaImg from '../assets/IMG/lupa.png';
import { apiRequest } from '../services/api.js';
import { listarTimes } from '../services/time.js';
import Carregando from '../components/ui/Carregando.jsx';
import MensagemErro from '../components/ui/MensagemErro.jsx';
import EstadoVazio from '../components/ui/EstadoVazio.jsx';

function formatarData(isoDate) {
  if (!isoDate) return '—';
  const [ano, mes, dia] = isoDate.split('T')[0].split('-');
  return `${dia}/${mes}/${ano}`;
}

export default function Jogos() {
  const [filtroAtivo, setFiltroAtivo] = useState('todos');
  const [busca, setBusca] = useState('');

  const [jogos, setJogos] = useState([]);
  const [nomesTimes, setNomesTimes] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  async function carregar() {
    setCarregando(true);
    setErro('');
    try {
      const [resJogos, times] = await Promise.all([
        apiRequest('/matches'),
        listarTimes()
      ]);

      const mapaNomes = {};
      (times || []).forEach(t => { mapaNomes[t.id] = t.name; });

      setNomesTimes(mapaNomes);
      setJogos(resJogos?.jogos || []);
    } catch (err) {
      setErro(err.message || 'Erro ao carregar jogos');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  const jogosComNome = jogos.map(jogo => ({
    ...jogo,
    adversarioNome: nomesTimes[jogo.time_adversario_id] || 'Adversário',
  }));

  // FILTRAR JOGOS
  // Combina o filtro de resultado com o texto digitado na busca
  const jogosFiltrados = jogosComNome.filter(jogo => {
    const passaFiltro = filtroAtivo === 'todos' || jogo.resultado_final === filtroAtivo;
    const passaBusca  = jogo.adversarioNome.toLowerCase().includes(busca.toLowerCase());
    return passaFiltro && passaBusca;
  });

  return (
    <div className="aplicativo">
      <MenuHamburguer />

      <header className="cabecalho-jogos">
        <div className="cabecalho-espaco"></div>
        <h1 className="logo-jogos">JOGOS</h1>
        <div className="cabecalho-espaco"></div>
      </header>

      <div className="filtros">

        {/* FILTROS DE RESULTADO (chips: Todos, Vitória, Derrota) */}
        <div className="filtro-chips">
          {[
            { valor: 'todos',   label: 'Todos' },
            { valor: 'vitoria', label: 'Vitória' },
            { valor: 'derrota', label: 'Derrota' },
          ].map(({ valor, label }) => (
            <button
              key={valor}
              className={`chip${filtroAtivo === valor ? ' chip--ativo' : ''}`}
              data-filtro={valor}
              onClick={() => setFiltroAtivo(valor)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* BUSCA POR ADVERSÁRIO */}
        <div className="filtro-busca">
          <img src={lupaImg} className="icone-busca" />
          <input
            type="text"
            placeholder="Buscar..."
            className="input-busca"
            id="inputBusca"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

      </div>

      <div className="lista-jogos" id="listaJogos">

        <div className="tabela-cabecalho">
          <span>Data</span>
          <span>Adversário</span>
          <span>Placar</span>
          <span>Resultado</span>
        </div>

        {carregando && <div style={{ padding: '0 16px' }}><Carregando texto="Carregando jogos…" /></div>}
        <div style={{ padding: '0 16px' }}>
          <MensagemErro mensagem={erro} aoTentarNovamente={carregar} />
        </div>
        {!carregando && !erro && jogosFiltrados.length === 0 && (
          <div style={{ padding: '0 16px' }}><EstadoVazio texto="Nenhum jogo salvo ainda." /></div>
        )}

        {jogosFiltrados.map(jogo => (
          <a
            href={`#/app/jogos/detalhes?id=${jogo.id}`}
            className="jogo-item"
            data-resultado={jogo.resultado_final}
            key={jogo.id}
          >
            <span className="jogo-data jogo-data--coluna">{formatarData(jogo.data_jogo)}</span>
            <span className="jogo-adversario">
              {jogo.adversarioNome}
              <span className="jogo-data jogo-data--inline">{formatarData(jogo.data_jogo)}</span>
            </span>
            <span className="jogo-placar">
              {jogo.home_score ?? 0}<span className="x">×</span>{jogo.away_score ?? 0}
            </span>
            <span className={`jogo-resultado jogo-resultado--${jogo.resultado_final}`}>
              {jogo.resultado_final === 'vitoria' ? 'Vitória' : jogo.resultado_final === 'derrota' ? 'Derrota' : '—'}
            </span>
          </a>
        ))}

      </div>

    </div>
  );
}