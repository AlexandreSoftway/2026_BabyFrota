import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'

/**
 * Equivalente ao `if (UsuarioLogado.CDPerfil != ...) Response.Redirect("Default.aspx")` do legado: usado dentro de
 * `<ProtectedRoute>` (já garante login) para bloquear uma rota por perfil, mesmo para quem digita a URL direto — a
 * sidebar só esconde o link, quem trava de verdade é a API. Sem perfil permitido, volta ao Dashboard.
 */
export function RotaComPerfil({ perfis }: { perfis: number[] }) {
  const perfilId = useAuthStore((s) => s.usuario?.perfilId)
  const permitido = perfilId !== undefined && perfis.includes(perfilId)
  return permitido ? <Outlet /> : <Navigate to="/" replace />
}
