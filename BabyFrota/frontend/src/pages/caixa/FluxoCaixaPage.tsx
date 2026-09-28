import { useEffect, useMemo, useState } from 'react'
import { Banknote, CreditCard, Landmark, ListChecks, Receipt, TrendingDown, TriangleAlert } from 'lucide-react'
import { FluxoCaixaGraficos } from '@/components/caixa/FluxoCaixaGraficos'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn, type DataTableExportColumn } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { buscarFluxoCaixaCompleto, useFluxoCaixa, useFluxoCaixaResumo } from '@/features/caixa/api'
import { FORMA_DINHEIRO_ID, type FluxoCaixa, type FluxoCaixaFiltro } from '@/features/caixa/types'
import { useFormasRecebimento } from '@/features/locacoes/api'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { PERFIS_SUPERVISAO } from '@/lib/perfis'
import { extrairMensagemErro, formatarDataHora, formatarMoeda } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { toast } from '@/stores/toast-store'

const TAMANHO_PAGINA_PADRAO = 10

function KpiCard({
  titulo,
  valor,
  complemento,
  icon: Icon,
}: {
  titulo: string
  valor: string
  complemento?: string
  icon: typeof Receipt
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{valor}</div>
        {complemento && <p className="mt-1 text-xs text-muted-foreground">{complemento}</p>}
      </CardContent>
    </Card>
  )
}

function formatarMinutos(minutos: number): string {
  const horas = Math.floor(minutos / 60)
  return horas > 0 ? `${horas}h ${minutos % 60}min` : `${minutos}min`
}

/** 'aaaa-mm-dd' (valor do input de data) para 'dd/mm/aaaa', sem passar por Date para não deslocar o dia por fuso. */
function formatarDataInput(valor: string): string {
  const [ano, mes, dia] = valor.split('-')
  return `${dia}/${mes}/${ano}`
}

