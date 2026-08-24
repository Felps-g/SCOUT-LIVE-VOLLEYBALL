import { useState, useEffect } from 'react';
import '../../css/login.css';
import { apiRequest, setAuthToken } from '../services/api.js';
import { buscarPerfilAtual } from '../services/auth.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import telaImg from '../assets/IMG/Tela.png';

// ── MÁSCARA DE CPF ───────────────────────────
function aplicarMascaraCpf(valor) {
  let v = valor.replace(/\D/g, '').slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return v;
}

// ── VALIDAÇÕES ───────────────────────────────
function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validarCpf(cpf) {
  const nums = cpf.replace(/\D/g, '');
  if (nums.length !== 11 || /^(\d)\1+$/.test(nums)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(nums[i]) * (10 - i);
  let r = (soma * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(nums[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(nums[i]) * (11 - i);
  r = (soma * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(nums[10]);
}

// SVGs do olho
const SvgOlhoAberto = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const SvgOlhoFechado = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function Login() {
  const { estado, login } = useAuth();

  // já está autenticado e caiu na tela de login (ex: digitou a URL de
  // novo por engano) — manda direto pra área logada em vez de mostrar
  // o formulário de novo
  useEffect(() => {
    if (estado === 'autenticado') {
      window.location.hash = '';
    }
  }, [estado]);

  // ── ALTERNÂNCIA DE ABAS ──────────────────────
  const [abaAtiva, setAbaAtiva] = useState('entrar');

  // campos de login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [senhaLoginVisivel, setSenhaLoginVisivel] = useState(false);
  const [erroLogin, setErroLogin]   = useState(() => {
    // se veio de um redirecionamento por sessão expirada (ver o
    // interceptor de 401 em services/api.js), já mostra o motivo em vez
    // de deixar a pessoa achando que digitou a senha errada
    const query = window.location.hash.split('?')[1] || '';
    const motivo = new URLSearchParams(query).get('motivo');
    return motivo === 'sessao-expirada' ? 'Sua sessão expirou. Faça login novamente.' : '';
  });
  const [camposErroLogin, setCamposErroLogin] = useState([]);
  const [loginCarregando, setLoginCarregando] = useState(false);

  // campos de cadastro
  const [cadastroNome,  setCadastroNome]  = useState('');
  const [cadastroCpf,   setCadastroCpf]   = useState('');
  const [cadastroEmail, setCadastroEmail] = useState('');
  const [cadastroSenha, setCadastroSenha] = useState('');
  const [senhaCadastroVisivel, setSenhaCadastroVisivel] = useState(false);
  const [erroCadastro, setErroCadastro] = useState('');
  const [camposErroCadastro, setCamposErroCadastro] = useState([]);
  const [cadastroCarregando, setCadastroCarregando] = useState(false);

  // ── HABILITAR / DESABILITAR BOTÃO ────────────
  const loginValido   = validarEmail(loginEmail) && loginSenha.length >= 6;
  const cadastroValido = cadastroNome.length >= 3 && validarCpf(cadastroCpf) && validarEmail(cadastroEmail) && cadastroSenha.length >= 6;

  function trocarAba(aba) {
    setAbaAtiva(aba);
    setErroLogin('');
    setErroCadastro('');
    setCamposErroLogin([]);
    setCamposErroCadastro([]);
  }

  // ── LOGIN ────────────────────────────────────
  async function fazerLogin() {
    setErroLogin('');
    setCamposErroLogin([]);
    const erros = [];
    let msg = '';

    if (!validarEmail(loginEmail)) {
      erros.push('loginEmail');
      msg = 'Digite um e-mail válido.';
    }
    if (loginSenha.length < 6) {
      erros.push('loginSenha');
      if (!msg) msg = 'A senha deve ter pelo menos 6 caracteres.';
    }

    if (erros.length > 0) {
      setCamposErroLogin(erros);
      setErroLogin(msg);
      return;
    }

    setLoginCarregando(true);

    try {
      const dados = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email: loginEmail, password: loginSenha }
      });

      setAuthToken(dados.token);

      // o /auth/login só devolve id e email; buscamos o perfil completo
      // (com o nome cadastrado) pra usar no avatar e na tela de perfil.
      let usuarioCompleto = dados.usuario;
      try {
        usuarioCompleto = await buscarPerfilAtual();
      } catch {
        // segue com os dados básicos que o login já devolveu
      }

      login(usuarioCompleto);
      window.location.hash = '';
    } catch (err) {
      setErroLogin(err.message);
      setLoginCarregando(false);
    }
  }

  // ── CADASTRO ─────────────────────────────────
  async function fazerCadastro() {
    setErroCadastro('');
    setCamposErroCadastro([]);
    const erros = [];
    let msg = '';

    if (cadastroNome.length < 3)      { erros.push('cadastroNome');  msg = msg || 'Digite seu nome completo.'; }
    if (!validarCpf(cadastroCpf))     { erros.push('cadastroCpf');   msg = msg || 'CPF inválido.'; }
    if (!validarEmail(cadastroEmail)) { erros.push('cadastroEmail'); msg = msg || 'Digite um e-mail válido.'; }
    if (cadastroSenha.length < 6)     { erros.push('cadastroSenha'); msg = msg || 'A senha deve ter pelo menos 6 caracteres.'; }

    if (erros.length > 0) {
      setCamposErroCadastro(erros);
      setErroCadastro(msg);
      return;
    }

    setCadastroCarregando(true);

    try {
      const dados = await apiRequest('/auth/registrar', {
        method: 'POST',
        body: {
          nome: cadastroNome,
          email: cadastroEmail,
          password: cadastroSenha
        }
      });

      setErroCadastro('');
      alert(dados.mensagem || `Conta criada com sucesso! Bem-vindo(a), ${cadastroNome.split(' ')[0]}!`);
      trocarAba('entrar');
    } catch (err) {
      setErroCadastro(err.message);
      setCadastroCarregando(false);
    }
  }

  function erroClassLogin(id)   { return camposErroLogin.includes(id)   ? ' campo-input--erro' : ''; }
  function erroClassCadastro(id){ return camposErroCadastro.includes(id) ? ' campo-input--erro' : ''; }

  return (
    <div className="pagina">

      <div className="painel-lateral">
        <img className="painel-imagem" src={telaImg} alt="Scout Live" />
      </div>

      <div className="painel-formulario">
        <div className="formulario-container">

          {/* ── ALTERNÂNCIA DE ABAS */}
          <div className="abas">
            <button className={`aba${abaAtiva === 'entrar' ? ' aba--ativa' : ''}`} id="abaEntrar" onClick={() => trocarAba('entrar')}>Entrar</button>
            <button className={`aba${abaAtiva === 'cadastro' ? ' aba--ativa' : ''}`} id="abaCadastro" onClick={() => trocarAba('cadastro')}>Cadastrar</button>
          </div>

          {/* bloco de login */}
          <div className={`bloco-formulario${abaAtiva !== 'entrar' ? ' oculto' : ''}`} id="blocoEntrar">
            <div className="formulario-topo">
              <h1 className="formulario-titulo">Bem-vindo de volta</h1>
              <p className="formulario-subtitulo">Entre com suas credenciais para continuar</p>
            </div>

            <div className="campos">
              <div className="campo">
                <label className="campo-rotulo">E-mail</label>
                <input
                  className={`campo-input${erroClassLogin('loginEmail')}`}
                  type="email"
                  placeholder="seu@email.com"
                  id="loginEmail"
                  value={loginEmail}
                  onChange={e => { setLoginEmail(e.target.value); setCamposErroLogin(p => p.filter(x => x !== 'loginEmail')); }}
                />
              </div>

              <div className="campo">
                <label className="campo-rotulo">Senha</label>
                <div className="campo-senha">
                  <input
                    className={`campo-input${erroClassLogin('loginSenha')}`}
                    type={senhaLoginVisivel ? 'text' : 'password'}
                    placeholder="sua senha"
                    id="loginSenha"
                    value={loginSenha}
                    onChange={e => { setLoginSenha(e.target.value); setCamposErroLogin(p => p.filter(x => x !== 'loginSenha')); }}
                  />
                  {/* ── MOSTRAR / OCULTAR SENHA */}
                  <button className="campo-olho" onClick={() => setSenhaLoginVisivel(v => !v)} type="button">
                    {senhaLoginVisivel ? <SvgOlhoFechado /> : <SvgOlhoAberto />}
                  </button>
                </div>
                <a href="#" className="campo-link">Esqueceu a senha?</a>
              </div>
            </div>

            <p className="mensagem-erro" id="erroLogin">{erroLogin}</p>

            <button
              className="botao-enviar"
              onClick={fazerLogin}
              disabled={!loginValido || loginCarregando}
              style={{ opacity: loginValido && !loginCarregando ? 1 : 0.5, cursor: loginValido && !loginCarregando ? 'pointer' : 'not-allowed' }}
            >
              {loginCarregando ? 'Entrando…' : 'Entrar'}
            </button>

            <p className="formulario-rodape">
              Não tem conta? <a href="#" onClick={e => { e.preventDefault(); trocarAba('cadastro'); }}>Cadastre-se</a>
            </p>
          </div>

          {/* bloco de cadastro */}
          <div className={`bloco-formulario${abaAtiva !== 'cadastro' ? ' oculto' : ''}`} id="blocoCadastro">
            <div className="formulario-topo">
              <h1 className="formulario-titulo">Criar conta</h1>
              <p className="formulario-subtitulo">Preencha os dados para se cadastrar</p>
            </div>

            <div className="campos">
              <div className="campo">
                <label className="campo-rotulo">Nome completo</label>
                <input
                  className={`campo-input${erroClassCadastro('cadastroNome')}`}
                  type="text"
                  placeholder="Seu nome"
                  id="cadastroNome"
                  value={cadastroNome}
                  onChange={e => { setCadastroNome(e.target.value); setCamposErroCadastro(p => p.filter(x => x !== 'cadastroNome')); }}
                />
              </div>

              <div className="campo">
                <label className="campo-rotulo">CPF</label>
                <input
                  className={`campo-input${erroClassCadastro('cadastroCpf')}`}
                  type="text"
                  placeholder="000.000.000-00"
                  id="cadastroCpf"
                  maxLength="14"
                  value={cadastroCpf}
                  onChange={e => { setCadastroCpf(aplicarMascaraCpf(e.target.value)); setCamposErroCadastro(p => p.filter(x => x !== 'cadastroCpf')); }}
                />
              </div>

              <div className="campo">
                <label className="campo-rotulo">E-mail</label>
                <input
                  className={`campo-input${erroClassCadastro('cadastroEmail')}`}
                  type="email"
                  placeholder="seu@email.com"
                  id="cadastroEmail"
                  value={cadastroEmail}
                  onChange={e => { setCadastroEmail(e.target.value); setCamposErroCadastro(p => p.filter(x => x !== 'cadastroEmail')); }}
                />
              </div>

              <div className="campo">
                <label className="campo-rotulo">Senha</label>
                <div className="campo-senha">
                  <input
                    className={`campo-input${erroClassCadastro('cadastroSenha')}`}
                    type={senhaCadastroVisivel ? 'text' : 'password'}
                    placeholder="mínimo 6 caracteres"
                    id="cadastroSenha"
                    value={cadastroSenha}
                    onChange={e => { setCadastroSenha(e.target.value); setCamposErroCadastro(p => p.filter(x => x !== 'cadastroSenha')); }}
                  />
                  <button className="campo-olho" onClick={() => setSenhaCadastroVisivel(v => !v)} type="button">
                    {senhaCadastroVisivel ? <SvgOlhoFechado /> : <SvgOlhoAberto />}
                  </button>
                </div>
              </div>
            </div>

            <p className="mensagem-erro" id="erroCadastro">{erroCadastro}</p>

            <button
              className="botao-enviar"
              onClick={fazerCadastro}
              disabled={!cadastroValido || cadastroCarregando}
              style={{ opacity: cadastroValido && !cadastroCarregando ? 1 : 0.5, cursor: cadastroValido && !cadastroCarregando ? 'pointer' : 'not-allowed' }}
            >
              {cadastroCarregando ? 'Criando conta…' : 'Criar conta'}
            </button>

            <p className="formulario-rodape">
              Já tem conta? <a href="#" onClick={e => { e.preventDefault(); trocarAba('entrar'); }}>Entrar</a>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}