import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Clock, DollarSign, ListChecks, TicketPercent } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { useBiFaturamentoPorDia, useBiLocacoes, useBiLocacoesResumo } from '@/features/bi/api'
import type { BiLocacao, BiLocacoesFiltro } from '@/features/bi/types'
import { useCarrinhos } from '@/features/carrinhos/api'
import { useTiposCarrinho } from '@/features/tipos-carrinho/api'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { extrairMensagemErro, formatarDataHora, formatarMoeda } from '@/lib/utils'
import { toast } from '@/stores/toast-store'
import { KpiCard } from './KpiCard'

const TAMANHO_PAGINA_PADRAO = 10

function formatarTempo(minutos: number | null) {
  if (!minutos || minutos <= 0) return '—'
  const horas = Math.floor(minutos / 60)
  const restante = minutos % 60
  return horas > 0 ? `${horas}h ${restante}min` : `${restante}min`
}

/** Aba "Locações" do BI: faturamento, tempo de uso e ocupação, paginado no servidor. */
export function BiLocacoesAba() {
  const [dataEntregaInicio, setDataEntregaInicio] = useState('')
  const [dataEntregaFinal, setDataEntregaFinal] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [carrinhoId, setCarrinhoId] = useState(0)
  const [tipoCarrinhoId, setTipoCarrinhoId] = useState(0)
  const [somenteEmAndamento, setSomenteEmAndamento] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)

  const { data: carrinhos } = useCarrinhos({ tamanhoPagina: 500 })
  const { data: tiposCarrinho } = useTiposCarrinho()

  const clienteNomeAtrasado = useDebouncedValue(clienteNome, 400)

  const filtro: BiLocacoesFiltro = {
    dataEntregaInicio: dataEntregaInicio || undefined,
    dataEntregaFinal: dataEntregaFinal || undefined,
    clienteNome: clienteNomeAtrasado || undefined,
    carrinhoId: carrinhoId || undefined,
    tipoCarrinhoId: tipoCarrinhoId || undefined,
    somenteEmAndamento: somenteEmAndamento || undefined,
    pagina,
    tamanhoPagina,
  }

  const { data, isLoading, isError, error } = useBiLocacoes(filtro)
  const { data: resumo } = useBiLocacoesResumo(filtro)
  const { data: faturamentoPorDia } = useBiFaturamentoPorDia(filtro)
  const semFiltroDeData = !dataEntregaInicio && !dataEntregaFinal

  useEffect(() => {
    if (isError) toast.error('Não foi possível carregar o BI de locações.', extrairMensagemErro(error))
  }, [isError, error])

  function alterar<T>(setter: (v: T) => void) {
    return (valor: T) => {
      setter(valor)
      setPagina(1)
    }
  }

  const columns: DataTableColumn<BiLocacao>[] = [
    { header: 'Entrega', cell: (l) => formatarDataHora(l.dataEntrega), exportValue: (l) => formatarDataHora(l.dataEntrega) },
    { header: 'Cliente', cell: (l) => <span className="font-medium">{l.clienteNome}</span>, exportValue: (l) => l.clienteNome },
    {
      header: 'Carrinho',
      cell: (l) => <Badge variant="default">{l.carrinhoDescricao}</Badge>,
      exportValue: (l) => l.carrinhoDescricao,
    },
    { header: 'Tipo', cell: (l) => l.tipoCarrinhoDescricao, exportValue: (l) => l.tipoCarrinhoDescricao },
    { header: 'Tempo', cell: (l) => formatarTempo(l.tempoMinutos), exportValue: (l) => l.tempoMinutos ?? '' },
    {
      header: 'Valor total',
      cell: (l) => (l.valorTotal != null ? formatarMoeda(l.valorTotal) : '—'),
      exportValue: (l) => l.valorTotal ?? '',
    },
    {
      header: 'Pagamento',
      cell: (l) => (l.quantidadeParcelas > 1 ? `${l.formaPagamento} (+${l.quantidadeParcelas - 1})` : l.formaPagamento),
      exportValue: (l) => l.formaPagamento,
    },
    { header: 'Usuário entrega', cell: (l) => l.usuarioEntregaNome, exportValue: (l) => l.usuarioEntregaNome },
    {
      header: 'Status',
      cell: (l) => (
        <Badge variant={l.emAndamento ? 'warning' : 'success'}>{l.emAndamento ? 'Em andamento' : 'Devolvida'}</Badge>
      ),
      exportValue: (l) => (l.emAndamento ? 'Em andamento' : 'Devolvida'),
    },
  ]

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard titulo="Locações no período" valor={resumo ? String(resumo.totalLocacoes) : '—'} icon={ListChecks} />
        <KpiCard titulo="Faturamento" valor={resumo ? formatarMoeda(resumo.faturamento) : '—'} icon={DollarSign} />
        <KpiCard titulo="Ticket médio" valor={resumo ? formatarMoeda(resumo.ticketMedio) : '—'} icon={TicketPercent} />
        <KpiCard
          titulo="Tempo médio de uso"
          valor={resumo ? formatarTempo(Math.round(resumo.tempoMedioMinutos)) : '—'}
          icon={Clock}
        />
      </div>

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 pt-6 md:grid-cols-3 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="bi-dataEntregaInicio">Entrega de</Label>
            <Input
              id="bi-dataEntregaInicio"
              type="date"
              value={dataEntregaInicio}
              onChange={(e) => alterar(setDataEntregaInicio)(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bi-dataEntregaFinal">Entrega até</Label>
            <Input
              id="bi-dataEntregaFinal"
              type="date"
              value={dataEntregaFinal}
              onChange={(e) => alterar(setDataEntregaFinal)(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bi-carrinhoId">Carrinho</Label>
            <Select id="bi-carrinhoId" value={carrinhoId} onChange={(e) => alterar(setCarrinhoId)(Number(e.target.value))}>
              <option value={0}>Todos</option>
              {carrinhos?.itens.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.descricao}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bi-tipoCarrinhoId">Tipo de carrinho</Label>
            <Select
              id="bi-tipoCarrinhoId"
              value={tipoCarrinhoId}
              onChange={(e) => alterar(setTipoCarrinhoId)(Number(e.target.value))}
              disabled={carrinhoId > 0}
            >
              <option value={0}>Todos</option>
              {tiposCarrinho?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.descricao}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end space-x-2 pb-2">
            <input
              id="bi-somenteEmAndamento"
              type="checkbox"
              className="size-4"
              checked={somenteEmAndamento}
              onChange={(e) => alterar(setSomenteEmAndamento)(e.target.checked)}
            />
            <Label htmlFor="bi-somenteEmAndamento" className="cursor-pointer font-normal">
              Somente em andamento
            </Label>
          </div>
          {semFiltroDeData && (
            <p className="col-span-full text-xs text-muted-foreground">
              Sem data selecionada, mostrando os últimos 90 dias por padrão (evita consultas lentas sobre todo o
              histórico). Escolha um período específico para ver datas mais antigas.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Faturamento por dia</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {faturamentoPorDia && faturamentoPorDia.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={faturamentoPorDia}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="data"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(v) => new Date(v).toLocaleDateString('pt-BR')}
                  formatter={(value: number) => formatarMoeda(value)}
                />
                <Bar dataKey="faturamento" name="Faturamento" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem locações no período.
            </div>
          )}
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={data?.itens ?? []}
        rowKey={(l) => l.id}
        isLoading={isLoading}
        searchValue={clienteNome}
        onSearchChange={alterar(setClienteNome)}
        searchPlaceholder="Buscar por cliente..."
        emptyMessage="Nenhuma locação encontrada para os filtros selecionados."
        pagina={data?.pagina ?? pagina}
        totalPaginas={data?.totalPaginas ?? 0}
        totalRegistros={data?.totalRegistros ?? 0}
        tamanhoPagina={data?.tamanhoPagina ?? tamanhoPagina}
        onPageChange={setPagina}
        onTamanhoPaginaChange={(t) => {
          setTamanhoPagina(t)
          setPagina(1)
        }}
        exportFileName="bi-locacoes"
      />
    </>
  )
}
