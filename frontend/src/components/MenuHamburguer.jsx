// MenuHamburguer.jsx — menu de navegação rápida (3 traços) exibido em
// todas as páginas internas (tudo que não é a tela inicial).
//
// Ao abrir, mostra: Voltar ao início, Scout Live, Jogos, Equipes e Atletas.
// Usa a biblioteca "hamburger-react" só para o ícone animado; o painel
// dropdown é feito à mão (css/menu-hamburguer.css) pra combinar com o
// resto do app.

import { useState } from 'react';
import Hamburger from 'hamburger-react';
import '../../css/menu-hamburguer.css';

const ITENS_MENU = [
  { href: '#/',             texto: 'Voltar ao início', classe: 'menu-hamburguer-item--inicio' },
  { href: '#/app/scout',    texto: 'Scout Live' },
  { href: '#/app/jogos',    texto: 'Jogos' },
  { href: '#/app/equipes',  texto: 'Equipes' },
  { href: '#/app/atletas',  texto: 'Atletas' },
];

export default function MenuHamburguer() {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="menu-hamburguer">
      <div className="menu-hamburguer-botao">
        <Hamburger
          toggled={aberto}
          toggle={setAberto}
          size={20}
          color="#ffffff"
          rounded
          label="Abrir menu"
        />
      </div>

      {aberto && (
        <>
          <div className="menu-hamburguer-fundo" onClick={() => setAberto(false)} />

          <nav className="menu-hamburguer-painel">
            {ITENS_MENU.map(item => (
              <a
                key={item.href}
                href={item.href}
                className={`menu-hamburguer-item ${item.classe || ''}`}
                onClick={() => setAberto(false)}
              >
                {item.texto}
              </a>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}