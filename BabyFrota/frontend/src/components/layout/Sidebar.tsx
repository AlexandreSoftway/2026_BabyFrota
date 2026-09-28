import { useEffect, useId, useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { useUiStore } from '@/store/ui-store'
import { navGroups, type NavGroup, type NavItem } from './nav-items'

/** Só os itens que o perfil do usuário pode ver (igual ao Default.aspx do legado), e some o grupo se ficar vazio. */
function gruposVisiveis(perfilId: number | undefined): NavGroup[] {
  return navGroups
    .map((grupo) => ({
      ...grupo,
      items: grupo.items.filter((item) => !item.perfis || (perfilId !== undefined && item.perfis.includes(perfilId))),
    }))
    .filter((grupo) => grupo.items.length > 0)
}

function rotaAtiva(pathname: string, to: string) {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`)
}

function grupoAtivo(grupo: NavGroup, pathname: string) {
  return grupo.items.some((item) => rotaAtiva(pathname, item.to))
}

function classeItem(ativo: boolean) {
  return cn(
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
    ativo
      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
  )
}

function Marca({ compacto }: { compacto: boolean }) {
  return (
    <div className="flex h-16 shrink-0 items-center gap-2 overflow-hidden px-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary font-bold text-sidebar-primary-foreground">
        BF
      </div>
      {!compacto && <span className="truncate text-lg font-semibold">Baby Frota</span>}
    </div>
  )
}

function ItemLink({ item, compacto }: { item: NavItem; compacto: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      title={compacto ? item.label : undefined}
      className={({ isActive }) => cn(classeItem(isActive), compacto && 'justify-center px-0')}
    >
      <item.icon className="size-4 shrink-0" />
      {!compacto && item.label}
    </NavLink>
  )
}

function GrupoRecolhivel({ grupo, rotulo, compacto }: { grupo: NavGroup; rotulo: string; compacto: boolean }) {
  const idLista = useId()
  const { pathname } = useLocation()
  const aberto = useUiStore((s) => s.gruposAbertos[rotulo] ?? false)
  const alternarGrupo = useUiStore((s) => s.alternarGrupo)
  const abrirGrupo = useUiStore((s) => s.abrirGrupo)
  const definirSidebarColapsada = useUiStore((s) => s.definirSidebarColapsada)

  const ativo = grupoAtivo(grupo, pathname)
  const Icone = grupo.icon

  // Sidebar reduzida a ícones não tem onde listar os itens: clicar no grupo expande a sidebar já com ele aberto.
  if (compacto) {
    return (
      <button
        type="button"
        title={rotulo}
        aria-label={rotulo}
        onClick={() => {
          abrirGrupo(rotulo)
          definirSidebarColapsada(false)
        }}
        className={cn(classeItem(ativo), 'w-full justify-center px-0')}
      >
        {Icone && <Icone className="size-4 shrink-0" />}
      </button>
    )
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={idLista}
        onClick={() => alternarGrupo(rotulo)}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
          ativo ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/80',
        )}
      >
        {Icone && <Icone className="size-4 shrink-0" />}
        <span className="flex-1 truncate text-left">{rotulo}</span>
        <ChevronDown className={cn('size-4 shrink-0 transition-transform duration-200', aberto && 'rotate-180')} />
      </button>

      {/* grid 0fr -> 1fr anima a altura sem medir o conteúdo; "invisible" tira os links fechados da ordem de tabulação. */}
      <div
        id={idLista}
        className={cn(
          'grid transition-[grid-template-rows,visibility] duration-200',
          aberto ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="ml-5 mt-1 space-y-1 border-l border-sidebar-border pl-2">
            {grupo.items.map((item) => (
              <ItemLink key={item.to} item={item} compacto={false} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function NavConteudo({ compacto }: { compacto: boolean }) {
  const { pathname } = useLocation()
  const abrirGrupo = useUiStore((s) => s.abrirGrupo)
  const perfilId = useAuthStore((s) => s.usuario?.perfilId)
  const grupos = useMemo(() => gruposVisiveis(perfilId), [perfilId])

  // Ao navegar (ou entrar direto por uma URL), garante aberto o grupo da rota atual. Só age quando a rota muda,
  // então quem fechou o grupo à mão não o vê reabrir sozinho.
  useEffect(() => {
    const ativo = grupos.find((g) => g.label && grupoAtivo(g, pathname))
    if (ativo?.label) abrirGrupo(ativo.label)
  }, [pathname, abrirGrupo, grupos])

  return (
    <nav aria-label="Navegação principal" className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 pb-4">
      {grupos.map((grupo) =>
        grupo.label === null ? (
          <div key="fixo" className="pb-2">
            {grupo.items.map((item) => (
              <ItemLink key={item.to} item={item} compacto={compacto} />
            ))}
          </div>
        ) : (
          <GrupoRecolhivel key={grupo.label} grupo={grupo} rotulo={grupo.label} compacto={compacto} />
        ),
      )}
    </nav>
  )
}

/** Sidebar fixa do desktop. Recolher/expandir é feito pelo botão de menu do Topbar. */
export function Sidebar() {
  const colapsada = useUiStore((s) => s.sidebarColapsada)

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex print:hidden',
        colapsada ? 'w-16' : 'w-64',
      )}
    >
      <div className="border-b border-sidebar-border">
        <Marca compacto={colapsada} />
      </div>
      <div className="h-4 shrink-0" />
      <NavConteudo compacto={colapsada} />
    </aside>
  )
}

/** Menu lateral por cima da página, para telas abaixo de md (onde a sidebar fixa fica oculta). */
export function MobileSidebar() {
  const aberto = useUiStore((s) => s.menuMobileAberto)
  const fechar = useUiStore((s) => s.fecharMenuMobile)
  const { pathname } = useLocation()

  useEffect(() => {
    fechar()
  }, [pathname, fechar])

  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar()
    }
    // Se a janela passa para largura de desktop com o menu aberto, fecha: senão ele reapareceria ao voltar ao celular.
    const desktop = window.matchMedia('(min-width: 768px)')
    const aoMudarLargura = () => fechar()
    window.addEventListener('keydown', aoTeclar)
    desktop.addEventListener('change', aoMudarLargura)
    return () => {
      window.removeEventListener('keydown', aoTeclar)
      desktop.removeEventListener('change', aoMudarLargura)
    }
  }, [aberto, fechar])

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 transition-[visibility] duration-200 md:hidden print:hidden',
        aberto ? 'visible' : 'invisible',
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Menu de navegação"
    >
      <button
        type="button"
        aria-label="Fechar menu"
        tabIndex={-1}
        onClick={fechar}
        className={cn('absolute inset-0 bg-black/50 transition-opacity duration-200', aberto ? 'opacity-100' : 'opacity-0')}
      />
      <aside
        className={cn(
          'absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-200',
          aberto ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-sidebar-border pr-2">
          <Marca compacto={false} />
          <Button
            variant="ghost"
            size="icon"
            onClick={fechar}
            aria-label="Fechar menu"
            className="text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="h-4 shrink-0" />
        <NavConteudo compacto={false} />
      </aside>
    </div>
  )
}
