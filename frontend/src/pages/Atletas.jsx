import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import '../../css/atletas.css';
import maisImg from '../assets/IMG/mais.png';
import lupaImg from '../assets/IMG/lupa.png';
import casaImg from '../assets/IMG/casa.png';
import { listarTimes, listarJogadores, getTimeSelecionado, setTimeSelecionado } from '../services/time.js';

// spinner central exibido enquanto os atletas ainda não chegaram da API
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

export default function Atletas() {
  // BUSCA DE ATLETAS
  // Filtra os cards enquanto o técnico digita o nome
  const [busca, setBusca] = useState('');

  const [timeAtual, setTimeAtual] = useState(null);
  const [atletas, setAtletas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function carregarAtletas(time) {
    if (!time) {
      setAtletas([]);
      return;
    }
    setCarregando(true);
    setErro('');
    try {
      const jogadores = await listarJogadores(time.id);
      setAtletas(jogadores || []);
    } catch (err) {
      setErro(err.message || 'Erro ao buscar atletas');
    } finally {
      setCarregando(false);
    }
  }

  // Não mostramos mais o seletor/criador de time aqui: o time do técnico já
  // foi criado antes (na Escalação) e fica salvo no localStorage. Aqui a
  // gente só recupera esse time salvo em segundo plano e já carrega os
  // atletas dele direto.
  async function carregarTimeAtual() {
    try {
      const lista = await listarTimes();
      const salvo = getTimeSelecionado();
      const aindaExiste = salvo && lista?.some(t => t.id === salvo.id);

      let time = null;
      if (aindaExiste) {
        time = salvo;
      } else if (lista?.length > 0) {
        time = lista[0];
        setTimeSelecionado(time);
      }

      setTimeAtual(time);
      carregarAtletas(time);
    } catch (err) {
      setErro(err.message || 'Erro ao carregar o time');
    }
  }

  useEffect(() => { carregarTimeAtual(); }, []);

  const atletasFiltrados = atletas.filter(a =>
    (a.name || '').toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="pagina-app">
      <div className="atletas-titulo-wrapper">
        <h1 className="atletas-titulo">Atletas</h1>
      </div>

      <main className="atletas-conteudo">

        {!carregando && !timeAtual && (
          <p style={{ color: '#fff', opacity: 0.7 }}>
            Você ainda não tem um time. Crie o seu time na aba Scout live antes de cadastrar atletas.
          </p>
        )}

        <div className="atletas-barra">
          <a href="#/app/atletas/novo" className="btn-adicionar">
            <img src={maisImg} className="btn-mais" />
            Adicionar atleta
          </a>

          <div className="atletas-busca">
            <img src={lupaImg} className="icone-busca" />
            <input
              type="text"
              placeholder="Pesquisar atleta"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
        </div>

        {carregando && <CarregandoAtletas />}
        {erro && <p style={{ color: '#ff6b7a' }}>{erro}</p>}
        {!carregando && !erro && timeAtual && atletasFiltrados.length === 0 && (
          <p style={{ color: '#fff', opacity: 0.7 }}>Nenhum atleta cadastrado neste time ainda.</p>
        )}

        <div className="atletas-grade">
          {atletasFiltrados.map(atleta => (
            <div className="atleta-card" key={atleta.id}>
              <div
                className="atleta-foto"
                style={atleta.photo_url ? {
                  backgroundImage: `url(${atleta.photo_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : undefined}
              ></div>
              <span className="atleta-nome">{atleta.name}</span>
              <a href={`#/app/atletas/detalhes?id=${atleta.id}`} className="btn-detalhes">Ver detalhes</a>
            </div>
          ))}
        </div>

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