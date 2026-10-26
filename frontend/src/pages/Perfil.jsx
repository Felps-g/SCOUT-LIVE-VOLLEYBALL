import { useState, useEffect, useRef } from 'react';
import '../../css/perfil.css';
import MenuHamburguer from '../components/MenuHamburguer.jsx';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import editarfotoImg from '../assets/IMG/editarfoto.png';
import sairImg from '../assets/IMG/sair.png';
import editarImg from '../assets/IMG/editar.png';
import olhoImg from '../assets/IMG/olho.png';
import olhoFechadoImg from '../assets/IMG/olho-fechado.png';
import { apiRequest } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Perfil() {
  const { usuario, logout, atualizarUsuario } = useAuth();

  // guarda a instância do cropper pra poder destruir quando fechar
  const cropperRef = useRef(null);

  // começa já com a foto salva (se o técnico já tiver definido uma antes),
  // em vez de sempre abrir com o placeholder até um novo carregamento
  const [fotoSrc, setFotoSrc]             = useState('');
  const [salvandoFoto, setSalvandoFoto]     = useState(false);
  const [modalCropAberto, setModalCropAberto] = useState(false);
  const [imagemCropSrc, setImagemCropSrc]   = useState('');
  const [modalEditarAberto, setModalEditarAberto] = useState(false);

  const [valorCpf, setValorCpf] = useState('Não informado');

  const [editNome,  setEditNome]  = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCpf,   setEditCpf]   = useState('');
  const [editSenhaAtual, setEditSenhaAtual] = useState('');
  const [editSenha, setEditSenha] = useState('');
  const [senhaAtualVisivel, setSenhaAtualVisivel] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [erroModal, setErroModal] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [campoVazio, setCampoVazio] = useState('');

  const inputFotoRef  = useRef(null);
  const imagemCropRef = useRef(null);

  // Nome/email vêm do AuthContext (já buscados uma vez quando o app abriu
  // — ver contexts/AuthContext.jsx). Perfil.jsx só existe dentro de
  // <PrivateRoute>, então quando chega aqui a sessão já está confirmada;
  // buscar de novo seria uma segunda chamada a /auth/profile pra pegar
  // exatamente o mesmo dado que o contexto já tem.
  const perfilNome  = usuario?.nome || '';
  const valorEmail = usuario?.email || '';

  // carrega a foto já salva assim que o perfil chega do AuthContext
  useEffect(() => {
    if (usuario?.fotoUrl) setFotoSrc(usuario.fotoUrl);
  }, [usuario?.fotoUrl]);

  // FOTO DE PERFIL
  // o botão de editar foto aciona o input de arquivo escondido
  function handleEditarFoto() {
    inputFotoRef.current?.click();
  }

  // quando o técnico escolhe uma foto, abre o modal de crop
  function handleFotoChange(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = function (ev) {
      abrirModalCrop(ev.target.result);
    };
    leitor.readAsDataURL(arquivo);
  }

  // abre o modal e inicializa o cropper na imagem escolhida
  function abrirModalCrop(src) {
    setImagemCropSrc(src);
    setModalCropAberto(true);
  }

  // inicializa o Cropper.js depois que o modal abrir
  useEffect(() => {
    if (!modalCropAberto || !imagemCropRef.current) return;

    // espera o modal estar visível antes de inicializar o cropper
    // senão ele não consegue calcular as dimensões direito
    const timer = setTimeout(() => {
      if (cropperRef.current) {
        cropperRef.current.destroy();
        cropperRef.current = null;
      }

      cropperRef.current = new Cropper(imagemCropRef.current, {
        aspectRatio: 1,         // recorte quadrado — fica bem no círculo do perfil
        viewMode: 1,            // não deixa o recorte sair da imagem
        dragMode: 'move',       // arrasta a foto, não a caixa de recorte
        autoCropArea: 0.85,     // começa com 85% selecionado
        guides: false,
        highlight: false,
        cropBoxMovable: false,
        cropBoxResizable: false,
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [modalCropAberto, imagemCropSrc]);

  // fecha o modal de crop sem salvar nada
  function fecharModalCrop() {
    setModalCropAberto(false);

    if (cropperRef.current) {
      cropperRef.current.destroy();
      cropperRef.current = null;
    }

    if (inputFotoRef.current) inputFotoRef.current.value = '';
  }

  // confirma o recorte, aplica no círculo do perfil e salva no backend
  async function confirmarCrop() {
    if (!cropperRef.current) return;

    const canvas    = cropperRef.current.getCroppedCanvas({ width: 300, height: 300 });
    const fotoFinal = canvas.toDataURL('image/jpeg', 0.9);

    setFotoSrc(fotoFinal);
    fecharModalCrop();

    // mesmo esquema já usado pra foto do atleta: vai em base64 dentro do
    // JSON e fica salva no user_metadata do técnico (sem storage de
    // arquivo configurado no projeto — ver comentário em authService.js)
    setSalvandoFoto(true);
    try {
      await apiRequest('/auth/profile', {
        method: 'PUT',
        body: { foto: fotoFinal }
      });
      atualizarUsuario({ fotoUrl: fotoFinal });
    } catch (err) {
      alert(err.message || 'Não foi possível salvar a foto.');
    } finally {
      setSalvandoFoto(false);
    }
  }

  // MODAL DE EDITAR INFORMAÇÕES
  // abre o modal e preenche os campos com os dados atuais da tela
  function abrirModalEditar() {
    setEditNome(perfilNome);
    setEditEmail(valorEmail);
    setEditSenhaAtual('');
    setEditSenha('');
    setEditCpf('');
    setErroModal('');

    // garante que os campos de senha voltam pro modo oculto e o ícone pro olho aberto ao abrir o modal
    setSenhaAtualVisivel(false);
    setSenhaVisivel(false);

    // quando o banco estiver pronto, preencher o cpf real aqui
    // setEditCpf(cpfReal);

    setModalEditarAberto(true);
  }

  // fecha o modal de edição
  function fecharModalEditar() {
    setModalEditarAberto(false);
  }

  // salva as alterações e atualiza a tela
  async function confirmarEditar() {
    if (salvandoEdicao) return;
    setErroModal('');

    // nome e email são obrigatórios
    if (!editNome.trim())  { destacarVazio('editNome');  return; }
    if (!editEmail.trim()) { destacarVazio('editEmail'); return; }

    // troca de senha: só acontece se a "Nova senha" foi preenchida
    const querTrocarSenha = editSenha !== '';
    if (querTrocarSenha) {
      if (!editSenhaAtual) {
        destacarVazio('editSenhaAtual');
        setErroModal('Informe a senha atual para trocar a senha.');
        return;
      }
      if (editSenha.length < 6) {
        destacarVazio('editSenha');
        setErroModal('A nova senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (editSenha === editSenhaAtual) {
        destacarVazio('editSenha');
        setErroModal('A nova senha precisa ser diferente da atual.');
        return;
      }
    }

    setSalvandoEdicao(true);
    let senhaTrocada = false;
    try {
      // a senha vai primeiro: se a senha atual estiver errada, nada é salvo
      if (querTrocarSenha) {
        await apiRequest('/auth/trocar-senha', {
          method: 'POST',
          body: { senha_atual: editSenhaAtual, senha_nova: editSenha }
        });
        senhaTrocada = true;
      }

      // o backend (Supabase) atualiza o nome pelo /auth/profile;
      // troca de e-mail ainda não é persistida, só o nome.
      await apiRequest('/auth/profile', {
        method: 'PUT',
        body: { nome: editNome.trim() }
      });

      // atualiza o nome já confirmado, sem precisar buscar o perfil de novo
      atualizarUsuario({ nome: editNome.trim() });
      if (editCpf) setValorCpf(editCpf);

      fecharModalEditar();
    } catch (err) {
      if (senhaTrocada) {
        // a senha já mudou: não deixa a pessoa tentar de novo com a senha antiga
        setEditSenhaAtual('');
        setEditSenha('');
        setErroModal('Sua senha foi alterada, mas não foi possível salvar o nome. ' + (err.message || ''));
      } else {
        setErroModal(err.message || 'Não foi possível salvar as alterações.');
      }
    } finally {
      setSalvandoEdicao(false);
    }
  }

  // pisca vermelho no campo vazio
  function destacarVazio(id) {
    setCampoVazio(id);
    setTimeout(() => setCampoVazio(''), 2000);
  }

  function vazioBorder(id) {
    return campoVazio === id ? { borderColor: 'rgba(232, 39, 58, 0.7)' } : {};
  }

  // cpf: formata enquanto o técnico digita no modal: 000.000.000-00
  function handleEditCpfChange(e) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9) v = v.slice(0,3) + '.' + v.slice(3,6) + '.' + v.slice(6,9) + '-' + v.slice(9);
    else if (v.length > 6) v = v.slice(0,3) + '.' + v.slice(3,6) + '.' + v.slice(6);
    else if (v.length > 3) v = v.slice(0,3) + '.' + v.slice(3);
    setEditCpf(v);
  }

  // SAIR DA CONTA
  function handleSair() {
    logout();
  }

  return (
    <div className="pagina-app">
      <MenuHamburguer />
      <header className="perfil-header">
        <h1 className="perfil-titulo">Perfil</h1>
      </header>
      <main className="perfil-conteudo">

        <section className="perfil-cartao" aria-labelledby="perfilNome">

          <div className="perfil-identidade">
            <div className="perfil-foto-ring">

              <div className="perfil-foto-placeholder" id="fotoPlaceholder" style={{ display: fotoSrc ? 'none' : '' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>

              {fotoSrc && <img className="perfil-foto-img" id="fotoPerfilImg" src={fotoSrc} alt="" />}

              <button type="button" className="perfil-foto-edit" id="btnEditarFoto" aria-label="Alterar foto" onClick={handleEditarFoto}>
                <img src={editarfotoImg} className="icone-editarfoto" alt="" />
              </button>

              <input type="file" id="inputFotoPerfil" ref={inputFotoRef} accept="image/*" style={{ display: 'none' }} onChange={handleFotoChange} />

            </div>

            <h2 className="perfil-nome" id="perfilNome">{perfilNome}</h2>
            <span className="perfil-cargo">{salvandoFoto ? 'Salvando foto...' : 'Técnico'}</span>

            <button type="button" className="btn-editar" id="btnEditar" onClick={abrirModalEditar}>
              <img src={editarImg} className="icone-editar" alt="" />
              Editar informações
            </button>
          </div>

          <dl className="perfil-dados">
            <div className="perfil-linha">
              <dt className="perfil-campo-label">E-mail</dt>
              <dd className="perfil-campo-valor" id="valorEmail">{valorEmail}</dd>
            </div>
            <div className="perfil-linha">
              <dt className="perfil-campo-label">CPF</dt>
              <dd className="perfil-campo-valor" id="valorCpf">{valorCpf}</dd>
            </div>
            <div className="perfil-linha">
              <dt className="perfil-campo-label">Senha</dt>
              <dd className="perfil-campo-valor">••••••••</dd>
            </div>
          </dl>

          <div className="perfil-rodape-cartao">
            <button type="button" className="btn-sair" id="btnSair" onClick={handleSair}>
              <img src={sairImg} className="icone-sair" alt="" />
              Sair da conta
            </button>
          </div>

        </section>

      </main>



      {/* modal de editar informações */}
      <div
        className={`modal-overlay${modalEditarAberto ? ' aberto' : ''}`}
        id="modalEditarOverlay"
        onClick={e => { if (e.target === e.currentTarget) fecharModalEditar(); }}
      >
        <div className="modal">

          <h2 className="modal-titulo">Editar Informações</h2>
          <div className="modal-divisor"></div>

          <div className="modal-campo">
            <label className="modal-label" htmlFor="editNome">Nome</label>
            <input className="modal-input" type="text" id="editNome" placeholder="Seu nome completo"
              value={editNome} onChange={e => setEditNome(e.target.value)} style={vazioBorder('editNome')} />
          </div>

          <div className="modal-campo">
            <label className="modal-label" htmlFor="editEmail">E-mail</label>
            <input className="modal-input" type="email" id="editEmail" placeholder="seu@email.com"
              value={editEmail} onChange={e => setEditEmail(e.target.value)} style={vazioBorder('editEmail')} />
          </div>

          <div className="modal-campo">
            <label className="modal-label" htmlFor="editCpf">CPF</label>
            <input className="modal-input" type="text" id="editCpf" placeholder="000.000.000-00"
              value={editCpf} onChange={handleEditCpfChange} />
          </div>

          <div className="modal-campo">
            <label className="modal-label" htmlFor="editSenhaAtual">
              Senha atual
              <span className="modal-label-obs">(só pra trocar a senha)</span>
            </label>
            <div className="modal-input-wrapper">
              <input className="modal-input" type={senhaAtualVisivel ? 'text' : 'password'} id="editSenhaAtual" placeholder="••••••••"
                autoComplete="current-password"
                value={editSenhaAtual} onChange={e => { setEditSenhaAtual(e.target.value); setErroModal(''); }} style={vazioBorder('editSenhaAtual')} />
              <button className="btn-ver-senha" type="button"
                aria-label={senhaAtualVisivel ? 'Esconder senha atual' : 'Mostrar senha atual'}
                onClick={() => setSenhaAtualVisivel(v => !v)}>
                <img src={senhaAtualVisivel ? olhoFechadoImg : olhoImg} className="icone-olho" alt="" />
              </button>
            </div>
          </div>

          <div className="modal-campo">
            <label className="modal-label" htmlFor="editSenha">
              Nova senha
              <span className="modal-label-obs">(deixe em branco pra manter)</span>
            </label>
            <div className="modal-input-wrapper">
              <input className="modal-input" type={senhaVisivel ? 'text' : 'password'} id="editSenha" placeholder="••••••••"
                autoComplete="new-password"
                value={editSenha} onChange={e => { setEditSenha(e.target.value); setErroModal(''); }} style={vazioBorder('editSenha')} />
              {/* VER SENHA */}
              {/* alterna entre mostrar e esconder a senha, trocando o ícone junto */}
              <button className="btn-ver-senha" id="btnVerSenha" type="button"
                aria-label={senhaVisivel ? 'Esconder nova senha' : 'Mostrar nova senha'}
                onClick={() => setSenhaVisivel(v => !v)}>
                <img src={senhaVisivel ? olhoFechadoImg : olhoImg} id="iconeOlho" className="icone-olho" alt="" />
              </button>
            </div>
          </div>

          {erroModal && <p className="modal-equipe-erro" role="alert">{erroModal}</p>}

          <div className="modal-acoes">
            <button type="button" className="btn-modal-cancelar" id="btnEditarCancelar" onClick={fecharModalEditar} disabled={salvandoEdicao}>Cancelar</button>
            <button type="button" className="btn-modal-confirmar" id="btnEditarConfirmar" onClick={confirmarEditar} disabled={salvandoEdicao}>{salvandoEdicao ? 'Salvando…' : 'Salvar'}</button>
          </div>

        </div>
      </div>

      {/* modal de crop da foto */}
      <div
        className={`modal-crop-overlay${modalCropAberto ? ' aberto' : ''}`}
        id="modalCropOverlay"
        onClick={e => { if (e.target === e.currentTarget) fecharModalCrop(); }}
      >
        <div className="modal-crop">

          <h2 className="modal-crop-titulo">Posicionar foto</h2>
          <div className="modal-crop-divisor"></div>

          <div className="crop-bloco">
            <div className="crop-area">
              <img id="imagemCrop" ref={imagemCropRef} src={imagemCropSrc} alt="foto" />
            </div>
            <p className="crop-dica">Arraste para ajustar o enquadramento</p>
          </div>

          <div className="modal-crop-acoes">
            <button className="btn-crop-cancelar" id="btnCropCancelar" onClick={fecharModalCrop}>Cancelar</button>
            <button className="btn-crop-confirmar" id="btnCropConfirmar" onClick={confirmarCrop}>Confirmar</button>
          </div>

        </div>
      </div>
    </div>
  );
}