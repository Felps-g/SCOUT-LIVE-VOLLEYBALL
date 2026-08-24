// components/PrivateRoute.jsx
// Envolve uma tela que exige login. Sem isso, navegar direto pra uma URL
// protegida sem estar logado renderizava a tela normalmente e só falhava
// quando ela tentava buscar dado da API — um erro confuso, tarde demais.

import { useAuth } from '../hooks/useAuth.js';

export default function PrivateRoute({ children }) {
  const { estaLogado } = useAuth();

  if (!estaLogado) {
    window.location.hash = '#/login';
    return null;
  }

  return children;
}
