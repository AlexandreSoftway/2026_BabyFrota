import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { RotaComPerfil } from '@/components/layout/RotaComPerfil'
import { PERFIL_ADMINISTRADOR, PERFIS_SUPERVISAO } from '@/lib/perfis'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { TiposCarrinhoPage } from '@/pages/cadastros/TiposCarrinhoPage'
import { UsuariosPage } from '@/pages/cadastros/UsuariosPage'
import { ClientesPage } from '@/pages/cadastros/ClientesPage'
import { CarrinhosPage } from '@/pages/cadastros/CarrinhosPage'
import { EmpresaPage } from '@/pages/EmpresaPage'
import { AberturaCaixaPage } from '@/pages/caixa/AberturaCaixaPage'
import { FechamentoCaixaPage } from '@/pages/caixa/FechamentoCaixaPage'
import { SuprimentoSangriaPage } from '@/pages/caixa/SuprimentoSangriaPage'
import { FluxoCaixaPage } from '@/pages/caixa/FluxoCaixaPage'
import { EntregaPage } from '@/pages/locacao/EntregaPage'
import { LocacoesPage } from '@/pages/locacao/LocacoesPage'
import { RelatorioClientesPage } from '@/pages/relatorios/RelatorioClientesPage'
import { HistoricoLocacoesPage } from '@/pages/relatorios/HistoricoLocacoesPage'
import { EtiquetasPage } from '@/pages/EtiquetasPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />

          <Route path="/clientes" element={<ClientesPage />} />

          {/* Igual ao legado: só Administrador gerencia usuários e os dados da empresa. */}
          <Route element={<RotaComPerfil perfis={[PERFIL_ADMINISTRADOR]} />}>
            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/empresa" element={<EmpresaPage />} />
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

          {/* Igual ao legado: Administrador e Gerente imprimem etiquetas e veem os relatórios. */}
          <Route element={<RotaComPerfil perfis={PERFIS_SUPERVISAO} />}>
            <Route path="/etiquetas" element={<EtiquetasPage />} />
            <Route path="/relatorios/clientes" element={<RelatorioClientesPage />} />
            <Route path="/relatorios/historico" element={<HistoricoLocacoesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
