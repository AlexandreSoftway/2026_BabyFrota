import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarDays, Clock, DollarSign, Gauge, ListChecks, Loader2, Play, TicketPercent } from 'lucide-react'
import { ClienteAutocomplete } from '@/components/clientes/ClienteAutocomplete'
import { PageHeader } from '@/components/layout/PageHeader'
import { RelatorioTabela } from '@/components/relatorios/RelatorioTabela'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useCarrinhos } from '@/features/carrinhos/api'
import type { Cliente } from '@/features/clientes/types'
import { useRelatorioHistorico, useUsuariosRelatorio, type PedidoRelatorio } from '@/features/relatorios/api'
import {
  colunasDetalhado,
  colunasOcupacao,
  colunasSimplificado,
  dataCurta,
  gruposDetalhado,
  gruposOcupacao,
  gruposSimplificado,
} from '@/features/relatorios/colunas'
import type {
  HistoricoLocacaoDetalhado,
  HistoricoLocacaoSimplificado,
  HistoricoOcupacao,
  ModeloHistorico,
  RelatorioHistoricoFiltro,
} from '@/features/relatorios/types'
import { useTiposCarrinho } from '@/features/tipos-carrinho/api'
import { extrairMensagemErro, formatarMinutos, formatarMoeda } from '@/lib/utils'
import { toast } from '@/stores/toast-store'

const MODELOS: Record<ModeloHistorico, { rotulo: string; descricao: string; titulo: string; arquivo: string }> = {
  ocupacao: {
    rotulo: 'Histórico de Locações (ocupação por dia)',
    descricao:
      'Uma linha por dia (caixa fechado): minutos disponíveis, usados e ociosos, faturamento e tempo ocioso por faixa de hora. Só locações devolvidas.',
    titulo: 'Histórico de Locações',
    arquivo: 'historico-locacoes',
  },
  detalhado: {
    rotulo: 'Histórico Detalhado',
    descricao: 'Uma linha por locação, com os dados do dia, do caixa, do cliente (e filhos), do carrinho e do pagamento.',
    titulo: 'Histórico de Locações Detalhado',
    arquivo: 'historico-locacoes-detalhado',
  },
  simplificado: {
    rotulo: 'Histórico Simplificado',
    descricao: 'Uma linha por locação, com as colunas principais.',
    titulo: 'Histórico de Locações Simplificado',
    arquivo: 'historico-locacoes-simplificado',
  },
}

