import '../../css/inicial.css';
import scoutlogoImg from '../assets/IMG/scoutlogo.png';
import bolaImg from '../assets/IMG/bola.png';
import atletasImg from '../assets/IMG/atletas.png';
import equipeImg from '../assets/IMG/equipe.png';
import { obterIniciais } from '../services/auth.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import ModalSelecionarEquipe from '../components/ModalSelecionarEquipe.jsx';
import TelaCarregando from '../components/TelaCarregando.jsx';

export default function Inicial() {
  const { estado, usuario } = useAuth();

  // ainda checando se existe sessão válida — evita mostrar a tela de
  // login e trocar pro dashboard (ou vice-versa) alguns instantes depois
  if (estado === 'carregando') {
    return <TelaCarregando className="aplicativo" />;
  }

  // visitante não logado: manda direto pro login, sem landing intermediária
  // ('nao-autenticado' ou 'expirado' caem aqui, igual no PrivateRoute)
  if (estado !== 'autenticado') {
    window.location.hash = '#/login';
    return null;
  }

  const nomeExibido = usuario ? (usuario.nome || usuario.email) : '';

  return (
    <div className="aplicativo">

      {/* aparece de cara assim que a pessoa loga, antes de qualquer outra
          coisa — pede pra selecionar a equipe ou, se ainda não tem
          nenhuma, criar a primeira */}
      <ModalSelecionarEquipe />

      <header className="cabecalho">
        <a href="#/" className="logo-equipe">
          <img src={scoutlogoImg} alt="Logo da equipe" className="logo-equipe-img" />
        </a>

        <h1 className="logo">SCOUT LIVE</h1>

        <div className="cabecalho-direita">
          <a href="#/app/perfil" className="usuario-chip" id="usuarioChip">
            <div className="usuario-avatar" id="usuarioAvatar">
              <span className="usuario-avatar-iniciais">{obterIniciais(nomeExibido)}</span>
            </div>
          </a>
        </div>
      </header>

      {/* DASHBOARD — sempre autenticado aqui, quem não está já foi redirecionado */}
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

      </div>

    </div>
  );
}