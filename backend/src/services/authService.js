/**
 * SERVIÇO DE AUTENTICAÇÃO
 * Chamadas ao Supabase Auth, sem nenhuma lógica de HTTP (status code,
 * req/res) — isso fica por conta do controller, igual ao padrão usado
 * pelas outras entidades do projeto (times, jogadores, jogos).
 */

import { supabase, supabaseAdmin } from '../config/supabase.js';

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(error.message);
  }

  return {
    token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    usuario: { id: data.user.id, email: data.user.email },
    expires_in: data.session.expires_in
  };
}

export async function registrar(email, password, nome) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome: nome || email.split('@')[0] }
  });

  if (error) {
    const erro = new Error(error.message);
    erro.codigo = error.code;
    throw erro;
  }

  return { id: data.user.id, email: data.user.email };
}

export async function renovarToken(refreshToken) {
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

  if (error) {
    throw new Error(error.message);
  }

  return {
    token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in
  };
}

export async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

// Usado tanto pra "buscar perfil" quanto como primeiro passo de
// "atualizar perfil"/"trocar senha" — por isso marca erro.status = 401,
// pra o controller sempre devolver o mesmo código nesse caso específico,
// mesmo quando é chamado a partir de uma rota que também pode falhar
// por outro motivo (ex: update do Supabase falhar, que é 400).
export async function validarToken(token) {
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    const erro = new Error(error?.message || 'Token inválido');
    erro.status = 401;
    throw erro;
  }

  return data.user;
}

export async function buscarPerfil(token) {
  const usuario = await validarToken(token);

  return {
    id: usuario.id,
    email: usuario.email,
    user_metadata: usuario.user_metadata,
    created_at: usuario.created_at,
    last_sign_in_at: usuario.last_sign_in_at
  };
}

export async function atualizarPerfil(token, { nome, telefone }) {
  const usuario = await validarToken(token);

  // supabase.auth.updateUser() atualizaria a sessão ATUAL do client que o
  // chama — mas o client do servidor nunca fez login como esse usuário,
  // então nunca teria efeito. O jeito certo de um servidor atualizar
  // QUALQUER usuário é pelo admin API, usando o id já validado acima.
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(usuario.id, {
    user_metadata: {
      nome: nome || usuario.user_metadata?.nome,
      telefone: telefone || usuario.user_metadata?.telefone
    }
  });

  if (error) {
    const erro = new Error(error.message);
    erro.status = 400;
    throw erro;
  }

  return { id: data.user.id, email: data.user.email, user_metadata: data.user.user_metadata };
}

export async function trocarSenha(token, senhaNova) {
  const usuario = await validarToken(token);

  const { error } = await supabaseAdmin.auth.admin.updateUserById(usuario.id, {
    password: senhaNova
  });

  if (error) {
    const erro = new Error(error.message);
    erro.status = 400;
    throw erro;
  }
}
