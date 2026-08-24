// hooks/useAuth.js
// Estado de autenticação centralizado e reativo. Não substitui
// services/auth.js (que continua sendo a fonte da verdade sobre o que
// está salvo) — só dá um jeito de componentes React saberem quando isso
// muda, em vez de cada tela ler o localStorage direto toda vez que
// renderiza.

import { useState, useEffect, useCallback } from 'react';
import { getUsuarioLogado, estaLogado, limparSessao } from '../services/auth.js';

export function useAuth() {
  const [usuario, setUsuario] = useState(() => getUsuarioLogado());

  // mantém em sincronia se a sessão for alterada em outra aba
  useEffect(() => {
    function sincronizar() {
      setUsuario(getUsuarioLogado());
    }
    window.addEventListener('storage', sincronizar);
    return () => window.removeEventListener('storage', sincronizar);
  }, []);

  // chamar depois de login/atualização de perfil bem-sucedidos, pra
  // refletir na hora (o evento 'storage' só dispara em outras abas)
  const atualizar = useCallback(() => {
    setUsuario(getUsuarioLogado());
  }, []);

  const logout = useCallback(() => {
    limparSessao();
    setUsuario(null);
    window.location.hash = '#/login';
  }, []);

  return {
    usuario,
    estaLogado: estaLogado(),
    atualizar,
    logout
  };
}
