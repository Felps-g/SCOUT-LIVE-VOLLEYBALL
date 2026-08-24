// components/PrivateRoute.jsx
// Envolve uma tela que exige login. Sem isso, navegar direto pra uma URL
// protegida sem estar logado renderizava a tela normalmente e só falhava
// quando ela tentava buscar dado da API — um erro confuso, tarde demais.

import { useAuth } from '../contexts/AuthContext.jsx';

export default function PrivateRoute({ children }) {
  const { estado } = useAuth();

  // ainda não sabemos se a sessão salva é válida — não decide nada ainda,
  // só evita piscar tela protegida ou tela de login à toa
  if (estado === 'carregando') {
    return <div className="tela-carregando">Carregando…</div>;
  }

  // 'nao-autenticado' ou 'expirado' caem aqui — os dois levam pro login,
  // só a mensagem exibida lá difere (isso já é tratado em Login.jsx)
  if (estado !== 'autenticado') {
    window.location.hash = '#/login';
    return null;
  }

  return children;
}
