import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { MobileSidebar, Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ComprovanteHost } from '@/components/locacao/ComprovanteHost'
import { Toaster } from '@/components/ui/toaster'

/** Enquanto a tela é baixada pela primeira vez (ver App.tsx): menu e barra superior continuam no lugar. */
function CarregandoTela() {
  return (
    <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Carregando...
    </div>
  )
}

export function AppLayout() {
  return (
    <div className="flex h-svh w-full overflow-hidden">
      <Sidebar />
      <MobileSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6 print:overflow-visible print:bg-white print:p-0">
          <Suspense fallback={<CarregandoTela />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <Toaster />
      <ComprovanteHost />
    </div>
  )
}
