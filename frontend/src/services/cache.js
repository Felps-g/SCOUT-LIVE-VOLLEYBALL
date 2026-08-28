// services/cache.js
// Cache simples em memória, com expiração. Existe pra resolver um
// problema concreto: toda troca de tela rebuscava times/jogadores do
// zero, mesmo sem nada ter mudado. Não é uma lib de data-fetching (tipo
// React Query) — é só um Map com TTL, do tamanho que este projeto precisa.

const cache = new Map();

// times e jogadores mudam pouco (o técnico cadastra e deixa quieto) —
// 30s é tempo suficiente pra cobrir "ficar trocando de tela" sem deixar
// dado muito velho se alguém editar em outra aba.
const TTL_PADRAO_MS = 30_000;

export function getCache(chave) {
  const entrada = cache.get(chave);
  if (!entrada) return null;

  if (Date.now() > entrada.expiraEm) {
    cache.delete(chave);
    return null;
  }

  return entrada.valor;
}

export function setCache(chave, valor, ttlMs = TTL_PADRAO_MS) {
  cache.set(chave, { valor, expiraEm: Date.now() + ttlMs });
}

// chamado depois de criar/editar/excluir algo, pra próxima leitura vir
// atualizada em vez de servir o dado velho do cache
export function invalidarCache(prefixo) {
  if (!prefixo) {
    cache.clear();
    return;
  }
  for (const chave of cache.keys()) {
    if (chave.startsWith(prefixo)) cache.delete(chave);
  }
}
