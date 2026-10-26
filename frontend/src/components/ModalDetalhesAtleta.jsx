import { useEffect, useRef, useState } from 'react';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { excluirJogador, atualizarJogador } from '../services/time.js';
import { POSICOES, NOME_POSICAO } from '../constants/volei.js';
import editarfotoImg from '../assets/IMG/editarfoto.png';

// campo vazio aparece como traço
function valorOuTraco(valor) {
  if (valor === null || valor === undefined) return '—';
  const texto = String(valor).trim();
  return texto === '' ? '—' : texto;
}

// Modal com nome, número e posição do atleta, com opção de editar
// (inclusive a foto) e de excluir.
// `atleta` vem direto da lista (a API já devolve todas as colunas), então
// abre na hora, sem nova chamada. O atleta fica guardado pelo pai mesmo
// depois de fechar, pra o conteúdo não sumir durante o fade de saída.
export default function ModalDetalhesAtleta({ aberto, atleta, onFechar, onExcluido, onEditado }) {
  // exclusão: "confirmando" troca os botões por um "Tem certeza?"
  const [confirmando, setConfirmando] = useState(false);
  const [excluindo, setExcluindo]     = useState(false);
  const [erro, setErro]               = useState('');

  // edição
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [nome,    setNome]      = useState('');
  const [numero,  setNumero]    = useState('');
  const [posicao, setPosicao]   = useState('');
  // `foto` é a imagem já recortada (base64); só é enviada se foi trocada
  const [foto, setFoto]                 = useState('');
  const [fotoAlterada, setFotoAlterada] = useState(false);
  // recorte da foto (mesmo Cropper.js do Perfil e do Adicionar atleta)
  const [imagemCropSrc, setImagemCropSrc]     = useState('');
  const [modalCropAberto, setModalCropAberto] = useState(false);

  const fecharRef       = useRef(null);
  const cancelarRef     = useRef(null);
  const nomeRef         = useRef(null);
  const focoAnteriorRef = useRef(null);
  const inputFotoRef    = useRef(null);
  const imagemCropRef   = useRef(null);
  const cropperRef      = useRef(null);
  // evita fechar quando o clique começa dentro do cartão e termina no overlay
  const pressionouOverlayRef = useRef(false);

  const ocupado = excluindo || salvando;

  // ao abrir: guarda quem tinha o foco e leva o foco pro botão Fechar.
  // ao fechar: limpa tudo e devolve o foco pro botão que abriu.
  useEffect(() => {
    if (aberto) {
      focoAnteriorRef.current = document.activeElement;
      fecharRef.current?.focus();
      return;
    }
    setConfirmando(false);
    setExcluindo(false);
    setEditando(false);
    setSalvando(false);
    setModalCropAberto(false);
    setImagemCropSrc('');
    destruirCropper();
    setErro('');
    focoAnteriorRef.current?.focus?.();
    focoAnteriorRef.current = null;
  }, [aberto]);

  // entrou na edição: cursor no nome. Saiu: foco volta pro Fechar.
  useEffect(() => {
    if (editando) nomeRef.current?.focus();
    else if (aberto) fecharRef.current?.focus();
  }, [editando]);

  // ao pedir confirmação de exclusão, o foco vai pro "Cancelar" (lado seguro)
  useEffect(() => {
    if (confirmando) cancelarRef.current?.focus();
  }, [confirmando]);

  // Esc volta um passo: recorte → edição → confirmação → fecha o modal
  useEffect(() => {
    if (!aberto) return;

    function aoApertarTecla(e) {
      if (e.key !== 'Escape' || ocupado) return;
      if (modalCropAberto)    fecharModalCrop();
      else if (editando)      cancelarEdicao();
      else if (confirmando)   { setConfirmando(false); setErro(''); }
      else                    onFechar();
    }

    document.addEventListener('keydown', aoApertarTecla);
    return () => document.removeEventListener('keydown', aoApertarTecla);
  }, [aberto, onFechar, modalCropAberto, editando, confirmando, ocupado]);

  // ── EXCLUIR ──────────────────────────────────
  async function handleExcluir() {
    if (!atleta || excluindo) return;

    setExcluindo(true);
    setErro('');
    try {
      // o segundo parâmetro invalida só o cache de jogadores desse time
      await excluirJogador(atleta.id, atleta.team_id);
      onExcluido?.(atleta);
    } catch (err) {
      setErro(err.message || 'Erro ao excluir atleta');
      setConfirmando(false);
    } finally {
      setExcluindo(false);
    }
  }

  // ── EDITAR ───────────────────────────────────
  function iniciarEdicao(e) {
    // o botão "Editar" e o botão "Salvar" ocupam o mesmo lugar na tela;
    // sem isso o navegador podia tratar o clique em "Editar" como submit
    e?.preventDefault();
    if (!atleta) return;
    setNome(atleta.name || '');
    setNumero(atleta.jersey_number === null || atleta.jersey_number === undefined ? '' : String(atleta.jersey_number));
    setPosicao(atleta.position || '');
    setFoto(atleta.photo_url || '');
    setFotoAlterada(false);
    setErro('');
    setConfirmando(false);
    setEditando(true);
  }

  function cancelarEdicao() {
    setEditando(false);
    setErro('');
    setModalCropAberto(false);
    destruirCropper();
    if (inputFotoRef.current) inputFotoRef.current.value = '';
  }

  // número de camisa: só dígitos, até 2 casas (1 a 99)
  function handleNumeroChange(e) {
    setNumero(e.target.value.replace(/\D/g, '').slice(0, 2));
    setErro('');
  }

  // posições do cadastro. Atletas antigos podem ter uma posição digitada
  // à mão que não está na lista: ela entra como opção extra, pra não ser
  // perdida (nem trocada sem querer) ao abrir a edição.
  const opcoesPosicao = POSICOES.map(chave => NOME_POSICAO[chave]);
  if (posicao && !opcoesPosicao.includes(posicao)) opcoesPosicao.push(posicao);

  async function handleSalvar() {
    if (!atleta || salvando) return;
    setErro('');

    if (!nome.trim()) {
      setErro('Digite o nome do atleta.');
      nomeRef.current?.focus();
      return;
    }
    if (!posicao) {
      setErro('Selecione a posição do atleta.');
      return;
    }

    const payload = {
      name: nome.trim(),
      position: posicao,
      // vazio limpa o número (null); o backend só mexe nele se não for undefined
      jersey_number: numero === '' ? null : Number(numero)
    };
    // a foto vai em base64: só manda se o técnico escolheu outra
    if (fotoAlterada) payload.photo_url = foto;

    setSalvando(true);
    try {
      const atualizado = await atualizarJogador(atleta.id, payload);
      setEditando(false);
      onEditado?.(atualizado);
    } catch (err) {
      setErro(err.message || 'Erro ao salvar alterações');
    } finally {
      setSalvando(false);
    }
  }

  // Enter dentro do formulário de edição salva
  function handleSubmit(e) {
    e.preventDefault();
    if (editando) handleSalvar();
  }

  // ── FOTO (mesmo fluxo do Adicionar atleta) ───
  function destruirCropper() {
    if (cropperRef.current) {
      cropperRef.current.destroy();
      cropperRef.current = null;
    }
  }

  function handleEscolherFoto() {
    inputFotoRef.current?.click();
  }

  function handleFotoChange(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith('image/')) {
      setErro('Escolha um arquivo de imagem.');
      e.target.value = '';
      return;
    }

    setErro('');
    const leitor = new FileReader();
    leitor.onload = ev => {
      setImagemCropSrc(ev.target.result);
      setModalCropAberto(true);
    };
    leitor.readAsDataURL(arquivo);
  }

  // inicializa o Cropper.js depois que o modal de recorte abrir
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

  function fecharModalCrop() {
    setModalCropAberto(false);
    destruirCropper();
    if (inputFotoRef.current) inputFotoRef.current.value = '';
  }

  function confirmarCrop() {
    if (!cropperRef.current) return;
    const canvas = cropperRef.current.getCroppedCanvas({ width: 300, height: 300 });
    setFoto(canvas.toDataURL('image/jpeg', 0.9));
    setFotoAlterada(true);
    fecharModalCrop();
  }

  // foto exibida: a nova (em edição) ou a que já está salva
  const fotoExibida = editando ? foto : (atleta?.photo_url || '');

  return (
    <>
    <div
      className={`modal-overlay${aberto ? ' aberto' : ''}`}
      // fechado, o modal continua no DOM (por causa do fade): "inert" tira
      // ele do foco do teclado e de leitores de tela
      inert={!aberto}
      onMouseDown={e => { pressionouOverlayRef.current = e.target === e.currentTarget; }}
      onClick={e => {
        if (pressionouOverlayRef.current && e.target === e.currentTarget && !ocupado) onFechar();
      }}
    >
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalDetalhesAtletaTitulo"
        onSubmit={handleSubmit}
        noValidate
      >
        <h2 className="modal-titulo" id="modalDetalhesAtletaTitulo">
          {editando ? 'Editar atleta' : 'Detalhes do atleta'}
        </h2>
        <div className="modal-divisor"></div>

        {atleta && (
          <>
            <div className="modal-foto-bloco">
              <div className="modal-foto-ring">
                {fotoExibida ? (
                  <img className="modal-foto-img" src={fotoExibida} alt={`Foto de ${atleta.name}`} />
                ) : (
                  <svg className="modal-foto-placeholder" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                )}

                {editando && (
                  <>
                    <button
                      type="button"
                      className="modal-foto-edit"
                      aria-label="Trocar foto do atleta"
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
                  </>
                )}
              </div>
            </div>

            {editando ? (
              <>
                <div className="modal-campo">
                  <label className="modal-label" htmlFor="editAtletaNome">Nome</label>
                  <input
                    ref={nomeRef}
                    id="editAtletaNome"
                    className="modal-input"
                    type="text"
                    placeholder="Nome do atleta"
                    autoComplete="off"
                    value={nome}
                    onChange={e => { setNome(e.target.value); setErro(''); }}
                    aria-invalid={!!erro && !nome.trim()}
                  />
                </div>

                <div className="modal-linha-atleta">
                  <div className="modal-campo">
                    <label className="modal-label" htmlFor="editAtletaNumero">Número</label>
                    <input
                      id="editAtletaNumero"
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
                    <label className="modal-label" htmlFor="editAtletaPosicao">Posição</label>
                    <select
                      id="editAtletaPosicao"
                      className={`modal-input${posicao ? '' : ' modal-input--vazio'}`}
                      value={posicao}
                      onChange={e => { setPosicao(e.target.value); setErro(''); }}
                    >
                      <option value="" disabled>Selecione</option>
                      {opcoesPosicao.map(op => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <dl className="modal-detalhes-grade">
                <div className="modal-detalhes-item modal-detalhes-item--largo">
                  <dt className="modal-label">Nome</dt>
                  <dd className="modal-detalhes-valor">{valorOuTraco(atleta.name)}</dd>
                </div>
                <div className="modal-detalhes-item">
                  <dt className="modal-label">Número</dt>
                  <dd className="modal-detalhes-valor">{valorOuTraco(atleta.jersey_number)}</dd>
                </div>
                <div className="modal-detalhes-item">
                  <dt className="modal-label">Posição</dt>
                  <dd className="modal-detalhes-valor">{valorOuTraco(atleta.position)}</dd>
                </div>
              </dl>
            )}
          </>
        )}

        {confirmando && (
          <p className="modal-detalhes-aviso" role="alert">
            Excluir <strong>{atleta?.name}</strong>? Essa ação não pode ser desfeita.
          </p>
        )}

        {erro && <p className="modal-equipe-erro" role="alert">{erro}</p>}

        {editando ? (
          <div key="acoes-edicao" className="modal-acoes">
            <button type="button" className="btn-modal-cancelar" onClick={cancelarEdicao} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className="btn-modal-confirmar" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        ) : confirmando ? (
          <div key="acoes-confirmar" className="modal-acoes">
            <button
              ref={cancelarRef}
              type="button"
              className="btn-modal-cancelar"
              onClick={() => { setConfirmando(false); setErro(''); }}
              disabled={excluindo}
            >
              Cancelar
            </button>
            <button type="button" className="btn-modal-excluir" onClick={handleExcluir} disabled={excluindo}>
              {excluindo ? 'Excluindo…' : 'Sim, excluir'}
            </button>
          </div>
        ) : (
          <div key="acoes-detalhes" className="modal-acoes modal-acoes--tres">
            <button
              type="button"
              className="btn-modal-excluir"
              onClick={() => { setErro(''); setConfirmando(true); }}
              disabled={!atleta}
            >
              Excluir
            </button>
            <button type="button" className="btn-modal-confirmar" onClick={iniciarEdicao} disabled={!atleta}>
              Editar
            </button>
            <button ref={fecharRef} type="button" className="btn-modal-cancelar" onClick={onFechar}>
              Fechar
            </button>
          </div>
        )}
      </form>
    </div>

    {/* modal de recorte da foto — fica fora do <form> pra o Enter/Esc
        e o submit do formulário não interferirem no recorte */}
    <div
      className={`modal-crop-overlay${modalCropAberto ? ' aberto' : ''}`}
      inert={!modalCropAberto}
      onClick={e => { if (e.target === e.currentTarget) fecharModalCrop(); }}
    >
      <div className="modal-crop" role="dialog" aria-modal="true" aria-labelledby="modalCropDetalhesTitulo">
        <h2 className="modal-crop-titulo" id="modalCropDetalhesTitulo">Posicionar foto</h2>
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