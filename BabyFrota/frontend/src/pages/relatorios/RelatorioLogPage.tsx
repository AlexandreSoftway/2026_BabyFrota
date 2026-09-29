import { useEffect, useState, type FormEvent } from 'react'
import { FilePen, FilePlus2, FileX2, Loader2, LogIn, Play, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { RelatorioTabela } from '@/components/relatorios/RelatorioTabela'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  useLogDetalhe,
  useRelatorioLog,
  useTabelasLog,
  useUsuariosRelatorio,
  type PedidoRelatorio,
} from '@/features/relatorios/api'
import { colunasLog, dataCurta } from '@/features/relatorios/colunas'
import { ACOES_LOG, type LogCampo, type RelatorioLogFiltro } from '@/features/relatorios/types'
import { cn, extrairMensagemErro } from '@/lib/utils'
import { toast } from '@/stores/toast-store'

/** Como a lista do legado mostrava a ação (ela dizia "Alteração"; o log grava "Atualização"). */
const ROTULO_ACAO: Record<string, string> = { Atualização: 'Alteração' }

function hojeIso() {
  const agora = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}`
}

function KpiCard({ titulo, valor, icon: Icon }: { titulo: string; valor: number; icon: typeof LogIn }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{valor.toLocaleString('pt-BR')}</div>
      </CardContent>
    </Card>
  )
}

function Valor({ valor, imagem }: { valor: string | null; imagem?: boolean }) {
  if (imagem) return <span className="text-muted-foreground italic">imagem (não guardada no log)</span>
  if (valor === null) return <span className="text-muted-foreground italic">nulo</span>
  if (valor.trim() === '') return <span className="text-muted-foreground italic">vazio</span>
  return <span className="break-all">{valor}</span>
}

/** O antes e depois de uma linha do log, coluna a coluna. Na alteração, mostra de início só o que mudou. */
function LogDetalhePainel({ id }: { id: number }) {
  const { data, isLoading, isError, error } = useLogDetalhe(id)
  const [todas, setTodas] = useState(false)

  if (isLoading)
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Carregando o registro...
      </p>
    )
  if (isError)
    return <p className="text-xs text-destructive">Não foi possível carregar o registro: {extrairMensagemErro(error)}</p>
  if (!data) return null

  if (data.textoAntigo !== null || data.textoNovo !== null)
    return (
      <div className="grid gap-3 text-xs md:grid-cols-2">
        {[
          ['Antes', data.textoAntigo],
          ['Depois', data.textoNovo],
        ].map(([rotulo, texto]) => (
          <div key={rotulo} className="space-y-1">
            <p className="font-medium">{rotulo}</p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-background p-2">{texto || '—'}</pre>
          </div>
        ))}
      </div>
    )

  if (data.campos.length === 0)
    return (
      <p className="text-xs text-muted-foreground">
        {data.acao === 'Login' ? 'Acesso ao sistema: o login não guarda valores.' : 'Este registro não guardou valores.'}
      </p>
    )

  const ehAlteracao = data.acao === 'Atualização'
  const alterados = data.campos.filter((c) => c.alterado)
  const campos: LogCampo[] = ehAlteracao && !todas && alterados.length > 0 ? alterados : data.campos
  const mostraAntes = data.acao !== 'Inserção'
  const mostraDepois = data.acao !== 'Exclusão'

  return (
    <div className="max-w-4xl space-y-2">
      {ehAlteracao && alterados.length > 0 && alterados.length < data.campos.length && (
        <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setTodas((v) => !v)}>
          {todas ? `Mostrar só o que mudou (${alterados.length})` : `Mostrar todas as colunas (${data.campos.length})`}
        </Button>
      )}
      <div className="overflow-x-auto rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-8 px-2 text-xs">Coluna</TableHead>
              {mostraAntes && <TableHead className="h-8 px-2 text-xs">{mostraDepois ? 'Antes' : 'Valor excluído'}</TableHead>}
              {mostraDepois && <TableHead className="h-8 px-2 text-xs">{mostraAntes ? 'Depois' : 'Valor incluído'}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {campos.map((c) => {
              const imagem = c.alterado && c.antes === null && c.depois === null
              return (
                <TableRow key={c.coluna} className={cn(ehAlteracao && c.alterado && 'bg-amber-50 hover:bg-amber-50')}>
                  <TableCell className="px-2 py-1 text-xs font-medium">{c.coluna}</TableCell>
                  {mostraAntes && (
                    <TableCell className="px-2 py-1 text-xs">
                      <Valor valor={c.antes} imagem={imagem} />
                    </TableCell>
                  )}
                  {mostraDepois && (
                    <TableCell className="px-2 py-1 text-xs">
                      <Valor valor={c.depois} imagem={imagem} />
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

/**
 * Relatório de Log do legado (RelatorioLog.aspx): quem incluiu, alterou ou excluiu o quê, e os logins, com as colunas do
 * RelatorioLog.rdlc. O log é gravado pelos dois sistemas na mesma tabela (TBLog). A mais: abrir uma linha mostra o
 * registro antes e depois, que o legado guardava mas não mostrava.
 */
export function RelatorioLogPage() {
  const { data: usuarios } = useUsuariosRelatorio()
  const { data: tabelas } = useTabelasLog()

  const [usuarioId, setUsuarioId] = useState('')
  const [tabela, setTabela] = useState('')
  const [acao, setAcao] = useState('')
  const [dataInicio, setDataInicio] = useState(hojeIso)
  const [dataFinal, setDataFinal] = useState(hojeIso)
  const [erroPeriodo, setErroPeriodo] = useState<string | null>(null)

  const [pedido, setPedido] = useState<PedidoRelatorio<RelatorioLogFiltro> | null>(null)
  const [filtrosAplicados, setFiltrosAplicados] = useState('')

  const { data, isFetching, isError, error } = useRelatorioLog(pedido)

  useEffect(() => {
    if (isError) toast.error('Não foi possível gerar o relatório de log.', extrairMensagemErro(error))
  }, [isError, error])

  function gerar(e: FormEvent) {
    e.preventDefault()
    if (!dataInicio || !dataFinal) {
      setErroPeriodo('Informe a data inicial e a data final.')
      return
    }
    if (dataInicio > dataFinal) {
      setErroPeriodo('A data inicial não pode ser depois da data final.')
      return
    }
    setErroPeriodo(null)

    const filtro: RelatorioLogFiltro = {
      dataInicio,
      dataFinal,
      usuarioId: usuarioId ? Number(usuarioId) : undefined,
      tabela: tabela || undefined,
      acao: acao || undefined,
    }
    const nomeUsuario = usuarios?.find((u) => String(u.id) === usuarioId)?.nome
    setFiltrosAplicados(
      [
        dataInicio === dataFinal ? `Dia ${dataCurta(dataInicio)}` : `De ${dataCurta(dataInicio)} até ${dataCurta(dataFinal)}`,
        nomeUsuario ? `Usuário: ${nomeUsuario}` : null,
        tabela ? `Tabela: ${tabela}` : null,
        acao ? `Ação: ${ROTULO_ACAO[acao] ?? acao}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    )
    setPedido((anterior) => ({ filtro, geracao: (anterior?.geracao ?? 0) + 1 }))
  }

  function limpar() {
    setUsuarioId('')
    setTabela('')
    setAcao('')
    setDataInicio(hojeIso())
    setDataFinal(hojeIso())
    setErroPeriodo(null)
  }

  const linhas = data?.itens ?? []
  const contar = (a: string) => linhas.reduce((soma, l) => soma + (l.acao === a ? 1 : 0), 0)

  return (
    <>
      <PageHeader
        title="Relatório de Log"
        description="Quem incluiu, alterou ou excluiu o quê, e os acessos. Abra uma linha para ver o registro antes e depois."
      />

      <Card className="mb-4">
        <CardContent className="pt-6">
          <form onSubmit={gerar} className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <div className="col-span-2 space-y-1.5 md:col-span-1">
              <Label htmlFor="log-usuario">Usuário</Label>
              <Select id="log-usuario" value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
                <option value="">Todos</option>
                {usuarios?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-tabela">Tabela</Label>
              <Select id="log-tabela" value={tabela} onChange={(e) => setTabela(e.target.value)}>
                <option value="">Todas</option>
                {tabelas?.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-acao">Ação</Label>
              <Select id="log-acao" value={acao} onChange={(e) => setAcao(e.target.value)}>
                <option value="">Todas</option>
                {ACOES_LOG.map((a) => (
                  <option key={a} value={a}>
                    {ROTULO_ACAO[a] ?? a}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-inicio">De</Label>
              <Input id="log-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-fim">Até</Label>
              <Input id="log-fim" type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} />
            </div>
            {erroPeriodo && <p className="col-span-full text-xs text-destructive">{erroPeriodo}</p>}
            <p className="col-span-full text-xs text-muted-foreground">
              O período é obrigatório: o log guarda todas as gravações desde 2014 (mais de um milhão de registros).
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

      {pedido && !isFetching && data && (
        <>
          {data.truncado && (
            <p role="status" className="mb-4 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                O período tem mais de {data.limite.toLocaleString('pt-BR')} registros e vieram só os primeiros. Reduza o
                período ou use os filtros para ver o resto.
              </span>
            </p>
          )}
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard titulo="Inclusões" valor={contar('Inserção')} icon={FilePlus2} />
            <KpiCard titulo="Alterações" valor={contar('Atualização')} icon={FilePen} />
            <KpiCard titulo="Exclusões" valor={contar('Exclusão')} icon={FileX2} />
            <KpiCard titulo="Logins" valor={contar('Login')} icon={LogIn} />
          </div>
          <p className="mb-2 text-xs text-muted-foreground">{filtrosAplicados}</p>
          <RelatorioTabela
            key={pedido.geracao}
            colunas={colunasLog}
            linhas={linhas}
            titulo="Relatório de Log"
            nomeArquivo="relatorio-log"
            subtitulo={filtrosAplicados}
            compacta={false}
            renderDetail={(linha) => <LogDetalhePainel id={linha.id} />}
          />
        </>
      )}
    </>
  )
}
