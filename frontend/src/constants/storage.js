// Nomes das chaves usadas no localStorage — mantidos num lugar só pra
// evitar o que já aconteceu antes (duas chaves diferentes guardando o
// mesmo valor: 'scout_token' e 'authToken').
export const TOKEN_KEY = 'scout_token';

// Chave antiga, mantida só como fallback de leitura pra não deslogar
// quem já tinha uma sessão salva assim antes desta mudança. Pode ser
// removida depois que não houver mais sessões antigas em uso (ex: daqui
// a algumas semanas de uso real).
export const TOKEN_KEY_LEGADO = 'authToken';

export const USUARIO_KEY = 'scout_usuario';

export const TIME_SELECIONADO_KEY = 'time_selecionado';
