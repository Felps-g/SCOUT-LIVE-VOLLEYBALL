import { useState, useEffect } from 'react';
import { listarTimes, getTimeSelecionado, setTimeSelecionado } from '../services/time.js';

// Seletor rápido de equipe (usado no Scout Live). Criar equipe nova NÃO
// é feito aqui — fica só na tela de Equipes (#/app/equipes), que já pede
// nome + categoria corretamente. Ter dois formulários de criação (um
// completo, um "rápido" sem categoria) duplicava lógica e criava equipes
// sem categoria de verdade.
export default function SeletorTime({ onChange }) {
  const [times, setTimes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [selecionadoId, setSelecionadoId] = useState(getTimeSelecionado()?.id || '');

  async function carregar() {
    setCarregando(true);
    setErro('');
    try {
      const lista = await listarTimes();
      // times criados automaticamente como adversário (ver services/time.js)
      // não são times do técnico — não entram nas opções de seleção
      const listaFiltrada = (lista || []).filter(t => t.category !== 'Adversário');
      setTimes(listaFiltrada);

      const salvo = getTimeSelecionado();
      const aindaExiste = salvo && listaFiltrada.some(t => t.id === salvo.id);

      if (aindaExiste) {
        setSelecionadoId(salvo.id);
        onChange?.(salvo);
      } else if (listaFiltrada.length > 0) {
        setTimeSelecionado(listaFiltrada[0]);
        setSelecionadoId(listaFiltrada[0].id);
        onChange?.(listaFiltrada[0]);
      } else {
        onChange?.(null);
      }
    } catch (err) {
      setErro(err.message || 'Erro ao carregar times');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  function selecionar(id) {
    const time = times.find(t => t.id === id);
    if (!time) return;
    setSelecionadoId(id);
    setTimeSelecionado(time);
    onChange?.(time);
  }

  const estiloCaixa = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    background: '#0b1730',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: '10px 14px',
    marginBottom: 16,
    color: '#fff',
    fontFamily: 'inherit'
  };

  const estiloInput = {
    background: '#060d1c',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 6,
    color: '#fff',
    padding: '6px 10px',
    fontSize: 14
  };

  if (carregando) {
    return <div style={estiloCaixa}>Carregando times…</div>;
  }

  const temTime = times.length > 0;

  return (
    <div style={estiloCaixa}>
      {temTime ? (
        <>
          <span style={{ opacity: 0.7, fontSize: 14 }}>Time:</span>

          {times.length > 1 ? (
            <select value={selecionadoId} onChange={e => selecionar(e.target.value)} style={estiloInput}>
              {times.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: 15, fontWeight: 600 }}>{times[0].name}</span>
          )}
        </>
      ) : (
        <span style={{ fontSize: 14, opacity: 0.7 }}>
          Você ainda não tem uma equipe. <a href="#/app/equipes" style={{ color: '#4d9fff' }}>Crie a sua equipe</a> antes de começar o scout.
        </span>
      )}

      {erro && <span style={{ color: '#ff6b7a', fontSize: 13 }}>{erro}</span>}
    </div>
  );
}
