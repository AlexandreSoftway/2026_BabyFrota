import { lazy, type ComponentType } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { RotaComPerfil } from '@/components/layout/RotaComPerfil'
import { PERFIL_ADMINISTRADOR, PERFIS_SUPERVISAO } from '@/lib/perfis'
import { LoginPage } from '@/pages/LoginPage'

/**
 * Cada tela é baixada só quando é aberta pela primeira vez, em vez de tudo na entrada do sistema: o pacote inicial fica
 * bem menor e bibliotecas pesadas (gráficos, por exemplo) só chegam às telas que as usam. As telas têm export nomeado,
 * daí o ajudante.
 */
function tela<K extends string>(carregar: () => Promise<Record<K, ComponentType>>, nome: K) {
  return lazy(() => carregar().then((modulo) => ({ default: modulo[nome] })))
}

const DashboardPage = tela(() => import('@/pages/DashboardPage'), 'DashboardPage')
const ClientesPage = tela(() => import('@/pages/cadastros/ClientesPage'), 'ClientesPage')
const UsuariosPage = tela(() => import('@/pages/cadastros/UsuariosPage'), 'UsuariosPage')
const CarrinhosPage = tela(() => import('@/pages/cadastros/CarrinhosPage'), 'CarrinhosPage')
const TiposCarrinhoPage = tela(() => import('@/pages/cadastros/TiposCarrinhoPage'), 'TiposCarrinhoPage')
const EmpresaPage = tela(() => import('@/pages/EmpresaPage'), 'EmpresaPage')
const EntregaPage = tela(() => import('@/pages/locacao/EntregaPage'), 'EntregaPage')
const LocacoesPage = tela(() => import('@/pages/locacao/LocacoesPage'), 'LocacoesPage')
const AberturaCaixaPage = tela(() => import('@/pages/caixa/AberturaCaixaPage'), 'AberturaCaixaPage')
const FechamentoCaixaPage = tela(() => import('@/pages/caixa/FechamentoCaixaPage'), 'FechamentoCaixaPage')
const SuprimentoSangriaPage = tela(() => import('@/pages/caixa/SuprimentoSangriaPage'), 'SuprimentoSangriaPage')
const FluxoCaixaPage = tela(() => import('@/pages/caixa/FluxoCaixaPage'), 'FluxoCaixaPage')
const EtiquetasPage = tela(() => import('@/pages/EtiquetasPage'), 'EtiquetasPage')
const RelatorioClientesPage = tela(() => import('@/pages/relatorios/RelatorioClientesPage'), 'RelatorioClientesPage')
const HistoricoLocacoesPage = tela(() => import('@/pages/relatorios/HistoricoLocacoesPage'), 'HistoricoLocacoesPage')
const BiPage = tela(() => import('@/pages/bi/BiPage'), 'BiPage')
const RelatorioLogPage = tela(() => import('@/pages/relatorios/RelatorioLogPage'), 'RelatorioLogPage')

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />

          <Route path="/clientes" element={<ClientesPage />} />

          {/* Igual ao legado: só Administrador gerencia usuários e os dados da empresa, e vê o log. */}
          <Route element={<RotaComPerfil perfis={[PERFIL_ADMINISTRADOR]} />}>
            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/empresa" element={<EmpresaPage />} />
            <Route path="/relatorios/log" element={<RelatorioLogPage />} />
          </Route>

          {/* Igual ao legado: Administrador e Gerente cadastram carrinho e tipo de carrinho. */}
          <Route element={<RotaComPerfil perfis={PERFIS_SUPERVISAO} />}>
            <Route path="/carrinhos" element={<CarrinhosPage />} />
            <Route path="/tipos-carrinho" element={<TiposCarrinhoPage />} />
          </Route>

          <Route path="/locacao/entrega" element={<EntregaPage />} />
          {/* A troca e a devolução agora abrem ao clicar numa locação em andamento na Entrega. */}
          <Route path="/locacao/troca-devolucao" element={<Navigate to="/locacao/entrega" replace />} />
          <Route path="/locacoes" element={<LocacoesPage />} />

          <Route path="/caixa/abertura" element={<AberturaCaixaPage />} />
          <Route path="/caixa/fechamento" element={<FechamentoCaixaPage />} />
          <Route path="/caixa/suprimento-sangria" element={<SuprimentoSangriaPage />} />
          <Route path="/caixa/fluxo" element={<FluxoCaixaPage />} />

          {/* Igual ao legado: Administrador e Gerente imprimem etiquetas e veem os relatórios (e o BI). */}
          <Route element={<RotaComPerfil perfis={PERFIS_SUPERVISAO} />}>
            <Route path="/etiquetas" element={<EtiquetasPage />} />
            <Route path="/relatorios/clientes" element={<RelatorioClientesPage />} />
            <Route path="/relatorios/historico" element={<HistoricoLocacoesPage />} />
            <Route path="/bi" element={<BiPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
