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

export async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getAuthToken();
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

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
    // sessão expirada/token inválido: só entra aqui se JÁ existia um token
    // sendo enviado — assim uma tentativa de login com senha errada (sem
    // token nenhum ainda) não é confundida com "sessão expirou"
    if (response.status === 401 && token && !window.location.hash.startsWith('#/login')) {
      clearAuthToken();
      localStorage.removeItem(USUARIO_KEY);
      window.location.hash = '#/login?motivo=sessao-expirada';
    }

    // o backend às vezes manda a mensagem genérica em "erro"/"mensagem" e o
    // motivo real (o que o Supabase respondeu) separado em "detalhes" —
    // sem isso aqui, erros como "Invalid login credentials" ou
    // "Email not confirmed" ficavam escondidos atrás de "Falha na autenticação"
    const base = data.mensagem || data.erro || data.error || 'Erro na requisição';
    const detalhe = data.detalhes && data.detalhes !== base ? data.detalhes : null;
    throw new Error(detalhe ? `${base}: ${detalhe}` : base);
  }

  return data;
}

export default API_BASE_URL;