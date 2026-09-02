// components/ui/MensagemErro.jsx
// Exibição padrão de erro. Recebe a mensagem já traduzida (ver
// services/api.js — ErroApi já entrega texto seguro de mostrar, nunca
// "Failed to fetch" ou status HTTP cru).
//
// "aoTentarNovamente" é opcional: só faz sentido oferecer pra erros de
// servidor/conexão (passageiros) — não pra "não encontrado" ou "sem
// permissão" (tentar de novo não muda o resultado nesses casos).

export default function MensagemErro({ mensagem, aoTentarNovamente }) {
  if (!mensagem) return null;

  return (
    <div className="ui-erro">
      <span>{mensagem}</span>
      {aoTentarNovamente && (
        <button type="button" className="ui-erro-retry" onClick={aoTentarNovamente}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
