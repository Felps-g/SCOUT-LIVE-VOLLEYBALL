// services/api.js — ponto único de contato com o backend.
//
// Toda mensagem de erro que chega até a tela passa por aqui primeiro.
// Isso existe pra nunca deixar um erro técnico cru (status HTTP, texto
// de exceção do Postgres/Supabase, "Failed to fetch" do navegador)
// aparecer direto pro usuário — cada situação tem uma mensagem em
// português, prevista de propósito. Ver TABELA DE ESTADOS no final
// deste arquivo pra visão geral de tudo que é tratado aqui.

import { TOKEN_KEY, TOKEN_KEY_LEGADO, USUARIO_KEY } from '../constants/storage.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY_LEGADO);
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY_LEGADO);
}

// Erro já traduzido pra português, com um "tipo" fixo que o resto do app
// pode usar pra decidir comportamento (ex: mostrar botão de "tentar
// novamente" só quando tipo é 'servidor' ou 'conexao').
export class ErroApi extends Error {
  constructor(mensagem, tipo, status) {
    super(mensagem);
    this.name = 'ErroApi';
    this.tipo = tipo; // credenciais_invalidas | sessao_expirada | sem_permissao | nao_encontrado | validacao | servidor | conexao
    this.status = status;
  }
}

// Converte status HTTP + corpo da resposta numa mensagem segura de mostrar.
// 400/409 (validação) confiam no texto do backend, porque esses foram
// escritos de propósito pra serem lidos por gente (ex: "Categoria é
// obrigatória"). Todo o resto usa mensagem fixa — nunca propaga texto cru
// de erro de banco/infra pra tela.
function traduzirErroHttp(status, data, temToken) {
  const mensagemBackend = data?.mensagem || data?.erro || data?.error || '';

  if (status === 401) {
    // sem token = tentativa de login/cadastro que falhou (não é sessão expirando)
    if (!temToken) {
      return { tipo: 'credenciais_invalidas', mensagem: 'E-mail ou senha incorretos.' };
    }
    return { tipo: 'sessao_expirada', mensagem: 'Sua sessão expirou. Faça login novamente.' };
  }
  if (status === 403) {
    return { tipo: 'sem_permissao', mensagem: 'Você não tem permissão para acessar isso.' };
  }
  if (status === 404) {
    return { tipo: 'nao_encontrado', mensagem: 'Isso não existe ou foi removido.' };
  }
  if (status === 400 || status === 409) {
    return { tipo: 'validacao', mensagem: mensagemBackend || 'Confira os dados informados.' };
  }
  return { tipo: 'servidor', mensagem: 'Ocorreu um erro no servidor. Tente novamente em alguns instantes.' };
}

export async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getAuthToken();
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    // fetch() falhou antes de qualquer resposta chegar: sem internet,
    // servidor fora do ar, CORS bloqueado etc. — nunca deixa o
    // "Failed to fetch" cru do navegador chegar na tela.
    throw new ErroApi(
      'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.',
      'conexao'
    );
  }

  const rawText = await response.text();
  let data = {};

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { mensagem: rawText };
    }
  }

  if (!response.ok) {
    // sessão expirada de verdade: já existia um token sendo enviado.
    // Limpa a sessão e redireciona pro login com o motivo — a página que
    // chamou isso ainda recebe o throw (pro loading não ficar travado),
    // mas quem decide o que a tela final mostra é o Login.
    if (response.status === 401 && token && !window.location.hash.startsWith('#/login')) {
      clearAuthToken();
      localStorage.removeItem(USUARIO_KEY);
      window.location.hash = '#/login?motivo=sessao-expirada';
    }

    const { tipo, mensagem } = traduzirErroHttp(response.status, data, Boolean(token));
    throw new ErroApi(mensagem, tipo, response.status);
  }

  return data;
}

export default API_BASE_URL;

// ============================================================
// TABELA DE ESTADOS — referência de UX (ver também documentação)
// ============================================================
// situação              | tipo (ErroApi)        | onde é decidido
// ---------------------------------------------------------------
// usuário não logado     | (nenhum erro)         | PrivateRoute redireciona ANTES de pedir dado
// sessão expirada         | sessao_expirada       | aqui (401 + já tinha token) -> redireciona + Login mostra aviso
// credenciais inválidas   | credenciais_invalidas | aqui (401 + login sem token ainda)
// sem permissão            | sem_permissao        | aqui (403)
// recurso não encontrado   | nao_encontrado       | aqui (404)
// erro de validação        | validacao            | aqui (400/409) — usa a mensagem do backend
// erro de servidor          | servidor            | aqui (500+) — mensagem sempre genérica
// erro de conexão           | conexao             | aqui (fetch falhou antes de responder)
