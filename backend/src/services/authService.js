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

// foto/telefone do técnico NÃO podem ir em user_metadata do Supabase Auth:
// o Supabase embute o user_metadata inteiro dentro do próprio JWT (access_token).
// Uma foto em base64 ali dentro faz o token crescer várias vezes o tamanho normal,
// e como o token vai no header Authorization em toda requisição, isso estoura o
// limite de header do Node/Express -> 431 "Request Header Fields Too Large" em
// TUDO (o navegador ainda mostra isso como erro de CORS, porque o 431 acontece
// antes do Express conseguir responder com os headers de CORS).
// Por isso ficam numa tabela separada (coach_profiles), do mesmo jeito que a foto
// do atleta já fica em players.photo_url em vez de ir pro token de ninguém.
async function buscarPerfilExtra(userId) {
  const { data } = await supabaseAdmin
    .from('coach_profiles')
    .select('foto_url, telefone')
    .eq('user_id', userId)
    .maybeSingle();

  return data || {};
}

export async function buscarPerfil(token) {
  const usuario = await validarToken(token);
  const extra = await buscarPerfilExtra(usuario.id);

  return {
    id: usuario.id,
    email: usuario.email,
    user_metadata: {
      nome: usuario.user_metadata?.nome,
      foto_url: extra.foto_url || null,
      telefone: extra.telefone || null
    },
    created_at: usuario.created_at,
    last_sign_in_at: usuario.last_sign_in_at
  };
}

export async function atualizarPerfil(token, { nome, telefone, foto }) {
  const usuario = await validarToken(token);

  // supabase.auth.updateUser() atualizaria a sessão ATUAL do client que o
  // chama — mas o client do servidor nunca fez login como esse usuário,
  // então nunca teria efeito. O jeito certo de um servidor atualizar
  // QUALQUER usuário é pelo admin API, usando o id já validado acima.
  //
  // só nome vai pro user_metadata (é pequeno e não tem problema estar no
  // token). foto/telefone vão pra coach_profiles — ver buscarPerfilExtra.
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(usuario.id, {
    user_metadata: {
      nome: nome || usuario.user_metadata?.nome
    }
  });

  if (error) {
    const erro = new Error(error.message);
    erro.status = 400;
    throw erro;
  }

  const extraAtual = await buscarPerfilExtra(usuario.id);
  const { error: erroExtra } = await supabaseAdmin
    .from('coach_profiles')
    .upsert({
      user_id: usuario.id,
      telefone: telefone || extraAtual.telefone,
      foto_url: foto !== undefined ? foto : extraAtual.foto_url
    });

  if (erroExtra) {
    const erro = new Error(erroExtra.message);
    erro.status = 400;
    throw erro;
  }

  return {
    id: data.user.id,
    email: data.user.email,
    user_metadata: {
      nome: data.user.user_metadata?.nome,
      telefone: telefone || extraAtual.telefone,
      foto_url: foto !== undefined ? foto : extraAtual.foto_url
    }
  };
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