import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Bloco de um modal de detalhes, no mesmo visual do detalhe da locação. */
export function SecaoDetalhe({
  titulo,
  icone: Icone,
  className,
  children,
}: {
  titulo: string
  icone?: LucideIcon
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('rounded-lg bg-muted/50 p-3', className)}>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {Icone && <Icone className="size-3.5" />}
        {titulo}
      </p>
      <dl className="grid grid-cols-[minmax(6.5rem,auto)_1fr] gap-x-4 gap-y-1 text-sm">{children}</dl>
    </div>
  )
}

/** Um dado do cadastro. Sem valor, mostra "—". */
export function ItemDetalhe({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  const vazio = valor === null || valor === undefined || (typeof valor === 'string' && valor.trim() === '')
  return (
    <>
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className={cn('min-w-0 break-words', vazio && 'text-muted-foreground')}>{vazio ? '—' : valor}</dd>
    </>
  )
}
