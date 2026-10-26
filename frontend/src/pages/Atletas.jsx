import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../../css/atletas.css';
import '../../css/ui-estados.css';
import MenuHamburguer from '../components/MenuHamburguer.jsx';
import maisImg from '../assets/IMG/mais.png';
import lupaImg from '../assets/IMG/lupa.png';
import { listarTimes, listarJogadores, getTimeSelecionado, setTimeSelecionado } from '../services/time.js';
import MensagemErro from '../components/ui/MensagemErro.jsx';
import EstadoVazio from '../components/ui/EstadoVazio.jsx';
import MensagemSucesso from '../components/ui/MensagemSucesso.jsx';
import ModalAdicionarAtleta from '../components/ModalAdicionarAtleta.jsx';
import ModalDetalhesAtleta from '../components/ModalDetalhesAtleta.jsx';

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

  // modal de "Adicionar atleta" + aviso de sucesso depois de salvar
  const [modalAberto, setModalAberto] = useState(false);
  const [sucesso, setSucesso] = useState('');

  // modal de "Ver detalhes" (só leitura). O atleta fica guardado mesmo
  // depois de fechar, pra o conteúdo não sumir durante o fade de saída.
  const [atletaDetalhe, setAtletaDetalhe] = useState(null);
  const [detalhesAberto, setDetalhesAberto] = useState(false);

  function abrirDetalhes(atleta) {
    setAtletaDetalhe(atleta);
    setDetalhesAberto(true);
  }
  // atleta excluído: fecha o modal, avisa e recarrega a lista (o cache de
  // jogadores do time já foi invalidado dentro do excluirJogador)
  function handleAtletaExcluido() {
    setDetalhesAberto(false);
    setSucesso('Atleta excluído com sucesso!');
    carregarAtletas(timeAtual);
  }
    // atleta editado: o modal continua aberto mostrando os dados novos, e a
  // lista é recarregada por trás (o cache de jogadores já foi invalidado
  // dentro do atualizarJogador)
  function handleAtletaEditado(atualizado) {
    setAtletaDetalhe(atualizado);
    setSucesso('Atleta atualizado com sucesso!');
    carregarAtletas(timeAtual);
  }

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

  // o aviso de sucesso some sozinho depois de alguns segundos
  useEffect(() => {
    if (!sucesso) return;
    const timer = setTimeout(() => setSucesso(''), 3000);
    return () => clearTimeout(timer);
  }, [sucesso]);

  // atleta salvo: fecha o modal, avisa e recarrega a lista (o cache de
  // jogadores do time já foi invalidado dentro do criarJogador)
  function handleAtletaSalvo() {
    setModalAberto(false);
    setSucesso('Atleta adicionado com sucesso!');
    carregarAtletas(timeAtual);
  }

  const atletasFiltrados = atletas.filter(a =>
    (a.name || '').toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="pagina-app">
      <MenuHamburguer />
      <div className="atletas-titulo-wrapper">
        <h1 className="atletas-titulo">Atletas</h1>
      </div>

      <main className="atletas-conteudo">

        {!carregando && !timeAtual && (
          <EstadoVazio
            texto="Você ainda não tem uma equipe."
            acao={{ href: '#/app/equipes', texto: 'Crie a sua equipe' }}
          />
        )}

        <div className="atletas-barra">
          <button
            type="button"
            className="btn-adicionar"
            onClick={() => setModalAberto(true)}
            disabled={!timeAtual}
          >
            <img src={maisImg} className="btn-mais" alt="" />
            Adicionar atleta
          </button>

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

        <MensagemSucesso mensagem={sucesso} />

        <AnimatePresence mode="wait">
          {carregando && (
            <motion.div
              key="carregando"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CarregandoAtletas />
            </motion.div>
          )}
        </AnimatePresence>
        <MensagemErro mensagem={erro} aoTentarNovamente={() => carregarAtletas(timeAtual)} />
        {!carregando && !erro && timeAtual && atletasFiltrados.length === 0 && (
          <EstadoVazio texto="Nenhum atleta cadastrado neste time ainda." />
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
              <button type="button" className="btn-detalhes" onClick={() => abrirDetalhes(atleta)}>
                Ver detalhes
              </button>
            </div>
          ))}
        </div>

      </main>

      <ModalAdicionarAtleta
        aberto={modalAberto}
        time={timeAtual}
        onFechar={() => setModalAberto(false)}
        onSalvo={handleAtletaSalvo}
      />

      <ModalDetalhesAtleta
  aberto={detalhesAberto}
  atleta={atletaDetalhe}
  onFechar={() => setDetalhesAberto(false)}
  onExcluido={handleAtletaExcluido}
  onEditado={handleAtletaEditado}
/>



    </div>
  );
}