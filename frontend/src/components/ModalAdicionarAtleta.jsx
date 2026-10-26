import { useState, useEffect, useRef } from 'react';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { criarJogador } from '../services/time.js';
import { POSICOES, NOME_POSICAO } from '../constants/volei.js';
import editarfotoImg from '../assets/IMG/editarfoto.png';

export default function ModalAdicionarAtleta({ aberto, time, onFechar, onSalvo }) {
  const [nome,    setNome]    = useState('');
  const [numero,  setNumero]  = useState('');
  const [posicao, setPosicao] = useState('');

  // foto do atleta: mesma biblioteca (Cropper.js) e mesmo fluxo do Perfil.
  // `foto` é a imagem já recortada (base64); `imagemCropSrc` é a original
  // que está sendo enquadrada no modal de recorte.
  const [foto, setFoto]                     = useState('');
  const [imagemCropSrc, setImagemCropSrc]   = useState('');
  const [modalCropAberto, setModalCropAberto] = useState(false);

  const [erro, setErro]                   = useState('');
  const [campoInvalido, setCampoInvalido] = useState('');
  const [salvando, setSalvando]           = useState(false);

  const nomeRef         = useRef(null);
  const posicaoRef      = useRef(null);
  const focoAnteriorRef = useRef(null);
  const inputFotoRef    = useRef(null);
  const imagemCropRef   = useRef(null);
  const cropperRef      = useRef(null);
  // evita fechar o modal quando o técnico seleciona um texto dentro do
  // campo e solta o mouse fora do cartão (o "click" cai no overlay)
  const pressionouOverlayRef = useRef(false);

  // ao abrir: guarda quem tinha o foco e põe o cursor no nome.
  // ao fechar: limpa o formulário e devolve o foco pro botão que abriu.
  useEffect(() => {
    if (aberto) {
      focoAnteriorRef.current = document.activeElement;
      nomeRef.current?.focus();
      return;
    }

    setNome('');
    setNumero('');
    setPosicao('');
    setFoto('');
    setImagemCropSrc('');
    setModalCropAberto(false);
    destruirCropper();
    if (inputFotoRef.current) inputFotoRef.current.value = '';
    setErro('');
    setCampoInvalido('');
    focoAnteriorRef.current?.focus?.();
    focoAnteriorRef.current = null;
  }, [aberto]);

  // Esc fecha o modal (a não ser que esteja no meio do salvamento)
  useEffect(() => {
    if (!aberto) return;

    function aoApertarTecla(e) {
      if (e.key !== 'Escape' || salvando) return;
      // com o recorte aberto, o Esc fecha só o recorte (não o modal inteiro)
      if (modalCropAberto) fecharModalCrop();
      else onFechar();
    }

    document.addEventListener('keydown', aoApertarTecla);
    return () => document.removeEventListener('keydown', aoApertarTecla);
  }, [aberto, salvando, onFechar, modalCropAberto]);

  // ── FOTO DO ATLETA ───────────────────────────
  function destruirCropper() {
    if (cropperRef.current) {
      cropperRef.current.destroy();
      cropperRef.current = null;
    }
  }

  // o botão de câmera aciona o input de arquivo escondido
  function handleEscolherFoto() {
    inputFotoRef.current?.click();
  }

  // quando o técnico escolhe uma imagem, abre o modal de recorte
  function handleFotoChange(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith('image/')) {
      setErro('Escolha um arquivo de imagem.');
      e.target.value = '';
      return;
    }

    limparErro();
    const leitor = new FileReader();
    leitor.onload = ev => {
      setImagemCropSrc(ev.target.result);
      setModalCropAberto(true);
    };
    leitor.readAsDataURL(arquivo);
  }

  // inicializa o Cropper.js depois que o modal de recorte abrir
  // (mesmas opções do Perfil: recorte quadrado, arrasta a foto)
  useEffect(() => {
    if (!modalCropAberto || !imagemCropRef.current) return;

    // espera o modal estar visível antes de inicializar, senão o cropper
    // não consegue calcular as dimensões direito
    const timer = setTimeout(() => {
      destruirCropper();
      cropperRef.current = new Cropper(imagemCropRef.current, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.85,
        guides: false,
        highlight: false,
        cropBoxMovable: false,
        cropBoxResizable: false,
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [modalCropAberto, imagemCropSrc]);

  // libera o cropper se o componente sair da tela
  useEffect(() => destruirCropper, []);

  // fecha o recorte sem aplicar nada
  function fecharModalCrop() {
    setModalCropAberto(false);
    destruirCropper();
    if (inputFotoRef.current) inputFotoRef.current.value = '';
  }

  // confirma o recorte: guarda a imagem final (vai junto no "Salvar")
  function confirmarCrop() {
    if (!cropperRef.current) return;
    const canvas = cropperRef.current.getCroppedCanvas({ width: 300, height: 300 });
    setFoto(canvas.toDataURL('image/jpeg', 0.9));
    fecharModalCrop();
  }

  // assim que o técnico mexe em qualquer campo, o aviso de erro some
  // (senão a mensagem e a borda vermelha ficam presas depois de corrigir)
  function limparErro() {
    setErro('');
    setCampoInvalido('');
  }

  function handleNomeChange(e) {
    setNome(e.target.value);
    limparErro();
  }

  // número de camisa: só dígitos, até 2 casas (1 a 99)
  function handleNumeroChange(e) {
    setNumero(e.target.value.replace(/\D/g, '').slice(0, 2));
    limparErro();
  }

  function handlePosicaoChange(e) {
    setPosicao(e.target.value);
    limparErro();
  }

  // marca o campo com problema, mostra a mensagem e leva o foco até ele
  function mostrarErro(campo, mensagem, ref) {
    setCampoInvalido(campo);
    setErro(mensagem);
    ref?.current?.focus();
  }

  async function handleSalvar(e) {
    e.preventDefault();
    if (salvando) return;

    limparErro();

    if (!time) {
      setErro('Crie uma equipe antes de adicionar atletas.');
      return;
    }
    if (!nome.trim()) {
      mostrarErro('nome', 'Digite o nome do atleta.', nomeRef);
      return;
    }
    if (!posicao) {
      mostrarErro('posicao', 'Selecione a posição do atleta.', posicaoRef);
      return;
    }

    setSalvando(true);
    try {
      const jogador = await criarJogador({
        name: nome.trim(),
        position: posicao,
        team_id: time.id,
        jersey_number: numero === '' ? undefined : Number(numero),
        photo_url: foto || undefined
      });
      onSalvo?.(jogador);
    } catch (err) {
      setErro(err.message || 'Erro ao salvar atleta');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
    <div
      className={`modal-overlay${aberto ? ' aberto' : ''}`}
      // quando fechado, o modal continua no DOM (por causa da animação de
      // fade): "inert" tira ele do foco do teclado e de leitores de tela
      inert={!aberto}
      onMouseDown={e => { pressionouOverlayRef.current = e.target === e.currentTarget; }}
      onClick={e => {
        if (pressionouOverlayRef.current && e.target === e.currentTarget && !salvando) onFechar();
      }}
    >
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalAtletaTitulo"
        onSubmit={handleSalvar}
        noValidate
      >
        <h2 className="modal-titulo" id="modalAtletaTitulo">Adicionar atleta</h2>
        <div className="modal-divisor"></div>

        <div className="modal-foto-bloco">
          <div className="modal-foto-ring">
            {foto ? (
              <img className="modal-foto-img" src={foto} alt="Foto do atleta" />
            ) : (
              <svg className="modal-foto-placeholder" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            )}

            <button
              type="button"
              className="modal-foto-edit"
              aria-label={foto ? 'Trocar foto do atleta' : 'Adicionar foto do atleta'}
              onClick={handleEscolherFoto}
              disabled={salvando}
            >
              <img src={editarfotoImg} alt="" />
            </button>

            <input
              ref={inputFotoRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFotoChange}
            />
          </div>
          <span className="modal-foto-dica">Foto do atleta (opcional)</span>
        </div>

        <div className="modal-campo">
          <label className="modal-label" htmlFor="atletaNome">Nome</label>
          <input
            ref={nomeRef}
            id="atletaNome"
            className="modal-input"
            type="text"
            placeholder="Nome do atleta"
            autoComplete="off"
            value={nome}
            onChange={handleNomeChange}
            aria-invalid={campoInvalido === 'nome'}
          />
        </div>

        <div className="modal-linha-atleta">
          <div className="modal-campo">
            <label className="modal-label" htmlFor="atletaNumero">Número</label>
            <input
              id="atletaNumero"
              className="modal-input"
              type="text"
              inputMode="numeric"
              placeholder="Ex: Nº 3"
              autoComplete="off"
              value={numero}
              onChange={handleNumeroChange}
            />
          </div>

          <div className="modal-campo">
            <label className="modal-label" htmlFor="atletaPosicao">Posição</label>
            <select
              ref={posicaoRef}
              id="atletaPosicao"
              className={`modal-input${posicao ? '' : ' modal-input--vazio'}`}
              value={posicao}
              onChange={handlePosicaoChange}
              aria-invalid={campoInvalido === 'posicao'}
            >
              <option value="" disabled>Selecione</option>
              {/* o valor salvo é o nome de exibição (ex.: "Líbero"), o mesmo
                  que o técnico digitava antes no campo de texto livre */}
              {POSICOES.map(chave => (
                <option key={chave} value={NOME_POSICAO[chave]}>{NOME_POSICAO[chave]}</option>
              ))}
            </select>
          </div>
        </div>

        {erro && <p className="modal-equipe-erro" role="alert">{erro}</p>}

        <div className="modal-acoes">
          <button type="button" className="btn-modal-cancelar" onClick={onFechar} disabled={salvando}>
            Cancelar
          </button>
          <button type="submit" className="btn-modal-confirmar" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>

    {/* modal de recorte da foto — fica fora do <form> pra o Enter/Esc
        e o submit do formulário não interferirem no recorte */}
    <div
      className={`modal-crop-overlay${modalCropAberto ? ' aberto' : ''}`}
      inert={!modalCropAberto}
      onClick={e => { if (e.target === e.currentTarget) fecharModalCrop(); }}
    >
      <div className="modal-crop" role="dialog" aria-modal="true" aria-labelledby="modalCropAtletaTitulo">
        <h2 className="modal-crop-titulo" id="modalCropAtletaTitulo">Posicionar foto</h2>
        <div className="modal-crop-divisor"></div>

        <div className="crop-bloco">
          <div className="crop-area">
            <img ref={imagemCropRef} src={imagemCropSrc} alt="foto" />
          </div>
          <p className="crop-dica">Arraste para ajustar o enquadramento</p>
        </div>

        <div className="modal-crop-acoes">
          <button type="button" className="btn-crop-cancelar" onClick={fecharModalCrop}>Cancelar</button>
          <button type="button" className="btn-crop-confirmar" onClick={confirmarCrop}>Confirmar</button>
        </div>
      </div>
    </div>
    </>
  );
}