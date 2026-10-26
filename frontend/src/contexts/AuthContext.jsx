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

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getAuthToken } from '../services/api.js';
import { salvarUsuarioLogado, limparSessao, buscarPerfilAtual } from '../services/auth.js';
import { marcarSelecaoEquipePendente } from '../services/time.js';

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
    // só aqui (login de verdade) o modal de equipe deve aparecer; reabrir
    // o app com a sessão ainda válida passa por inicializar(), não por aqui
    marcarSelecaoEquipePendente();
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

  // diferente de login(): só atualiza os dados do perfil (ex: depois de
  // editar o nome), sem mexer no estado da sessão. Usado por Perfil.jsx
  // pra manter o contexto em sincronia sem precisar buscar tudo de novo.
  const atualizarUsuario = useCallback((dadosAtualizados) => {
    setUsuario(prev => {
      const atualizado = { ...prev, ...dadosAtualizados };
      salvarUsuarioLogado(atualizado);
      return atualizado;
    });
  }, []);

  // sem isso, toda vez que o App re-renderiza (o que acontece a cada
  // navegação, já que o hash da URL vive lá) o objeto do value era
  // recriado do zero — e todo componente que usa useAuth() (PrivateRoute,
  // Perfil, Login, Inicial) re-renderizava junto, mesmo sem nada ter
  // mudado de verdade no estado de autenticação.
  const value = useMemo(
    () => ({ estado, usuario, login, logout, atualizarUsuario }),
    [estado, usuario, login, logout, atualizarUsuario]
  );

  return (
    <AuthContext.Provider value={value}>
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