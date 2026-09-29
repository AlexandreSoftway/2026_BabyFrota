import { useMemo, useState, type ReactNode } from 'react'
import { DataTable, type DataTableColumn, type DataTableExportColumn } from '@/components/ui/data-table'
import type { ColunaRelatorio } from '@/features/relatorios/colunas'
import { textoDoValor, type GrupoCabecalho } from '@/lib/export'

const TAMANHO_PAGINA_PADRAO = 20

interface RelatorioTabelaProps<T> {
  colunas: ColunaRelatorio<T>[]
  grupos?: GrupoCabecalho[]
  /** O relatório inteiro: a tela pagina esta lista e a exportação leva ela toda. */
  linhas: T[]
  titulo: string
  nomeArquivo: string
  /** Filtros aplicados, impressos no Excel e no PDF. */
  subtitulo?: string
  colunaFixaPdf?: number
  /** Linha expansível: o que mostrar abaixo da linha aberta (ex.: o antes e depois do log). */
  renderDetail?: (linha: T) => ReactNode
  /** Células pequenas e sem quebra de linha (padrão). Desligue quando uma coluna tem texto longo. */
  compacta?: boolean
}

/**
 * Tabela de um relatório com a saída do legado. O servidor devolve o relatório inteiro (as procedures não paginam),
 * então a paginação é aqui, e a exportação leva todas as linhas, com as mesmas colunas e formatos da tela.
 */
export function RelatorioTabela<T extends object>({
  colunas,
  grupos,
  linhas,
  titulo,
  nomeArquivo,
  subtitulo,
  colunaFixaPdf,
  renderDetail,
  compacta = true,
}: RelatorioTabelaProps<T>) {
  const [pagina, setPagina] = useState(1)
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)

  // As linhas não têm uma chave única em todos os relatórios (a ocupação é por dia): usa a posição na lista.
  const posicao = useMemo(() => new Map(linhas.map((linha, i) => [linha, i])), [linhas])

  const totalPaginas = Math.max(1, Math.ceil(linhas.length / tamanhoPagina))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const dadosDaPagina = linhas.slice((paginaAtual - 1) * tamanhoPagina, paginaAtual * tamanhoPagina)

  const columns: DataTableColumn<T>[] = colunas.map((c) => ({
    header: c.cabecalho,
    cell: (linha) => textoDoValor(c.valor(linha), c.tipo),
    className: c.tipo ? 'text-right' : undefined,
  }))

  const exportColumns: DataTableExportColumn<T>[] = colunas.map((c) => ({
    cabecalho: c.cabecalho,
    tipo: c.tipo,
    value: c.valor,
  }))

  return (
    <DataTable
      columns={columns}
      data={dadosDaPagina}
      rowKey={(linha) => posicao.get(linha) ?? 0}
      emptyMessage="Não foram encontrados dados para o Relatório."
      pagina={paginaAtual}
      totalPaginas={totalPaginas}
      totalRegistros={linhas.length}
      tamanhoPagina={tamanhoPagina}
      onPageChange={setPagina}
      onTamanhoPaginaChange={(tamanho) => {
        setTamanhoPagina(tamanho)
        setPagina(1)
      }}
      headerGroups={grupos}
      compact={compacta}
      renderDetail={renderDetail}
      exportFormats={['excel', 'pdf', 'csv']}
      exportColumns={exportColumns}
      loadAllForExport={async () => linhas}
      exportFileName={nomeArquivo}
      exportTitle={titulo}
      exportSubtitle={subtitulo}
      exportPdfFixedColumn={colunaFixaPdf}
    />
  )
}
