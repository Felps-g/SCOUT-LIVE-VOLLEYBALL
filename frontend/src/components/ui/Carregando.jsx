// components/ui/Carregando.jsx
// Indicador de carregamento padrão. Existia um "Carregando..." de texto
// simples repetido (com estilo levemente diferente) em quase toda tela —
// centralizado aqui pra ter a mesma cara em todo lugar.

export default function Carregando({ texto = 'Carregando…' }) {
  return (
    <div className="ui-carregando">
      <span className="ui-carregando-spinner" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}
