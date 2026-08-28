// components/LinhaJogadorScout.jsx
// Uma linha da lista de titulares na tela de Scout Live: nome, posição e
// os contadores de acerto/erro por fundamento. Componente só de
// apresentação — não lê nem guarda estado do Scout Live, só recebe props.

import { IcCheck, IcX } from './IconesScout.jsx';
import { NOME_POSICAO } from '../constants/volei.js';

export default function LinhaJogadorScout({ titular, fundamentos, contagem, onClick }) {
  return (
    <button type="button" className="linha-jogador" onClick={onClick}>
      <div className="lj-jogador">
        <span className="lj-numero">{titular.numero}</span>
        <div className="lj-nomes">
          <span className="lj-nome">{titular.nome}</span>
          <span className="lj-posicao">{NOME_POSICAO[titular.posicao]}</span>
        </div>
      </div>
      <div className="lj-fundamentos">
        {fundamentos.map(f => {
          const c = contagem(f);
          return (
            <div key={f} className="lj-fundamento">
              <span className="lj-flabel">{f}</span>
              <div className="lj-fpills">
                <span className="lj-fpill lj-fpill--acerto"><IcCheck /> {c.acerto}</span>
                <span className="lj-fpill lj-fpill--erro"><IcX /> {c.erro}</span>
              </div>
            </div>
          );
        })}
      </div>
    </button>
  );
}
