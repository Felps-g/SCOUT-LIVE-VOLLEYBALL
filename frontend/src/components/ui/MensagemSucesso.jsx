// components/ui/MensagemSucesso.jsx
// Confirmação padrão depois de uma ação bem-sucedida (criar, salvar,
// excluir). Mesma ideia do MensagemErro: uma cara só pro app inteiro.

export default function MensagemSucesso({ mensagem }) {
  if (!mensagem) return null;

  return <div className="ui-sucesso">{mensagem}</div>;
}
