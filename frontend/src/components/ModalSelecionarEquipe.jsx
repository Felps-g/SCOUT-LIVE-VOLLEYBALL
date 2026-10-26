import { useState, useEffect } from 'react';

import { listarTimes, criarTime, setTimeSelecionado, selecaoEquipePendente } from '../services/time.js';

// categoria usada quando a equipe é criada por aqui (o modal só pede o
// nome, então a categoria "de verdade" pode ser ajustada depois na tela
// de Equipes, que edita o time normalmente)
const CATEGORIA_PADRAO = 'Geral';

// Aparece só logo depois do login (montado em Inicial.jsx), bloqueando a
// tela até ela escolher uma equipe — ou, se ainda não tem nenhuma, criar
// a primeira. Depois que a equipe é selecionada, não aparece mais (nem ao
// voltar pra tela inicial) até o próximo login.
export default function ModalSelecionarEquipe() {
  const [carregando, setCarregando] = useState(true);
  const [visivel, setVisivel] = useState(false);
  const [times, setTimes] = useState([]);

  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');

  useEffect(() => {
    let ativo = true;

    // não acabou de logar (ou já escolheu a equipe): nem busca os times
    if (!selecaoEquipePendente()) {
      setCarregando(false);
      return;
    }

    async function verificar() {
      try {
        const lista = await listarTimes();
        if (!ativo) return;

        // times criados automaticamente como adversário (ver services/time.js)
        // não são equipes reais do técnico — não entram nas opções aqui
        const listaFiltrada = (lista || []).filter(t => t.category !== 'Adversário');
        setTimes(listaFiltrada);

        // acabou de logar: pede pra escolher (ou criar) a equipe, mesmo
        // que já tenha uma selecionada de uma sessão anterior
        setVisivel(true);
      } catch {
        // se a API falhar aqui, não trava a pessoa num modal que ela nem
        // consegue preencher — deixa passar; a tela que ela abrir na
        // sequência (Equipes, Scout etc.) mostra o erro de novo
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    verificar();
    return () => { ativo = false; };
  }, []);

  function selecionar(time) {
    setTimeSelecionado(time);
    setVisivel(false);
  }

  async function handleCriar(e) {
    e.preventDefault();
    setErroForm('');

    if (!nome.trim()) { setErroForm('Digite o nome da equipe.'); return; }

    setSalvando(true);
    try {
      const novo = await criarTime(nome.trim(), CATEGORIA_PADRAO);
      setTimeSelecionado(novo);
      setVisivel(false);
    } catch (err) {
      setErroForm(err.message || 'Erro ao criar equipe');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando || !visivel) return null;

  const temEquipes = times.length > 0;

  return (
    <div className="modal-equipe-overlay aberto">
      <div className="modal-equipe">

        {temEquipes ? (
          <>
            <header className="modal-cabecalho">
              <h2 className="modal-equipe-titulo">Para iniciar, selecione sua equipe</h2>
              <p className="modal-equipe-subtitulo">Escolha qual equipe você quer acompanhar agora.</p>
            </header>

            <div className="modal-equipe-lista">
              {times.map(time => (
                <button key={time.id} type="button" className="modal-equipe-item" onClick={() => selecionar(time)}>
                  <span className="modal-equipe-item-nome">{time.name}</span>
                  {time.category && <span className="modal-equipe-item-categoria">{time.category}</span>}
                </button>
              ))}
            </div>

            <a href="#/app/equipes" className="modal-equipe-link" onClick={() => setVisivel(false)}>
              Gerenciar equipes
            </a>
          </>
        ) : (
          <>
            <header className="modal-cabecalho">
              <h2 className="modal-equipe-titulo">Crie sua equipe</h2>
              <p className="modal-equipe-subtitulo">
                Você ainda não tem uma equipe. Dê um nome pra ela pra começar.
              </p>
            </header>

            <form className="modal-equipe-form" onSubmit={handleCriar}>
              <input
                type="text"
                className="modal-equipe-input"
                placeholder="Ex: Vôlei Vinhedo"
                value={nome}
                onChange={e => setNome(e.target.value)}
                autoFocus
              />

              {erroForm && <p className="modal-equipe-erro">{erroForm}</p>}

              <button type="submit" className="modal-equipe-botao" disabled={salvando}>
                {salvando ? 'Criando…' : 'Criar equipe'}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}