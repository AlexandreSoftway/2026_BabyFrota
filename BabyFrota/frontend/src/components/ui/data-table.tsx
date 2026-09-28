import { Fragment, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Download, FileSpreadsheet, FileText, Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { PageSizeSelect } from '@/components/ui/page-size-select'
import {
  exportarCsv,
  exportarExcel,
  exportarPdf,
  type ColunaExportacao,
  type DadosExportacao,
  type GrupoCabecalho,
  type ValorExportavel,
} from '@/lib/export'
import { cn, extrairMensagemErro } from '@/lib/utils'
import { toast } from '@/stores/toast-store'

export interface DataTableColumn<T> {
  /** Pode ter "\n" para um cabeçalho em duas linhas. */
  header: string
  cell: (row: T) => ReactNode
  /** Usado na exportação CSV. Colunas sem isto ficam de fora do arquivo exportado. */
  exportValue?: (row: T) => string | number | null | undefined
  className?: string
}

/**
 * Coluna do arquivo exportado, quando ela precisa diferir da tela (ex.: a tela junta "aberto por" e "fechado por"
 * numa célula de duas linhas, mas o arquivo tem uma coluna para cada).
 */
export interface DataTableExportColumn<T> extends ColunaExportacao {
  value: (row: T) => ValorExportavel
}

export type FormatoExportacao = 'csv' | 'excel' | 'pdf'

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  rowKey: (row: T) => string | number
  isLoading?: boolean
  emptyMessage?: string
  /** Sem isto a caixa de busca não aparece. */
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  pagina: number
  totalPaginas: number
  totalRegistros: number
  tamanhoPagina: number
  onPageChange: (pagina: number) => void
  onTamanhoPaginaChange?: (tamanho: number) => void
  exportFileName?: string
  actions?: ReactNode

  /** Linha de total no rodapé, uma célula por coluna (na mesma ordem de `columns`; null deixa a célula vazia). */
  footer?: ReactNode[]
  /** Habilita linhas expansíveis: acrescenta uma coluna de seta e mostra este conteúdo abaixo da linha aberta. */
  renderDetail?: (row: T) => ReactNode

  /** Formatos oferecidos na exportação. Padrão: só CSV, como sempre foi. */
  exportFormats?: FormatoExportacao[]
  /** Colunas do arquivo, se diferirem das da tela. Sem isto, valem as colunas que têm `exportValue`. */
  exportColumns?: DataTableExportColumn<T>[]
  /** Linha de total do arquivo, alinhada a `exportColumns`. */
  exportFooter?: ValorExportavel[]
  /** Busca todos os registros do filtro (a tabela é paginada). Sem isto, exporta só a página carregada. */
  loadAllForExport?: () => Promise<T[]>
  exportTitle?: string
  /** Contexto impresso no arquivo, ex.: os filtros aplicados. */
  exportSubtitle?: string

  /** Faixa de títulos acima dos cabeçalhos (ex.: "DADOS DO CLIENTE"), também levada ao Excel e ao PDF. */
  headerGroups?: GrupoCabecalho[]
  /** Células menores e sem quebra de linha, para tabelas com muitas colunas. */
  compact?: boolean
  /** No PDF largo demais para uma página, a coluna repetida em cada página. */
  exportPdfFixedColumn?: number
}

const ROTULO_FORMATO: Record<FormatoExportacao, string> = { csv: 'Exportar CSV', excel: 'Excel', pdf: 'PDF' }

