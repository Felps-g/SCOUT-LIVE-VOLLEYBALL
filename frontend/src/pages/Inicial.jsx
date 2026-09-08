import '../../css/inicial.css';
import scoutlogoImg from '../assets/IMG/scoutlogo.png';
import perfil1Img from '../assets/IMG/perfil1.png';
import bolaImg from '../assets/IMG/bola.png';
import atletasImg from '../assets/IMG/atletas.png';
import perfilImg from '../assets/IMG/perfil.png';
import equipeImg from '../assets/IMG/equipe.png';
import { obterIniciais } from '../services/auth.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import ModalSelecionarEquipe from '../components/ModalSelecionarEquipe.jsx';
import TelaCarregando from '../components/TelaCarregando.jsx';

export default function Inicial() {
  const { estado, usuario } = useAuth();

  // ainda checando se existe sessão válida — evita mostrar a landing e
  // trocar pro dashboard (ou vice-versa) alguns instantes depois
  if (estado === 'carregando') {
    return <TelaCarregando className="aplicativo" />;
  }

  const logado = estado === 'autenticado';
  const nomeExibido = usuario ? (usuario.nome || usuario.email) : '';

  return (
    <div className="aplicativo">

      {/* aparece de cara assim que a pessoa loga, antes de qualquer outra
          coisa — pede pra selecionar a equipe ou, se ainda não tem
          nenhuma, criar a primeira */}
      {logado && <ModalSelecionarEquipe />}

      <header className="cabecalho">
        <a href="#/" className="logo-equipe">
          <img src={scoutlogoImg} alt="Logo da equipe" className="logo-equipe-img" />
        </a>

        <h1 className="logo">SCOUT LIVE</h1>

        <div className="cabecalho-direita">
          <a href={logado ? '#/app/perfil' : '#/login'} className="usuario-chip" id="usuarioChip">
            <div className="usuario-avatar" id="usuarioAvatar">
              {logado ? (
                <span className="usuario-avatar-iniciais">{obterIniciais(nomeExibido)}</span>
              ) : (
                <img src={perfil1Img} className="icone-usuario" />
              )}
            </div>
            {!logado && <span className="usuario-nome">Entrar</span>}
          </a>
        </div>
      </header>

      {logado ? (
        /* DASHBOARD — usuário autenticado */
        <div className="grade-navegacao">

          <a href="#/app/scout" className="botao-nav botao-nav--ao-vivo">
            <div className="icone-nav">
              <div className="indicador-ao-vivo"></div>
              <svg viewBox="0 0 24 24" fill="none" stroke="#e8273a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="4" fill="#e8273a" stroke="none"/>
              </svg>
            </div>
            <span className="rotulo-nav">Scout Live</span>
          </a>

          <a href="#/app/jogos" className="botao-nav botao-nav--jogos">
            <div className="icone-nav">
              <img src={bolaImg} />
            </div>
            <span className="rotulo-nav">Jogos</span>
          </a>

          <a href="#/app/equipes" className="botao-nav botao-nav--atletas">
            <div className="icone-nav">
              <img src={equipeImg} />
            </div>
            <span className="rotulo-nav">Equipes</span>
          </a>

          <a href="#/app/atletas" className="botao-nav botao-nav--atletas">
            <div className="icone-nav">
              <img src={atletasImg} />
            </div>
            <span className="rotulo-nav">Atletas</span>
          </a>

          <a href="#/app/perfil" className="botao-nav botao-nav--perfil">
            <div className="icone-nav">
              <img src={perfilImg} />
            </div>
            <span className="rotulo-nav">Perfil</span>
          </a>

        </div>
      ) : (
        /* LANDING — visitante não autenticado: chamada clara pro login,
           em vez da grade de navegação que só ia redirecionar de volta pra cá */
        <div className="landing-publica">
          <h2 className="landing-titulo">Bem-vindo ao Scout Live</h2>
          <p className="landing-texto">
            Gerencie times, jogadores e faça o scout dos seus jogos de vôlei ao vivo.
          </p>
          <a href="#/login" className="landing-botao">Entrar ou criar conta</a>
        </div>
      )}

    </div>
  );
}