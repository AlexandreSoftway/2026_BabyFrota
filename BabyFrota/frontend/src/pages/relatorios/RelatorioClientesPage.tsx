import { useEffect, useState, type FormEvent } from 'react'
import { DollarSign, ListChecks, Loader2, Play, TicketPercent, Users } from 'lucide-react'
import { ClienteAutocomplete } from '@/components/clientes/ClienteAutocomplete'
import { PageHeader } from '@/components/layout/PageHeader'
import { RelatorioTabela } from '@/components/relatorios/RelatorioTabela'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Cliente } from '@/features/clientes/types'
import { useRelatorioClientes, type PedidoRelatorio } from '@/features/relatorios/api'
import { colunasClientes, dataCurta } from '@/features/relatorios/colunas'
import type { RelatorioClientesFiltro } from '@/features/relatorios/types'
import { extrairMensagemErro, formatarMoeda } from '@/lib/utils'
import { toast } from '@/stores/toast-store'

function KpiCard({ titulo, valor, icon: Icon }: { titulo: string; valor: string; icon: typeof Users }) {
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

/** Os filtros aplicados, em texto, para o cabeçalho do Excel e do PDF. */
function descreverFiltros(filtro: RelatorioClientesFiltro, cliente: Cliente | null) {
  const periodo = (rotulo: string, de?: string, ate?: string) =>
    de || ate ? `${rotulo} ${de ? `de ${dataCurta(de)} ` : ''}${ate ? `até ${dataCurta(ate)}` : ''}`.trim() : null
  return (
    [
      cliente ? `Cliente: ${cliente.nome}` : null,
      filtro.cidade ? `Cidade: ${filtro.cidade}` : null,
      filtro.complemento ? `Complemento: ${filtro.complemento}` : null,
      filtro.uf ? `UF: ${filtro.uf}` : null,
      periodo('Cadastro', filtro.dataCadastroInicio, filtro.dataCadastroFinal),
      periodo('Locação', filtro.dataLocacaoInicio, filtro.dataLocacaoFinal),
    ]
      .filter(Boolean)
      .join(' · ') || 'Sem filtros'
  )
}

export function RelatorioClientesPage() {
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [cidade, setCidade] = useState('')
  const [complemento, setComplemento] = useState('')
  const [uf, setUf] = useState('')
  const [dataCadastroInicio, setDataCadastroInicio] = useState('')
  const [dataCadastroFinal, setDataCadastroFinal] = useState('')
  const [dataLocacaoInicio, setDataLocacaoInicio] = useState('')
  const [dataLocacaoFinal, setDataLocacaoFinal] = useState('')

  const [pedido, setPedido] = useState<PedidoRelatorio<RelatorioClientesFiltro> | null>(null)
  const [filtrosAplicados, setFiltrosAplicados] = useState('')

  const { data, isFetching, isError, error } = useRelatorioClientes(pedido)

  useEffect(() => {
    if (isError) toast.error('Não foi possível gerar o relatório de clientes.', extrairMensagemErro(error))
  }, [isError, error])

  function gerar(e: FormEvent) {
    e.preventDefault()
    const filtro: RelatorioClientesFiltro = {
      clienteId: cliente?.id,
      cidade: cidade || undefined,
      complemento: complemento || undefined,
      uf: uf || undefined,
      dataCadastroInicio: dataCadastroInicio || undefined,
      dataCadastroFinal: dataCadastroFinal || undefined,
      dataLocacaoInicio: dataLocacaoInicio || undefined,
      dataLocacaoFinal: dataLocacaoFinal || undefined,
    }
    setFiltrosAplicados(descreverFiltros(filtro, cliente))
    setPedido((anterior) => ({ filtro, geracao: (anterior?.geracao ?? 0) + 1 }))
  }

  function limpar() {
    setCliente(null)
    setCidade('')
    setComplemento('')
    setUf('')
    setDataCadastroInicio('')
    setDataCadastroFinal('')
    setDataLocacaoInicio('')
    setDataLocacaoFinal('')
  }

  const linhas = data ?? []
  const totalLocacoes = linhas.reduce((soma, c) => soma + (c.qtdLocacoes ?? 0), 0)
  const totalGasto = linhas.reduce((soma, c) => soma + (c.totalGasto ?? 0), 0)

  return (
    <>
      <PageHeader
        title="Relatório de Clientes"
        description="Mesma saída do relatório do legado: mesma procedure, mesmas colunas e formatos."
      />

      <Card className="mb-4">
        <CardContent className="pt-6">
          <form onSubmit={gerar} className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Cliente</Label>
              <ClienteAutocomplete clienteSelecionado={cliente} onSelecionar={setCliente} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uf">UF</Label>
              <Input id="uf" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="complemento">Complemento</Label>
              <Input id="complemento" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dataCadastroInicio">Cadastro de</Label>
              <Input
                id="dataCadastroInicio"
                type="date"
                value={dataCadastroInicio}
                onChange={(e) => setDataCadastroInicio(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dataCadastroFinal">Cadastro até</Label>
              <Input
                id="dataCadastroFinal"
                type="date"
                value={dataCadastroFinal}
                onChange={(e) => setDataCadastroFinal(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dataLocacaoInicio">Locação de</Label>
              <Input
                id="dataLocacaoInicio"
                type="date"
                value={dataLocacaoInicio}
                onChange={(e) => setDataLocacaoInicio(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dataLocacaoFinal">Locação até</Label>
              <Input
                id="dataLocacaoFinal"
                type="date"
                value={dataLocacaoFinal}
                onChange={(e) => setDataLocacaoFinal(e.target.value)}
              />
            </div>
            <p className="col-span-full text-xs text-muted-foreground">
              Cidade, complemento e UF precisam ser iguais ao cadastro (sem diferenciar maiúsculas), como no legado. Sem
              nenhum filtro, o relatório traz todos os clientes e pode demorar.
            </p>
            <div className="col-span-full flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={limpar} disabled={isFetching}>
                Limpar filtros
              </Button>
              <Button type="submit" disabled={isFetching}>
                {isFetching ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                {isFetching ? 'Gerando...' : 'Gerar relatório'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isFetching && (
        <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Gerando o relatório. Em períodos longos pode levar alguns minutos.
        </p>
      )}

      {pedido && !isFetching && data && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard titulo="Clientes" valor={String(linhas.length)} icon={Users} />
            <KpiCard titulo="Locações" valor={String(totalLocacoes)} icon={ListChecks} />
            <KpiCard titulo="Total gasto" valor={formatarMoeda(totalGasto)} icon={DollarSign} />
            <KpiCard
              titulo="Ticket médio por cliente"
              valor={linhas.length > 0 ? formatarMoeda(totalGasto / linhas.length) : '—'}
              icon={TicketPercent}
            />
          </div>
          <p className="mb-2 text-xs text-muted-foreground">{filtrosAplicados}</p>
          <RelatorioTabela
            key={pedido.geracao}
            colunas={colunasClientes}
            linhas={linhas}
            titulo="Relatório de Clientes"
            nomeArquivo="relatorio-clientes"
            subtitulo={filtrosAplicados}
            colunaFixaPdf={1}
          />
        </>
      )}
    </>
  )
}