function dataIso(data: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`
}

function KpiCard({ titulo, valor, icon: Icon }: { titulo: string; valor: string; icon: typeof Clock }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{valor}</div>
      </CardContent>
    </Card>
  )
}

/** Faturamento somado por dia (data da entrega, ou da abertura do caixa na ocupação). */
function faturamentoPorDia(linhas: { data: string; valor: number | null }[]) {
  const porDia = new Map<string, number>()
  for (const { data, valor } of linhas) {
    const dia = data.slice(0, 10)
    porDia.set(dia, (porDia.get(dia) ?? 0) + (valor ?? 0))
  }
  return [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([data, faturamento]) => ({ data, faturamento }))
}

interface Gerado {
  modelo: ModeloHistorico
  pedido: PedidoRelatorio<RelatorioHistoricoFiltro>
  /** Os filtros aplicados, em texto, para o cabeçalho do Excel e do PDF. */
  filtros: string
}

export function HistoricoLocacoesPage() {
  const hoje = new Date()
  const [modelo, setModelo] = useState<ModeloHistorico>('ocupacao')
  const [dataInicio, setDataInicio] = useState(() => dataIso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)))
  const [dataFim, setDataFim] = useState(() => dataIso(hoje))
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [carrinhoId, setCarrinhoId] = useState(0)
  const [tipoCarrinhoId, setTipoCarrinhoId] = useState(0)
  const [usuarioEntregaId, setUsuarioEntregaId] = useState(0)
  const [usuarioDevolucaoId, setUsuarioDevolucaoId] = useState(0)
  const [gerado, setGerado] = useState<Gerado | null>(null)

  const { data: carrinhos } = useCarrinhos({ tamanhoPagina: 500 })
  const { data: tiposCarrinho } = useTiposCarrinho()
  const { data: usuarios } = useUsuariosRelatorio()

  // Um hook por modelo; só o do modelo gerado consulta.
  const pedidoDe = (m: ModeloHistorico) => (gerado?.modelo === m ? gerado.pedido : null)
  const ocupacao = useRelatorioHistorico<HistoricoOcupacao>('ocupacao', pedidoDe('ocupacao'))
  const detalhado = useRelatorioHistorico<HistoricoLocacaoDetalhado>('detalhado', pedidoDe('detalhado'))
  const simplificado = useRelatorioHistorico<HistoricoLocacaoSimplificado>('simplificado', pedidoDe('simplificado'))
  const consulta = gerado?.modelo === 'detalhado' ? detalhado : gerado?.modelo === 'simplificado' ? simplificado : ocupacao

  useEffect(() => {
    if (consulta.isError) toast.error('Não foi possível gerar o relatório.', extrairMensagemErro(consulta.error))
  }, [consulta.isError, consulta.error])

  const periodoValido = Boolean(dataInicio && dataFim)

  function gerar(e: FormEvent) {
    e.preventDefault()
    if (!periodoValido) return
    // Como no legado: com carrinho escolhido, o tipo não é enviado.
    const tipo = carrinhoId > 0 ? 0 : tipoCarrinhoId
    const filtro: RelatorioHistoricoFiltro = {
      dataEntregaInicio: dataInicio,
      dataEntregaFinal: dataFim,
      clienteId: cliente?.id,
      carrinhoId: carrinhoId || undefined,
      tipoCarrinhoId: tipo || undefined,
      usuarioEntregaId: usuarioEntregaId || undefined,
      usuarioDevolucaoId: usuarioDevolucaoId || undefined,
    }
    const nomeDe = <T extends { id: number }>(lista: T[] | undefined, id: number, nome: (x: T) => string) => {
      const item = id ? lista?.find((x) => x.id === id) : undefined
      return item ? nome(item) : null
    }
    const filtros = [
      `Entrega de ${dataCurta(dataInicio)} até ${dataCurta(dataFim)}`,
      cliente ? `Cliente: ${cliente.nome}` : null,
      nomeDe(carrinhos?.itens, carrinhoId, (c) => `Carrinho: ${c.descricao}`),
      nomeDe(tiposCarrinho, tipo, (t) => `Tipo: ${t.descricao}`),
      nomeDe(usuarios, usuarioEntregaId, (u) => `Entregou: ${u.nome}`),
      nomeDe(usuarios, usuarioDevolucaoId, (u) => `Devolveu: ${u.nome}`),
    ]
      .filter(Boolean)
      .join(' · ')
    setGerado((anterior) => ({ modelo, filtros, pedido: { filtro, geracao: (anterior?.pedido.geracao ?? 0) + 1 } }))
  }

  function limpar() {
    setCliente(null)
    setCarrinhoId(0)
    setTipoCarrinhoId(0)
    setUsuarioEntregaId(0)
    setUsuarioDevolucaoId(0)
  }

  const carregando = consulta.isFetching
  // O último relatório gerado, quando já chegou (some enquanto um novo está sendo gerado).
  const resultado = carregando ? null : gerado

  return (
    <>
      <PageHeader
        title="Histórico de Locações"
        description="Os três relatórios de histórico do legado, com a mesma saída de dados: mesmas procedures, colunas e formatos."
      />

      <Card className="mb-4">
        <CardContent className="pt-6">
          <form onSubmit={gerar} className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="modelo">Relatório</Label>
              <Select id="modelo" value={modelo} onChange={(e) => setModelo(e.target.value as ModeloHistorico)}>
                {(Object.keys(MODELOS) as ModeloHistorico[]).map((m) => (
                  <option key={m} value={m}>
                    {MODELOS[m].rotulo}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">{MODELOS[modelo].descricao}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dataInicio">Entrega de *</Label>
              <Input id="dataInicio" type="date" required value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dataFim">Entrega até *</Label>
              <Input id="dataFim" type="date" required value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Cliente</Label>
              <ClienteAutocomplete clienteSelecionado={cliente} onSelecionar={setCliente} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="carrinhoId">Carrinho</Label>
              <Select id="carrinhoId" value={carrinhoId} onChange={(e) => setCarrinhoId(Number(e.target.value))}>
                <option value={0}>Todos</option>
                {carrinhos?.itens.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.descricao}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipoCarrinhoId">Tipo de carrinho</Label>
              <Select
                id="tipoCarrinhoId"
                value={carrinhoId > 0 ? 0 : tipoCarrinhoId}
                onChange={(e) => setTipoCarrinhoId(Number(e.target.value))}
                disabled={carrinhoId > 0}
                title={carrinhoId > 0 ? 'Com um carrinho escolhido, o tipo não se aplica (como no legado).' : undefined}
              >
                <option value={0}>Todos</option>
                {tiposCarrinho?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.descricao}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="usuarioEntregaId">Quem entregou</Label>
              <Select id="usuarioEntregaId" value={usuarioEntregaId} onChange={(e) => setUsuarioEntregaId(Number(e.target.value))}>
                <option value={0}>Todos</option>
                {usuarios?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="usuarioDevolucaoId">Quem devolveu</Label>
              <Select
                id="usuarioDevolucaoId"
                value={usuarioDevolucaoId}
                onChange={(e) => setUsuarioDevolucaoId(Number(e.target.value))}
              >
                <option value={0}>Todos</option>
                {usuarios?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-2 flex items-end justify-end gap-2">
              <Button type="button" variant="outline" onClick={limpar} disabled={carregando}>
                Limpar filtros
              </Button>
              <Button type="submit" disabled={carregando || !periodoValido}>
                {carregando ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                {carregando ? 'Gerando...' : 'Gerar relatório'}
              </Button>
            </div>
            {!periodoValido && (
              <p className="col-span-full text-xs text-destructive">Informe a data inicial e a data final da entrega.</p>
            )}
          </form>
        </CardContent>
      </Card>

      {carregando && (
        <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Gerando o relatório. Em períodos longos pode levar alguns minutos.
        </p>
      )}

      {resultado?.modelo === 'ocupacao' && ocupacao.data && (
        <ResultadoOcupacao linhas={ocupacao.data} gerado={resultado} />
      )}
      {resultado?.modelo === 'detalhado' && detalhado.data && (
        <ResultadoLocacoes
          linhas={detalhado.data}
          gerado={resultado}
          tabela={
            <RelatorioTabela
              key={resultado.pedido.geracao}
              colunas={colunasDetalhado}
              grupos={gruposDetalhado}
              linhas={detalhado.data}
              titulo={MODELOS.detalhado.titulo}
              nomeArquivo={MODELOS.detalhado.arquivo}
              subtitulo={resultado.filtros}
              colunaFixaPdf={41}
            />
          }
        />
      )}
      {resultado?.modelo === 'simplificado' && simplificado.data && (
        <ResultadoLocacoes
          linhas={simplificado.data}
          gerado={resultado}
          tabela={
            <RelatorioTabela
              key={resultado.pedido.geracao}
              colunas={colunasSimplificado}
              grupos={gruposSimplificado}
              linhas={simplificado.data}
              titulo={MODELOS.simplificado.titulo}
              nomeArquivo={MODELOS.simplificado.arquivo}
              subtitulo={resultado.filtros}
            />
          }
        />
      )}
    </>
  )
}

function GraficoFaturamento({ dados }: { dados: { data: string; faturamento: number }[] }) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Faturamento por dia</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {dados.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="data" tick={{ fontSize: 12 }} tickFormatter={(v: string) => `${v.slice(8, 10)}/${v.slice(5, 7)}`} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip labelFormatter={(v: string) => dataCurta(v)} formatter={(value: number) => formatarMoeda(value)} />
              <Bar dataKey="faturamento" name="Faturamento" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem locações no período.</div>
        )}
      </CardContent>
    </Card>
  )
}

/** Detalhado e Simplificado: indicadores e gráfico calculados das mesmas linhas da tabela. */
function ResultadoLocacoes({
  linhas,
  gerado,
  tabela,
}: {
  linhas: (HistoricoLocacaoDetalhado | HistoricoLocacaoSimplificado)[]
  gerado: Gerado
  tabela: ReactNode
}) {
  const devolvidas = linhas.filter((l) => l.valorTotal !== null)
  const faturamento = devolvidas.reduce((soma, l) => soma + (l.valorTotal ?? 0), 0)
  const comTempo = linhas.filter((l) => l.tempoMinutos !== null)
  const tempoMedio = comTempo.length > 0 ? comTempo.reduce((soma, l) => soma + (l.tempoMinutos ?? 0), 0) / comTempo.length : null

  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard titulo="Locações no período" valor={String(linhas.length)} icon={ListChecks} />
        <KpiCard titulo="Faturamento" valor={formatarMoeda(faturamento)} icon={DollarSign} />
        <KpiCard
          titulo="Ticket médio"
          valor={devolvidas.length > 0 ? formatarMoeda(faturamento / devolvidas.length) : '—'}
          icon={TicketPercent}
        />
        <KpiCard titulo="Tempo médio de uso" valor={tempoMedio !== null ? formatarMinutos(Math.round(tempoMedio)) : '—'} icon={Clock} />
      </div>
      <GraficoFaturamento dados={faturamentoPorDia(linhas.map((l) => ({ data: l.dataEntrega, valor: l.valorTotal })))} />
      <p className="mb-2 text-xs text-muted-foreground">{gerado.filtros}</p>
      {tabela}
    </>
  )
}

/** Ocupação por dia: indicadores e gráfico calculados das mesmas linhas da tabela. */
function ResultadoOcupacao({ linhas, gerado }: { linhas: HistoricoOcupacao[]; gerado: Gerado }) {
  const locacoes = linhas.reduce((soma, o) => soma + o.quantidadeLocacoes, 0)
  const faturamento = linhas.reduce((soma, o) => soma + o.valorFaturado, 0)
  const disponiveis = linhas.reduce((soma, o) => soma + o.minutosDisponiveisValor, 0)
  const utilizados = linhas.reduce((soma, o) => soma + o.minutosUtilizadosValor, 0)
  const ocupacao = disponiveis > 0 ? (utilizados / disponiveis) * 100 : null

  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard titulo="Dias (caixas)" valor={String(linhas.length)} icon={CalendarDays} />
        <KpiCard titulo="Locações" valor={String(locacoes)} icon={ListChecks} />
        <KpiCard titulo="Faturamento" valor={formatarMoeda(faturamento)} icon={DollarSign} />
        <KpiCard
          titulo="Tempo utilizado (período)"
          valor={ocupacao !== null ? `${ocupacao.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} %` : '—'}
          icon={Gauge}
        />
      </div>
      <GraficoFaturamento dados={faturamentoPorDia(linhas.map((o) => ({ data: o.dataAbertura, valor: o.valorFaturado })))} />
      <p className="mb-2 text-xs text-muted-foreground">
        {gerado.filtros} · O tempo utilizado soma as locações simultâneas, como no legado, e pode passar de 100%.
      </p>
      <RelatorioTabela
        key={gerado.pedido.geracao}
        colunas={colunasOcupacao}
        grupos={gruposOcupacao}
        linhas={linhas}
        titulo={MODELOS.ocupacao.titulo}
        nomeArquivo={MODELOS.ocupacao.arquivo}
        subtitulo={gerado.filtros}
        colunaFixaPdf={5}
      />
    </>
  )
}
