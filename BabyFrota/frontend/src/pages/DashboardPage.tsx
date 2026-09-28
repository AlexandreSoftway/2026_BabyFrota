import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DollarSign, PackageCheck, PackageOpen, PercentCircle } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDashboardResumo } from '@/features/dashboard/api'
import { cn, formatarMoeda } from '@/lib/utils'

function KpiCard({
  titulo,
  valor,
  icon: Icon,
  descricao,
}: {
  titulo: string
  valor: string
  icon: typeof PercentCircle
  descricao?: string
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{valor}</div>
        {descricao && <p className="text-xs text-muted-foreground">{descricao}</p>}
      </CardContent>
    </Card>
  )
}

/** Data local em "aaaa-mm-dd" (o formato do input de data). */
function dataIso(data: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`
}

function diasAtras(dias: number) {
  const data = new Date()
  data.setDate(data.getDate() - dias)
  return dataIso(data)
}

const formatarDia = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`

export function DashboardPage() {
  const hoje = dataIso(new Date())
  const atalhos = [
    { rotulo: 'Hoje', inicio: hoje, fim: hoje },
    { rotulo: 'Ontem', inicio: diasAtras(1), fim: diasAtras(1) },
    { rotulo: 'Últimos 7 dias', inicio: diasAtras(6), fim: hoje },
    { rotulo: 'Este mês', inicio: `${hoje.slice(0, 8)}01`, fim: hoje },
  ]

  const [dataInicio, setDataInicio] = useState(hoje)
  const [dataFim, setDataFim] = useState(hoje)
  const periodoValido = Boolean(dataInicio && dataFim && dataInicio <= dataFim)

  // Com o período inválido (início depois do fim, ou data apagada), a tela continua no último período válido.
  const { data, isLoading, isError, isFetching } = useDashboardResumo({ dataInicio, dataFim }, periodoValido)

  const textoPeriodo = data
    ? data.dataInicio === data.dataFim
      ? formatarDia(data.dataInicio)
      : `${formatarDia(data.dataInicio)} a ${formatarDia(data.dataFim)}`
    : ''

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral da operação no período escolhido. Frota e caixa atual mostram o momento presente."
        actions={
          data && (
            <Badge variant={data.caixaAberto ? 'success' : 'secondary'}>
              {data.caixaAberto ? 'Caixa aberto' : 'Caixa fechado'}
            </Badge>
          )
        }
      />

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="dash-inicio">De</Label>
            <Input
              id="dash-inicio"
              type="date"
              value={dataInicio}
              max={dataFim || undefined}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dash-fim">Até</Label>
            <Input
              id="dash-fim"
              type="date"
              value={dataFim}
              min={dataInicio || undefined}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {atalhos.map((a) => {
              const ativo = a.inicio === dataInicio && a.fim === dataFim
              return (
                <Button
                  key={a.rotulo}
                  type="button"
                  size="sm"
                  variant={ativo ? 'default' : 'outline'}
                  aria-pressed={ativo}
                  onClick={() => {
                    setDataInicio(a.inicio)
                    setDataFim(a.fim)
                  }}
                >
                  {a.rotulo}
                </Button>
              )
            })}
          </div>
          {!periodoValido && (
            <p className="w-full text-xs text-destructive">Informe as duas datas, com a inicial antes da final.</p>
          )}
        </CardContent>
      </Card>

      {isError && (
        <Card className="mb-6 border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">
            Não foi possível carregar os dados do dashboard. Verifique se a API está em execução e se você
            está autenticado.
          </CardContent>
        </Card>
      )}

      <div className={cn('grid gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-4', isFetching && data && 'opacity-70')}>
        <KpiCard
          titulo="Ocupação da frota (agora)"
          valor={isLoading ? '—' : `${(data?.percentualOcupacao ?? 0).toLocaleString('pt-BR')}%`}
          icon={PercentCircle}
          descricao={
            isLoading
              ? undefined
              : `${data?.carrinhosAlugados ?? 0} alugados de ${data?.totalCarrinhos ?? 0} · ${data?.carrinhosDisponiveis ?? 0} disponíveis`
          }
        />
        <KpiCard
          titulo="Locações entregues"
          valor={isLoading ? '—' : String(data?.locacoesEntregues ?? 0)}
          icon={PackageOpen}
          descricao={isLoading ? undefined : `Carrinhos que saíram · ${textoPeriodo}`}
        />
        <KpiCard
          titulo="Faturamento"
          valor={isLoading ? '—' : formatarMoeda(data?.faturamento ?? 0)}
          icon={DollarSign}
          descricao={
            isLoading
              ? undefined
              : `${data?.locacoesDevolvidas ?? 0} devolvidas · ticket médio ${formatarMoeda(data?.ticketMedio ?? 0)}`
          }
        />
        <KpiCard
          titulo="Faturamento do caixa atual"
          valor={isLoading ? '—' : data?.faturamentoCaixaAtual != null ? formatarMoeda(data.faturamentoCaixaAtual) : '—'}
          icon={PackageCheck}
          descricao={isLoading ? undefined : data?.caixaAberto ? 'Caixa aberto agora' : 'Nenhum caixa aberto'}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Carrinhos mais alugados{textoPeriodo && ` · ${textoPeriodo}`}</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          {data && data.topCarrinhos.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topCarrinhos}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="descricao" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="quantidadeLocacoes" name="Locações" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {isLoading ? 'Carregando...' : 'Sem locações no período.'}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
