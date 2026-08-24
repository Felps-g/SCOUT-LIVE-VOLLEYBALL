// contexts/AuthContext.jsx
//
// Fonte única da verdade sobre autenticação no app. Substitui o antigo
// hooks/useAuth.js (que só olhava o localStorage, sem nunca confirmar com
// o backend se aquele token ainda era válido).
//
// Estados possíveis — nunca misturar "não logado" com "token inválido":
//   'carregando'      → ainda checando se existe uma sessão válida
//   'nao-autenticado'  → não existe token nenhum salvo (nunca logou, ou já deslogou)
//   'autenticado'      → token confirmado válido pelo backend agora há pouco
//   'expirado'         → havia um token salvo, mas o backend rejeitou (venceu/inválido)
//
// "expirado" só é usado aqui na INICIALIZAÇÃO do app (sessão salva de uma
// visita anterior que não é mais válida). Se o token expirar no MEIO do
// uso, quem trata isso é o interceptor de 401 em services/api.js — ele já
// limpa a sessão e redireciona pro login com a mensagem certa, sem
// precisar passar pelo contexto pra isso.

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../services/api.js';
import { salvarUsuarioLogado, limparSessao, buscarPerfilAtual } from '../services/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [estado, setEstado] = useState('carregando');
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    async function inicializar() {
      const token = getAuthToken();

      // sem token nenhum salvo: nem vale a pena chamar o backend
      if (!token) {
        setEstado('nao-autenticado');
        return;
      }

      // existe um token salvo — confirma com o backend antes de considerar
      // "autenticado" de verdade, em vez de confiar cegamente no que está
      // no localStorage (que pode estar vencido)
      try {
        const perfil = await buscarPerfilAtual();
        setUsuario(perfil);
        setEstado('autenticado');
      } catch {
        limparSessao();
        setEstado('expirado');
      }
    }

    inicializar();
  }, []);

  const login = useCallback((usuarioLogado) => {
    salvarUsuarioLogado(usuarioLogado);
    setUsuario(usuarioLogado);
    setEstado('autenticado');
  }, []);

  const logout = useCallback(() => {
    limparSessao();
    setUsuario(null);
    setEstado('nao-autenticado');
    window.location.hash = '#/login';
  }, []);

  return (
    <AuthContext.Provider value={{ estado, usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth precisa ser usado dentro de <AuthProvider>');
  }
  return contexto;
}