/** O que o comprovante de fechamento do legado apurava, mais quem recebeu as devoluções. */
function DetalheCaixa({ caixa }: { caixa: FluxoCaixa }) {
  const inicio = new Date(caixa.dataAbertura).getTime()
  const fim = caixa.dataFechamento ? new Date(caixa.dataFechamento).getTime() : Date.now()
  const minutosTrabalhados = Math.max(0, Math.round((fim - inicio) / 60000))

  const itens: Array<[string, string]> = [
    ['Suprimento inicial', formatarMoeda(caixa.suprimentoInicial)],
    ['Reforços (suprimentos)', formatarMoeda(caixa.reforcos)],
    ['Troco devolvido', formatarMoeda(caixa.troco)],
    ['Locações devolvidas', String(caixa.quantidadeLocacoes)],
    ...(caixa.locacoesPendentes > 0 ? [['Locações sem devolução', String(caixa.locacoesPendentes)] as [string, string]] : []),
    [caixa.aberto ? 'Aberto há' : 'Horas trabalhadas', formatarMinutos(minutosTrabalhados)],
  ]

  return (
    <div className="grid gap-4 text-sm md:grid-cols-2">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        {itens.map(([rotulo, valor]) => (
          <div key={rotulo} className="contents">
            <dt className="text-muted-foreground">{rotulo}</dt>
            <dd className="text-right font-medium tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>

      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recebido por utilizador</p>
        {caixa.recebidoPorUsuario.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma devolução neste caixa.</p>
        ) : (
          <ul className="space-y-1">
            {caixa.recebidoPorUsuario.map((u) => (
              <li key={u.usuarioId} className="flex items-baseline gap-2">
                <span>{u.usuarioNome}</span>
                <span className="text-xs text-muted-foreground">
                  {u.quantidadeLocacoes} {u.quantidadeLocacoes === 1 ? 'locação' : 'locações'}
                </span>
                <span className="ml-auto font-medium tabular-nums">{formatarMoeda(u.totalRecebido)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {caixa.somaFormasDiverge && (
        <p className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800 md:col-span-2">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          A soma das formas de recebimento não bate com o total vendido deste caixa (provável parcela em duplicidade do
          fluxo antigo de entrega). Confira as locações antes de usar estes valores.
        </p>
      )}
    </div>
  )
}

export function FluxoCaixaPage() {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [usuarioNome, setUsuarioNome] = useState('')
  const [pagina, setPagina] = useState(1)
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)

  const perfilId = useAuthStore((s) => s.usuario?.perfilId)
  const veTodos = perfilId !== undefined && PERFIS_SUPERVISAO.includes(perfilId)

  const usuarioNomeAtrasado = useDebouncedValue(usuarioNome, 400)

  const filtro: FluxoCaixaFiltro = {
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    usuarioNome: usuarioNomeAtrasado || undefined,
    pagina,
    tamanhoPagina,
  }

  const { data: formasBrutas } = useFormasRecebimento()
  // Na ordem dos ids (Dinheiro, Débito, Crédito, Pix): a API devolve por nome, e a cor de cada forma é fixa pelo id.
  const formas = useMemo(() => [...(formasBrutas ?? [])].sort((a, b) => a.id - b.id), [formasBrutas])

  const { data, isLoading, isError, error } = useFluxoCaixa(filtro)
  const { data: resumo, isFetching: atualizandoResumo, isPlaceholderData } = useFluxoCaixaResumo(filtro)
  const totais = resumo?.totais
  const semFiltroDeData = !dataInicio && !dataFim

  useEffect(() => {
    if (isError) toast.error('Não foi possível carregar o fluxo de caixa.', extrairMensagemErro(error))
  }, [isError, error])

  const dinheiroTotal = totais?.porForma[String(FORMA_DINHEIRO_ID)] ?? 0
  const eletronicoTotal = totais
    ? Object.entries(totais.porForma).reduce((soma, [id, valor]) => (Number(id) === FORMA_DINHEIRO_ID ? soma : soma + valor), 0)
    : 0

  const columns = useMemo<DataTableColumn<FluxoCaixa>[]>(
    () => [
      { header: 'Nº', cell: (c) => <span className="font-medium tabular-nums">#{c.id}</span> },
      {
        header: 'Utilizador',
        cell: (c) => (
          <div>
            <p className="font-medium">{c.usuarioAberturaNome}</p>
            {c.usuarioFechamentoNome && c.usuarioFechamentoNome !== c.usuarioAberturaNome && (
              <p className="text-xs text-muted-foreground">Fechou: {c.usuarioFechamentoNome}</p>
            )}
          </div>
        ),
      },
      {
        header: 'Abertura / Fechamento',
        cell: (c) => (
          <div className="text-xs">
            <p>{formatarDataHora(c.dataAbertura)}</p>
            <p className="text-muted-foreground">
              {c.dataFechamento ? formatarDataHora(c.dataFechamento) : <Badge variant="warning">Aberto</Badge>}
            </p>
          </div>
        ),
      },
      ...formas.map(
        (f): DataTableColumn<FluxoCaixa> => ({
          header: f.nome,
          className: 'text-right tabular-nums',
          cell: (c) => formatarMoeda(c.porForma[String(f.id)] ?? 0),
        }),
      ),
      {
        header: 'Total vendido',
        className: 'text-right tabular-nums font-medium',
        cell: (c) => (
          <span className="inline-flex items-center justify-end gap-1.5">
            {c.somaFormasDiverge && (
              <TriangleAlert
                className="size-4 text-amber-600"
                aria-label="A soma das formas não bate com o total vendido"
              />
            )}
            {formatarMoeda(c.totalVendido)}
          </span>
        ),
      },
      { header: 'Gastos', className: 'text-right tabular-nums', cell: (c) => formatarMoeda(c.totalGastos) },
      {
        header: 'Saldo em dinheiro',
        className: 'text-right tabular-nums font-medium',
        cell: (c) => formatarMoeda(c.saldoEmDinheiro),
      },
    ],
    [formas],
  )

  const footer = totais
    ? [
        <span key="total">Total ({totais.quantidadeCaixas})</span>,
        null,
        null,
        ...formas.map((f) => formatarMoeda(totais.porForma[String(f.id)] ?? 0)),
        formatarMoeda(totais.totalVendido),
        formatarMoeda(totais.totalGastos),
        formatarMoeda(totais.saldoEmDinheiro),
      ]
    : undefined

  // O arquivo separa "aberto por" de "fechado por" e as datas em colunas próprias; a tela junta cada par numa célula.
  const exportColumns = useMemo<DataTableExportColumn<FluxoCaixa>[]>(
    () => [
      { cabecalho: 'Nº', tipo: 'inteiro', value: (c) => c.id },
      { cabecalho: 'Aberto por', value: (c) => c.usuarioAberturaNome },
      { cabecalho: 'Fechado por', value: (c) => c.usuarioFechamentoNome ?? '' },
      { cabecalho: 'Abertura', value: (c) => formatarDataHora(c.dataAbertura) },
      { cabecalho: 'Fechamento', value: (c) => (c.dataFechamento ? formatarDataHora(c.dataFechamento) : 'Aberto') },
      { cabecalho: 'Locações', tipo: 'inteiro', value: (c) => c.quantidadeLocacoes },
      ...formas.map(
        (f): DataTableExportColumn<FluxoCaixa> => ({
          cabecalho: f.nome,
          tipo: 'moeda',
          value: (c) => c.porForma[String(f.id)] ?? 0,
        }),
      ),
      { cabecalho: 'Total vendido', tipo: 'moeda', value: (c) => c.totalVendido },
      { cabecalho: 'Gastos (sangrias)', tipo: 'moeda', value: (c) => c.totalGastos },
      { cabecalho: 'Saldo em dinheiro', tipo: 'moeda', value: (c) => c.saldoEmDinheiro },
    ],
    [formas],
  )

  const exportFooter = totais
    ? [
        'Total',
        `${totais.quantidadeCaixas} ${totais.quantidadeCaixas === 1 ? 'caixa' : 'caixas'}`,
        '',
        '',
        '',
        totais.quantidadeLocacoes,
        ...formas.map((f) => totais.porForma[String(f.id)] ?? 0),
        totais.totalVendido,
        totais.totalGastos,
        totais.saldoEmDinheiro,
      ]
    : undefined

  const periodo =
    dataInicio || dataFim
      ? `Período (abertura do caixa): ${dataInicio ? formatarDataInput(dataInicio) : 'início'} a ${dataFim ? formatarDataInput(dataFim) : 'hoje'}`
      : 'Período: últimos 30 dias'
  const exportSubtitle = [periodo, usuarioNomeAtrasado ? `Utilizador: ${usuarioNomeAtrasado}` : null]
    .filter(Boolean)
    .join('  |  ')

  return (
    <>
      <PageHeader
        title="Fluxo de Caixa"
        description="Vendas, gastos e saldo em dinheiro de cada caixa, por forma de recebimento. Tudo segue os filtros abaixo."
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 pt-6 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="dataInicio">Abertura de</Label>
            <Input
              id="dataInicio"
              type="date"
              value={dataInicio}
              onChange={(e) => {
                setDataInicio(e.target.value)
                setPagina(1)
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dataFim">Abertura até</Label>
            <Input
              id="dataFim"
              type="date"
              value={dataFim}
              onChange={(e) => {
                setDataFim(e.target.value)
                setPagina(1)
              }}
            />
          </div>
          {semFiltroDeData && (
            <p className="col-span-full text-xs text-muted-foreground">
              Sem data selecionada, mostrando os últimos 30 dias por padrão (evita consultas lentas sobre todo o
              histórico). Escolha um período para ver datas mais antigas. O nome do utilizador é filtrado na busca da
              tabela.
            </p>
          )}
          {!veTodos && (
            <p className="col-span-full text-xs text-muted-foreground">
              Você vê apenas os caixas que abriu ou fechou. Administrador e Gerente veem todos.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          titulo="Total vendido"
          valor={totais ? formatarMoeda(totais.totalVendido) : '—'}
          complemento={totais ? `${totais.quantidadeLocacoes} locações` : undefined}
          icon={Receipt}
        />
        <KpiCard
          titulo="Dinheiro"
          valor={totais ? formatarMoeda(dinheiroTotal) : '—'}
          complemento="líquido de troco"
          icon={Banknote}
        />
        <KpiCard
          titulo="Débito, crédito e pix"
          valor={totais ? formatarMoeda(eletronicoTotal) : '—'}
          complemento="não passa pela gaveta"
          icon={CreditCard}
        />
        <KpiCard
          titulo="Gastos"
          valor={totais ? formatarMoeda(totais.totalGastos) : '—'}
          complemento="sangrias"
          icon={TrendingDown}
        />
        <KpiCard
          titulo="Saldo em dinheiro"
          valor={totais ? formatarMoeda(totais.saldoEmDinheiro) : '—'}
          complemento="calculado pelo sistema"
          icon={Landmark}
        />
        <KpiCard
          titulo="Caixas"
          valor={totais ? String(totais.quantidadeCaixas) : '—'}
          complemento={
            totais ? (totais.caixasAbertos > 0 ? `${totais.caixasAbertos} em aberto` : 'todos fechados') : undefined
          }
          icon={ListChecks}
        />
      </div>

      <FluxoCaixaGraficos resumo={resumo} formas={formas} atualizando={atualizandoResumo && isPlaceholderData} />

      {totais && totais.caixasComDivergencia > 0 && (
        <p className="mb-4 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {totais.caixasComDivergencia === 1
            ? '1 caixa tem'
            : `${totais.caixasComDivergencia} caixas têm`}{' '}
          formas de recebimento que não somam o total vendido (parcelas em duplicidade do fluxo antigo de entrega).
          Estão marcados com o ícone de alerta na tabela.
        </p>
      )}

      <DataTable
        columns={columns}
        data={data?.itens ?? []}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        searchValue={usuarioNome}
        onSearchChange={(v) => {
          setUsuarioNome(v)
          setPagina(1)
        }}
        searchPlaceholder="Buscar por utilizador (abriu ou fechou)..."
        emptyMessage="Nenhum caixa encontrado para os filtros selecionados."
        pagina={data?.pagina ?? pagina}
        totalPaginas={data?.totalPaginas ?? 0}
        totalRegistros={data?.totalRegistros ?? 0}
        tamanhoPagina={data?.tamanhoPagina ?? tamanhoPagina}
        onPageChange={setPagina}
        onTamanhoPaginaChange={(t) => {
          setTamanhoPagina(t)
          setPagina(1)
        }}
        renderDetail={(c) => <DetalheCaixa caixa={c} />}
        footer={footer}
        exportFileName="fluxo-de-caixa"
        exportTitle="Fluxo de Caixa"
        exportSubtitle={exportSubtitle}
        exportFormats={['excel', 'pdf', 'csv']}
        exportColumns={exportColumns}
        exportFooter={exportFooter}
        loadAllForExport={() =>
          buscarFluxoCaixaCompleto({
            dataInicio: dataInicio || undefined,
            dataFim: dataFim || undefined,
            usuarioNome: usuarioNomeAtrasado || undefined,
          })
        }
      />

      {totais && totais.caixasAbertos > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Caixas em aberto entram nos totais com o que já foi apurado até agora.
        </p>
      )}
    </>
  )
}
