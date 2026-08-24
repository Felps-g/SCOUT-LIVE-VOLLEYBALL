import { useState, useEffect, useRef } from 'react';
import '../../css/adicionar-atletas.css';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import salvarImg from '../assets/IMG/salvar.png';
import cameraImg from '../assets/IMG/camera.png';
import voltarImg from '../assets/IMG/voltar.png';
import perfilImg from '../assets/IMG/perfil.png';
import { criarJogador, listarTimes, getTimeSelecionado, setTimeSelecionado } from '../services/time.js';

export default function AdicionarAtletas() {
  // guarda a instância do cropper pra poder destruir quando fechar o modal
  const cropperRef = useRef(null);

  const [fotoSrc, setFotoSrc]           = useState('');
  const [modalCropAberto, setModalCropAberto] = useState(false);
  const [imagemCropSrc, setImagemCropSrc]   = useState('');
  const [avisoVisivel, setAvisoVisivel]     = useState(false);

  const [timeAtual, setTimeAtual] = useState(null);

  // Não mostramos mais o seletor/criador de time aqui: o time do técnico já
  // foi criado antes (na Escalação) e fica salvo no localStorage. Aqui a
  // gente só recupera esse time salvo em segundo plano.
  useEffect(() => {
    async function carregarTimeAtual() {
      try {
        const lista = await listarTimes();
        const salvo = getTimeSelecionado();
        const aindaExiste = salvo && lista?.some(t => t.id === salvo.id);

        if (aindaExiste) {
          setTimeAtual(salvo);
        } else if (lista?.length > 0) {
          setTimeSelecionado(lista[0]);
          setTimeAtual(lista[0]);
        }
      } catch {
        // se der erro aqui, o salvarAtleta já trata a falta de time selecionado
      }
    }
    carregarTimeAtual();
  }, []);

  const [nome,    setNome]    = useState('');
  const [numero,  setNumero]  = useState('');
  const [posicao, setPosicao] = useState('');
  const [rg,      setRg]      = useState('');
  const [idade,   setIdade]   = useState('');
  const [cpf,     setCpf]     = useState('');
  const [altura,  setAltura]  = useState('');
  const [peso,    setPeso]    = useState('');

  const [campoErro, setCampoErro] = useState('');
  const [erroSalvar, setErroSalvar] = useState('');
  const [salvando, setSalvando] = useState(false);

  const inputFotoRef   = useRef(null);
  const imagemCropRef  = useRef(null);

  // quando o técnico escolhe uma foto, abre o modal de crop em vez de jogar direto no preview
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

  // inicializa o Cropper.js depois que o modal abrir e a imagem estiver no DOM
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
        aspectRatio: 1,         // recorte sempre quadrado, igual ao preview
        viewMode: 1,            // não deixa o recorte sair da imagem
        dragMode: 'move',       // arrasta a foto, não a caixa de recorte
        autoCropArea: 0.85,     // começa com 85% da área já selecionada
        guides: false,          // sem linhas de grade pra não poluir a tela
        highlight: false,
        cropBoxMovable: false,  // a caixa fica fixa, só a foto se move
        cropBoxResizable: false,
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [modalCropAberto, imagemCropSrc]);

  // fecha o modal sem salvar nada
  function fecharModalCrop() {
    setModalCropAberto(false);

    if (cropperRef.current) {
      cropperRef.current.destroy();
      cropperRef.current = null;
    }

    // limpa o input pra poder selecionar a mesma foto de novo se quiser
    if (inputFotoRef.current) inputFotoRef.current.value = '';
  }

  // confirma o recorte, gera o canvas e joga no preview
  function confirmarCrop() {
    if (!cropperRef.current) return;

    // gera a imagem final em 300x300 — tamanho ideal pra foto de perfil
    const canvas    = cropperRef.current.getCroppedCanvas({ width: 300, height: 300 });
    const fotoFinal = canvas.toDataURL('image/jpeg', 0.9);

    setFotoSrc(fotoFinal);
    fecharModalCrop();
  }

  // MÁSCARAS
  // formata o rg enquanto o técnico digita: 00.000.000-0
  function handleRgChange(e) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 9);
    if (v.length > 8) v = v.slice(0,2) + '.' + v.slice(2,5) + '.' + v.slice(5,8) + '-' + v.slice(8);
    else if (v.length > 5) v = v.slice(0,2) + '.' + v.slice(2,5) + '.' + v.slice(5);
    else if (v.length > 2) v = v.slice(0,2) + '.' + v.slice(2);
    setRg(v);
  }

  // formata o cpf enquanto digita: 000.000.000-00
  function handleCpfChange(e) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9) v = v.slice(0,3) + '.' + v.slice(3,6) + '.' + v.slice(6,9) + '-' + v.slice(9);
    else if (v.length > 6) v = v.slice(0,3) + '.' + v.slice(3,6) + '.' + v.slice(6);
    else if (v.length > 3) v = v.slice(0,3) + '.' + v.slice(3);
    setCpf(v);
  }

  // SALVAR
  async function salvarAtleta() {
    setErroSalvar('');

    if (!timeAtual) {
      setErroSalvar('Selecione ou crie um time antes de adicionar um atleta.');
      return;
    }

    // só o nome é obrigatório pra não travar o cadastro por falta de dado secundário
    if (!nome.trim()) {
      destacarCampoVazio('campoNome');
      return;
    }

    // A API (POST /api/players) exige name, position, height, cpf e team_id.
    // rg, idade, peso e foto são opcionais.
    if (!posicao.trim() || !altura.trim() || !cpf.trim()) {
      setErroSalvar('Preencha posição, altura e CPF — são obrigatórios.');
      return;
    }

    setSalvando(true);
    try {
      await criarJogador({
        name: nome.trim(),
        position: posicao.trim(),
        height: altura.trim(),
        // mantém a formatação exata que o técnico digitou (pontos, traço
        // etc.) em vez de guardar só os números
        cpf: cpf.replace(/\D/g, ''),
        rg: rg.trim() || undefined,
        age: idade.trim() || undefined,
        weight: peso.trim() || undefined,
        photo_url: fotoSrc || undefined,
        team_id: timeAtual.id,
        jersey_number: numero || undefined
      });

      mostrarAviso();
      limparForm();
    } catch (err) {
      setErroSalvar(err.message || 'Erro ao salvar atleta');
    } finally {
      setSalvando(false);
    }
  }

  // pisca a borda vermelha no campo que ficou vazio
  function destacarCampoVazio(id) {
    setCampoErro(id);
    setTimeout(() => setCampoErro(''), 2000);
  }

  // limpa tudo depois de salvar
  function limparForm() {
    setNome(''); setNumero(''); setPosicao(''); setRg('');
    setIdade(''); setCpf(''); setAltura(''); setPeso('');
    setFotoSrc('');
    if (inputFotoRef.current) inputFotoRef.current.value = '';
  }

  // mostra o aviso de sucesso por 2.5 segundos e some
  function mostrarAviso() {
    setAvisoVisivel(true);
    setTimeout(() => setAvisoVisivel(false), 2500);
  }

  function inputStyle(id) {
    return campoErro === id ? { borderColor: 'rgba(232, 39, 58, 0.7)' } : {};
  }

  return (
    <div className="pagina-app">
      <div className="atletas-titulo-wrapper">
        <h1 className="atletas-titulo">Atletas</h1>
      </div>

      <main className="atletas-conteudo">

        <div className="form-topo">
          <button className="btn-salvar" id="btnSalvar" onClick={salvarAtleta} disabled={salvando}>
            <img src={salvarImg} className="icone-salvar" />
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>

        {erroSalvar && <p style={{ color: '#ff6b7a', marginBottom: 12 }}>{erroSalvar}</p>}

        <div className="form-card">

          <div className="form-foto-col">
            <div className="foto-preview" id="fotoPreview">
              {!fotoSrc && (
                <img className="icone-foto-vazia" src={perfilImg} alt="" />
              )}
              {fotoSrc && <img id="fotoImg" src={fotoSrc} alt="" style={{ display: 'block' }} />}
            </div>
            <label className="btn-foto" htmlFor="inputFoto">
              <img src={cameraImg} className="icone-camera" />
              Adicionar foto
            </label>
            <input
              type="file"
              id="inputFoto"
              ref={inputFotoRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFotoChange}
            />
          </div>

          <div className="form-divisor"></div>

          <div className="form-campos">

            <div className="form-row">
              <div className="campo-grupo">
                <label className="campo-label">Nome</label>
                <input type="text" className="campo-input" placeholder="Nome completo" id="campoNome"
                  value={nome} onChange={e => setNome(e.target.value)} style={inputStyle('campoNome')} />
              </div>
              <div className="campo-grupo">
                <label className="campo-label">Número</label>
                <input type="text" className="campo-input" placeholder="Ex: 10" id="campoNumero"
                  value={numero} onChange={e => setNumero(e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="campo-grupo">
                <label className="campo-label">Posição</label>
                <input type="text" className="campo-input" placeholder="Ex: Líbero" id="campoPosicao"
                  value={posicao} onChange={e => setPosicao(e.target.value)} />
              </div>
              <div className="campo-grupo">
                <label className="campo-label">RG</label>
                <input type="text" className="campo-input" placeholder="00.000.000-0" id="campoRg"
                  value={rg} onChange={handleRgChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="campo-grupo">
                <label className="campo-label">Idade</label>
                <input type="text" className="campo-input" placeholder="Ex: 22" id="campoIdade"
                  value={idade} onChange={e => setIdade(e.target.value)} />
              </div>
              <div className="campo-grupo">
                <label className="campo-label">CPF</label>
                <input type="text" className="campo-input" placeholder="000.000.000-00" id="campoCpf"
                  value={cpf} onChange={handleCpfChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="campo-grupo">
                <label className="campo-label">Altura</label>
                <input type="text" className="campo-input" placeholder="Ex: 1,75m" id="campoAltura"
                  value={altura} onChange={e => setAltura(e.target.value)} />
              </div>
              <div className="campo-grupo">
                <label className="campo-label">Peso</label>
                <input type="text" className="campo-input" placeholder="Ex: 65kg" id="campoPeso"
                  value={peso} onChange={e => setPeso(e.target.value)} />
              </div>
            </div>

          </div>
        </div>

      </main>

      <footer className="rodape">
        <a href="#/app/atletas" className="botao-inicio">
          <img src={voltarImg} className="icone-voltar" />
          voltar
        </a>
      </footer>

      <div className={`aviso${avisoVisivel ? ' visivel' : ''}`} id="aviso">✔ Atleta salvo com sucesso!</div>

      {/* modal de recorte da foto */}
      <div
        className={`modal-crop-overlay${modalCropAberto ? ' aberto' : ''}`}
        id="modalCropOverlay"
        onClick={e => { if (e.target === e.currentTarget) fecharModalCrop(); }}
      >
        <div className="modal-crop">

          <h2 className="modal-crop-titulo">Posicionar foto</h2>
          <div className="modal-crop-divisor"></div>

          <div className="crop-area">
            <img id="imagemCrop" ref={imagemCropRef} src={imagemCropSrc} alt="foto" />
          </div>

          <p className="crop-dica">Arraste para ajustar o enquadramento</p>

          <div className="modal-crop-acoes">
            <button className="btn-crop-cancelar" id="btnCropCancelar" onClick={fecharModalCrop}>Cancelar</button>
            <button className="btn-crop-confirmar" id="btnCropConfirmar" onClick={confirmarCrop}>Confirmar</button>
          </div>

        </div>
      </div>
    </div>
  );
}