/**
 * Tabela de listagem com busca, paginação server-side e exportação (CSV por padrão; Excel e PDF opcionais).
 * Sem `loadAllForExport`, a exportação leva só os registros já carregados na página atual — para exportar a base
 * inteira a página precisa fornecer essa função.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading,
  emptyMessage = 'Nenhum registro encontrado.',
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  pagina,
  totalPaginas,
  totalRegistros,
  tamanhoPagina,
  onPageChange,
  onTamanhoPaginaChange,
  exportFileName = 'exportacao',
  actions,
  footer,
  renderDetail,
  exportFormats = ['csv'],
  exportColumns,
  exportFooter,
  loadAllForExport,
  exportTitle,
  exportSubtitle,
  headerGroups,
  compact,
  exportPdfFixedColumn,
}: DataTableProps<T>) {
  const [expandidos, setExpandidos] = useState<Set<string | number>>(new Set())
  const [exportando, setExportando] = useState<FormatoExportacao | null>(null)

  const totalColunas = columns.length + (renderDetail ? 1 : 0)

  function alternarLinha(chave: string | number) {
    setExpandidos((atual) => {
      const novo = new Set(atual)
      if (!novo.delete(chave)) novo.add(chave)
      return novo
    })
  }

  async function exportar(formato: FormatoExportacao) {
    setExportando(formato)
    try {
      const registros = loadAllForExport ? await loadAllForExport() : data
      const colunas: DataTableExportColumn<T>[] =
        exportColumns ??
        columns
          .filter((c) => c.exportValue)
          .map((c) => ({ cabecalho: c.header, value: (row: T) => c.exportValue?.(row) }))
      if (colunas.length === 0 || registros.length === 0) return

      const dados: DadosExportacao = {
        nomeArquivo: exportFileName,
        titulo: exportTitle ?? exportFileName,
        subtitulo: exportSubtitle,
        colunas: colunas.map(({ cabecalho, tipo }) => ({ cabecalho, tipo })),
        linhas: registros.map((row) => colunas.map((c) => c.value(row))),
        rodape: exportFooter,
        grupos: headerGroups,
        colunaFixaPdf: exportPdfFixedColumn,
      }

      if (formato === 'csv') exportarCsv(dados)
      else if (formato === 'excel') await exportarExcel(dados)
      else await exportarPdf(dados)
    } catch (err) {
      toast.error('Não foi possível exportar.', extrairMensagemErro(err))
    } finally {
      setExportando(null)
    }
  }

  const classeCabecalho = cn('whitespace-pre-line', compact && 'h-auto px-2 py-1.5 text-xs')
  const classeCelula = compact ? 'whitespace-nowrap px-2 py-1.5 text-xs' : undefined

  return (
    <div className="space-y-4">
      <div className={cn('flex flex-wrap items-center gap-2', onSearchChange ? 'justify-between' : 'justify-end')}>
        {onSearchChange && (
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-8"
              value={searchValue ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {onTamanhoPaginaChange && (
            <PageSizeSelect tamanhoPagina={tamanhoPagina} onChange={onTamanhoPaginaChange} />
          )}
          {actions}
          {exportFormats.map((formato) => (
            <Button
              key={formato}
              variant="outline"
              size="sm"
              onClick={() => exportar(formato)}
              disabled={data.length === 0 || exportando !== null}
              title={
                loadAllForExport
                  ? 'Exporta todos os registros do filtro atual'
                  : 'Exporta os registros carregados na página atual'
              }
            >
              {exportando === formato ? (
                <Loader2 className="size-4 animate-spin" />
              ) : formato === 'excel' ? (
                <FileSpreadsheet className="size-4" />
              ) : formato === 'pdf' ? (
                <FileText className="size-4" />
              ) : (
                <Download className="size-4" />
              )}{' '}
              {ROTULO_FORMATO[formato]}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              {headerGroups && headerGroups.length > 0 && (
                <TableRow className="hover:bg-transparent">
                  {renderDetail && <TableHead className="w-10 px-2" />}
                  {headerGroups.map((grupo, i) => (
                    <TableHead
                      key={i}
                      colSpan={grupo.colunas}
                      className={cn(
                        'border-x text-center font-semibold text-foreground',
                        compact && 'h-auto px-2 py-1.5 text-xs',
                      )}
                    >
                      {grupo.titulo}
                    </TableHead>
                  ))}
                </TableRow>
              )}
              <TableRow>
                {renderDetail && (
                  <TableHead className="w-10 px-2">
                    <span className="sr-only">Detalhes</span>
                  </TableHead>
                )}
                {/* Chave pela posição: os relatórios do legado repetem títulos ("Dt Nasc", "Gênero"...). */}
                {columns.map((col, i) => (
                  <TableHead key={i} className={cn(classeCabecalho, col.className)}>
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={totalColunas} className="text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={totalColunas} className="text-center text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                data.map((row) => {
                  const chave = rowKey(row)
                  const aberta = expandidos.has(chave)
                  return (
                    <Fragment key={chave}>
                      <TableRow>
                        {renderDetail && (
                          <TableCell className="w-10 px-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              aria-expanded={aberta}
                              aria-label={aberta ? 'Ocultar detalhes' : 'Ver detalhes'}
                              onClick={() => alternarLinha(chave)}
                            >
                              {aberta ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            </Button>
                          </TableCell>
                        )}
                        {columns.map((col, i) => (
                          <TableCell key={i} className={cn(classeCelula, col.className)}>
                            {col.cell(row)}
                          </TableCell>
                        ))}
                      </TableRow>
                      {renderDetail && aberta && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={totalColunas} className="py-3">
                            {renderDetail(row)}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
            </TableBody>
            {footer && !isLoading && data.length > 0 && (
              <TableFooter>
                <TableRow className="hover:bg-transparent">
                  {renderDetail && <TableCell className="px-2" />}
                  {columns.map((col, i) => (
                    <TableCell key={i} className={cn(classeCelula, col.className)}>
                      {footer[i]}
                    </TableCell>
                  ))}
                </TableRow>
              </TableFooter>
            )}
          </Table>
          <Pagination
            pagina={pagina}
            totalPaginas={totalPaginas}
            totalRegistros={totalRegistros}
            tamanhoPagina={tamanhoPagina}
            onPageChange={onPageChange}
          />
        </CardContent>
      </Card>
    </div>
  )
}
