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

// Marca que a pessoa acabou de logar e ainda precisa escolher a equipe.
// Fica no sessionStorage (some ao fechar a aba) e é apagada assim que uma
// equipe é selecionada — é isso que faz o modal aparecer só uma vez por login.
export const EQUIPE_PENDENTE_KEY = 'selecao_equipe_pendente';