import type { KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ClipboardList, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'
import { BiClientesAba } from './BiClientesAba'
import { BiLocacoesAba } from './BiLocacoesAba'

const ABAS = [
  { id: 'clientes', rotulo: 'Clientes', icone: Users },
  { id: 'locacoes', rotulo: 'Locações', icone: ClipboardList },
] as const

type Aba = (typeof ABAS)[number]['id']

/**
 * BI do sistema novo, com o relatório de clientes e o histórico de locações da primeira versão (anteriores aos
 * relatórios iguais aos do legado, que continuam no menu). A aba fica na URL (?aba=), para voltar direto a ela.
 */
export function BiPage() {
  const [parametros, setParametros] = useSearchParams()
  const aba: Aba = parametros.get('aba') === 'locacoes' ? 'locacoes' : 'clientes'

  function abrir(nova: Aba) {
    setParametros(nova === 'clientes' ? {} : { aba: nova }, { replace: true })
  }

  function aoTeclarNasAbas(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const outra: Aba = aba === 'clientes' ? 'locacoes' : 'clientes'
    abrir(outra)
    document.getElementById(`aba-bi-${outra}`)?.focus()
  }

  return (
    <>
      <PageHeader title="BI" description="Indicadores de clientes e de locações, com filtros livres e busca na hora." />

      <div
        role="tablist"
        aria-label="Assunto do BI"
        onKeyDown={aoTeclarNasAbas}
        className="mb-4 inline-grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
      >
        {ABAS.map((a) => (
          <button
            key={a.id}
            id={`aba-bi-${a.id}`}
            type="button"
            role="tab"
            aria-selected={aba === a.id}
            aria-controls={`painel-bi-${a.id}`}
            tabIndex={aba === a.id ? 0 : -1}
            onClick={() => abrir(a.id)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              aba === a.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <a.icone className="size-4" /> {a.rotulo}
          </button>
        ))}
      </div>

      {/* Só a aba aberta é montada: a outra não consulta o servidor à toa. */}
      <div role="tabpanel" id={`painel-bi-${aba}`} aria-labelledby={`aba-bi-${aba}`}>
        {aba === 'clientes' ? <BiClientesAba /> : <BiLocacoesAba />}
      </div>
    </>
  )
}
