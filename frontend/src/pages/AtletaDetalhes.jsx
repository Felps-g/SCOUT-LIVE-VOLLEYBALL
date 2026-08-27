import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import '../../css/atleta-detalhes.css';
import '../../css/adicionar-atletas.css';
import lixeiraImg from '../assets/IMG/lixeira.png';
import voltarImg from '../assets/IMG/voltar.png';
import cameraImg from '../assets/IMG/camera.png';
import salvarImg from '../assets/IMG/salvar.png';
import perfilImg from '../assets/IMG/perfil.png';
import { apiRequest } from '../services/api.js';
import { atualizarJogador } from '../services/time.js';

// spinner central exibido enquanto os dados do atleta ainda não chegaram da API
function CarregandoAtleta() {
  return (
    <div className="carregando-jogos">
      <motion.div
        className="spinner"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      <span className="carregando-texto">Carregando atleta…</span>
    </div>
  );
}

export default function AtletaDetalhes() {
  // com hash routing o query string fica dentro do hash: #/app/atletas/detalhes?id=123
  const queryString = window.location.hash.split('?')[1] || '';
  const params = new URLSearchParams(queryString);
  const atletaId = params.get('id');

  const [atleta, setAtleta] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  /* ── EDIÇÃO ── */
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState('');

  const [nome, setNome] = useState('');
  const [numero, setNumero] = useState('');
  const [posicao, setPosicao] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [idade, setIdade] = useState('');
  const [altura, setAltura] = useState('');
  const [peso, setPeso] = useState('');
  const [fotoSrc, setFotoSrc] = useState('');

  const inputFotoRef = useRef(null);

  async function carregar() {
    if (!atletaId) {
      setErro('Atleta não informado na URL.');
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro('');
    try {
      const dados = await apiRequest(`/players/${atletaId}`);
      setAtleta(dados);
      preencherFormulario(dados);
    } catch (err) {
      setErro(err.message || 'Erro ao buscar atleta');
    } finally {
      setCarregando(false);
    }
  }

  // copia os dados salvos pro formulário de edição — usado tanto ao
  // carregar quanto ao cancelar uma edição (descarta o que foi digitado)
  function preencherFormulario(dados) {
    setNome(dados.name || '');
    setNumero(dados.jersey_number ?? '');
    setPosicao(dados.position || '');
    setCpf(dados.cpf || '');
    setRg(dados.rg || '');
    setIdade(dados.age ?? '');
    setAltura(dados.height || '');
    setPeso(dados.weight || '');
    setFotoSrc(dados.photo_url || '');
  }

  useEffect(() => { carregar(); }, [atletaId]);

  // MÁSCARAS (iguais às da tela de Adicionar Atletas, pra manter a mesma
  // formatação com pontuação que o técnico digitou)
  function handleRgChange(e) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 9);
    if (v.length > 8) v = v.slice(0,2) + '.' + v.slice(2,5) + '.' + v.slice(5,8) + '-' + v.slice(8);
    else if (v.length > 5) v = v.slice(0,2) + '.' + v.slice(2,5) + '.' + v.slice(5);
    else if (v.length > 2) v = v.slice(0,2) + '.' + v.slice(2);
    setRg(v);
  }

  function handleCpfChange(e) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9) v = v.slice(0,3) + '.' + v.slice(3,6) + '.' + v.slice(6,9) + '-' + v.slice(9);
    else if (v.length > 6) v = v.slice(0,3) + '.' + v.slice(3,6) + '.' + v.slice(6);
    else if (v.length > 3) v = v.slice(0,3) + '.' + v.slice(3);
    setCpf(v);
  }

  // troca a foto direto (sem recorte, pra manter essa tela simples)
  function handleFotoChange(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = ev => setFotoSrc(ev.target.result);
    leitor.readAsDataURL(arquivo);
  }

  function iniciarEdicao() {
    preencherFormulario(atleta);
    setErroSalvar('');
    setEditando(true);
  }

  function cancelarEdicao() {
    preencherFormulario(atleta);
    setErroSalvar('');
    setEditando(false);
    if (inputFotoRef.current) inputFotoRef.current.value = '';
  }

  async function salvarEdicao() {
    setErroSalvar('');

    if (!nome.trim()) { setErroSalvar('Preencha o nome.'); return; }
    if (!posicao.trim() || !altura.trim() || !cpf.trim()) {
      setErroSalvar('Preencha posição, altura e CPF — são obrigatórios.');
      return;
    }

    setSalvando(true);
    try {
      const atualizado = await atualizarJogador(atletaId, {
        name: nome.trim(),
        position: posicao.trim(),
        height: altura.trim(),
        // mantém a formatação exata (pontos, traço) que o técnico digitou
        cpf: cpf.trim(),
        rg: rg.trim(),
        age: String(idade).trim(),
        weight: peso.trim(),
        photo_url: fotoSrc,
        jersey_number: numero === '' ? undefined : numero
      });

      setAtleta(atualizado);
      preencherFormulario(atualizado);
      setEditando(false);
    } catch (err) {
      setErroSalvar(err.message || 'Erro ao salvar alterações');
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir() {
    const confirmar = window.confirm('Tem certeza que deseja excluir este atleta?');
    if (!confirmar) return;

    try {
      await apiRequest(`/players/${atletaId}`, { method: 'DELETE' });
      window.location.hash = '#/app/atletas';
    } catch (err) {
      alert(err.message || 'Erro ao excluir atleta');
    }
  }

  if (carregando) {
    return (
      <div className="pagina-app">
        <div className="atletas-titulo-wrapper"><h1 className="atletas-titulo">Atletas</h1></div>
        <main className="atletas-conteudo">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <CarregandoAtleta />
          </motion.div>
        </main>
      </div>
    );
  }

  if (erro || !atleta) {
    return (
      <div className="pagina-app">
        <div className="atletas-titulo-wrapper"><h1 className="atletas-titulo">Atletas</h1></div>
        <main className="atletas-conteudo">
          <p style={{ color: '#ff6b7a' }}>{erro || 'Atleta não encontrado.'}</p>
        </main>
        <footer className="rodape">
          <a href="#/app/atletas" className="botao-inicio">
            <img src={voltarImg} className="icone-voltar" />
            Voltar
          </a>
        </footer>
      </div>
    );
  }

  return (
    <div className="pagina-app">
      <div className="atletas-titulo-wrapper">
        <h1 className="atletas-titulo">Atletas</h1>
      </div>

      <main className="atletas-conteudo">

        <div className="form-topo">
          {editando ? (
            <>
              <button className="btn-salvar" onClick={salvarEdicao} disabled={salvando}>
                <img src={salvarImg} className="icone-salvar" />
                {salvando ? 'Salvando…' : 'Salvar alterações'}
              </button>
              <button className="btn-excluir" type="button" onClick={cancelarEdicao} disabled={salvando}>
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button className="btn-salvar" type="button" onClick={iniciarEdicao}>
                Editar atleta
              </button>
              <button className="btn-excluir" id="btnExcluir" onClick={handleExcluir}>
                <img src={lixeiraImg} className="icone-lixo" />
                Excluir atleta
              </button>
            </>
          )}
        </div>

        {erroSalvar && <p style={{ color: '#ff6b7a', marginTop: 4 }}>{erroSalvar}</p>}

        <div className="form-card">

          <div className="form-foto-col">
            <div className="foto-preview">
              {!fotoSrc && (
                <img className="icone-foto-vazia" src={perfilImg} alt="" />
              )}
              {fotoSrc && <img src={fotoSrc} alt="" />}
            </div>
            {editando && (
              <>
                <label className="btn-foto" htmlFor="inputFotoEdicao">
                  <img src={cameraImg} className="icone-camera" />
                  Trocar foto
                </label>
                <input
                  type="file"
                  id="inputFotoEdicao"
                  ref={inputFotoRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFotoChange}
                />
              </>
            )}
          </div>

          <div className="form-divisor"></div>

          <div className="form-campos">

            <div className="form-row">
              <div className="campo-grupo">
                <span className="campo-label">Nome</span>
                {editando ? (
                  <input className="campo-input" value={nome} onChange={e => setNome(e.target.value)} />
                ) : (
                  <span className="campo-valor">{atleta.name}</span>
                )}
              </div>
              <div className="campo-grupo">
                <span className="campo-label">Número</span>
                {editando ? (
                  <input className="campo-input" value={numero} onChange={e => setNumero(e.target.value)} />
                ) : (
                  <span className="campo-valor">{atleta.jersey_number ?? '—'}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="campo-grupo">
                <span className="campo-label">Posição</span>
                {editando ? (
                  <input className="campo-input" value={posicao} onChange={e => setPosicao(e.target.value)} />
                ) : (
                  <span className="campo-valor">{atleta.position}</span>
                )}
              </div>
              <div className="campo-grupo">
                <span className="campo-label">CPF</span>
                {editando ? (
                  <input className="campo-input" value={cpf} onChange={handleCpfChange} />
                ) : (
                  <span className="campo-valor">{atleta.cpf}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="campo-grupo">
                <span className="campo-label">RG</span>
                {editando ? (
                  <input className="campo-input" placeholder="00.000.000-0" value={rg} onChange={handleRgChange} />
                ) : (
                  <span className="campo-valor">{atleta.rg || '—'}</span>
                )}
              </div>
              <div className="campo-grupo">
                <span className="campo-label">Idade</span>
                {editando ? (
                  <input className="campo-input" value={idade} onChange={e => setIdade(e.target.value)} />
                ) : (
                  <span className="campo-valor">{atleta.age ?? '—'}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="campo-grupo">
                <span className="campo-label">Altura</span>
                {editando ? (
                  <input className="campo-input" value={altura} onChange={e => setAltura(e.target.value)} />
                ) : (
                  <span className="campo-valor">{atleta.height || '—'}</span>
                )}
              </div>
              <div className="campo-grupo">
                <span className="campo-label">Peso</span>
                {editando ? (
                  <input className="campo-input" value={peso} onChange={e => setPeso(e.target.value)} />
                ) : (
                  <span className="campo-valor">{atleta.weight || '—'}</span>
                )}
              </div>
            </div>

          </div>
        </div>

      </main>

      <footer className="rodape">
        <a href="#/app/atletas" className="botao-inicio">
          <img src={voltarImg} className="icone-voltar" />
          Voltar
        </a>
      </footer>
    </div>
  );
}