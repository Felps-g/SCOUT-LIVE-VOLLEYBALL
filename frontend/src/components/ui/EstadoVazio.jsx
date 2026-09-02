// components/ui/EstadoVazio.jsx
// Estado "sem nenhum dado ainda" (lista vazia). "acao" é opcional — um
// link pra resolver o vazio (ex: "Crie a sua equipe").

export default function EstadoVazio({ texto, acao }) {
  return (
    <div className="ui-vazio">
      <p>{texto}</p>
      {acao && <a href={acao.href} className="ui-vazio-acao">{acao.texto}</a>}
    </div>
  );
}
