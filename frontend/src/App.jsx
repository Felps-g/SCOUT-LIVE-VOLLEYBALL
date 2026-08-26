// App.jsx — roteamento entre as páginas do Scout Live
// Hash na URL para navegar sem precisar de servidor (evita 404 em
// produção que rotas "de verdade" teriam sem configuração extra no host).
//
// Convenção: tudo que exige login vive sob "#/app/..." — a checagem de
// autenticação é UM prefixo só, não uma por rota.

import { useState, useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext.jsx'
import Inicial          from './pages/Inicial.jsx'
import Login            from './pages/Login.jsx'
import ScoutLive        from './pages/ScoutLive.jsx'
import Jogos            from './pages/Jogos.jsx'
import Atletas          from './pages/Atletas.jsx'
import Perfil           from './pages/Perfil.jsx'
import Equipes          from './pages/Equipes.jsx'
import AdicionarAtletas from './pages/AdicionarAtletas.jsx'
import AtletaDetalhes   from './pages/AtletaDetalhes.jsx'
import DetalheJogo      from './pages/DetalheJogo.jsx'
import PrivateRoute     from './components/PrivateRoute.jsx'

// rotas públicas
const rotasPublicas = {
  '':        <Inicial />,
  '#/login': <Login />,
}

// rotas privadas — todas sob "#/app/..."
const rotasPrivadas = {
  '#/app/scout':          <ScoutLive />,
  '#/app/jogos':          <Jogos />,
  '#/app/jogos/detalhes': <DetalheJogo />,
  '#/app/equipes':        <Equipes />,
  '#/app/atletas':        <Atletas />,
  '#/app/atletas/novo':   <AdicionarAtletas />,
  '#/app/atletas/detalhes': <AtletaDetalhes />,
  '#/app/perfil':         <Perfil />,
}

export default function App() {
  const [hash, setHash] = useState(window.location.hash || '')

  useEffect(() => {
    const onHash = () => setHash(window.location.hash || '')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // separa o caminho da query string: "#/app/jogos/detalhes?id=123" ->
  // "#/app/jogos/detalhes" — sem isso, link com "?id=" não bate com
  // nenhuma chave de `rotas` e cai sempre na tela inicial.
  const caminho = hash.split('?')[0]
  const ehPrivada = caminho.startsWith('#/app')

  const tela = ehPrivada
    ? (rotasPrivadas[caminho] ?? <Inicial />)
    : (rotasPublicas[caminho] ?? <Inicial />)

  return (
    <AuthProvider>
      {ehPrivada ? <PrivateRoute>{tela}</PrivateRoute> : tela}
    </AuthProvider>
  )
}
