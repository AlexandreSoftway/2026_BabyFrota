import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { CarrinhoDetalhesDialog } from '@/components/carrinhos/CarrinhoDetalhesDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { CampoImagem } from '@/components/midia/CampoImagem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'
import { PageSizeSelect } from '@/components/ui/page-size-select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useAtualizarCarrinho,
  useCarrinhos,
  useCriarCarrinho,
  useExcluirCarrinho,
  useStatusCarrinho,
} from '@/features/carrinhos/api'
import { useTiposCarrinho } from '@/features/tipos-carrinho/api'
import type { Carrinho } from '@/features/carrinhos/types'
import { toast } from '@/stores/toast-store'
import { extrairMensagemErro } from '@/lib/utils'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

/** Espelha o enum SituacaoCarrinho do backend: 1 Disponível, 2 Manutenção, 3 Reservado, 4 Alugado. */
const STATUS_VARIANTE: Record<number, 'success' | 'warning' | 'info' | 'default'> = {
  1: 'success',
  2: 'warning',
  3: 'info',
  4: 'default',
}

const schema = z.object({
  descricao: z.string().min(2, 'Informe a descrição'),
  tipoCarrinhoId: z.coerce.number().min(1, 'Selecione um tipo'),
  statusId: z.coerce.number().min(1, 'Selecione uma situação'),
  dataAquisicao: z.string().min(1, 'Informe a data de aquisição'),
  fornecedor: z.string().min(1, 'Informe o fornecedor'),
  valorAquisicao: z.coerce.number().min(0, 'Valor inválido'),
  observacao: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const TAMANHO_PAGINA_PADRAO = 10

export function CarrinhosPage() {
  const [busca, setBusca] = useState('')
  const buscaAtrasada = useDebouncedValue(busca, 400)
  const [statusFiltro, setStatusFiltro] = useState('')
  const [pagina, setPagina] = useState(1)
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)

  const { data, isLoading } = useCarrinhos({
    descricao: buscaAtrasada || undefined,
    statusId: statusFiltro ? Number(statusFiltro) : undefined,
    pagina,
    tamanhoPagina,
  })
  const carrinhos = data?.itens
  const { data: status } = useStatusCarrinho()
  const { data: tipos } = useTiposCarrinho()

  const criar = useCriarCarrinho()
  const atualizar = useAtualizarCarrinho()
  const excluir = useExcluirCarrinho()

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Carrinho | null>(null)
  const [detalhe, setDetalhe] = useState<Carrinho | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  function abrirNovo() {
    setEditando(null)
    reset({
      descricao: '',
      tipoCarrinhoId: tipos?.[0]?.id ?? 0,
      statusId: status?.[0]?.id ?? 0,
      dataAquisicao: '',
      fornecedor: '',
      valorAquisicao: 0,
      observacao: '',
    })
    setModalAberto(true)
  }

  function abrirEdicao(carrinho: Carrinho) {
    setEditando(carrinho)
    reset({
      descricao: carrinho.descricao,
      tipoCarrinhoId: carrinho.tipoCarrinhoId,
      statusId: carrinho.statusId,
      dataAquisicao: carrinho.dataAquisicao?.slice(0, 10) ?? '',
      fornecedor: carrinho.fornecedor,
      valorAquisicao: carrinho.valorAquisicao,
      observacao: carrinho.observacao ?? '',
    })
    setModalAberto(true)
  }

  async function onSubmit(values: FormValues) {
    try {
      if (editando) {
        await atualizar.mutateAsync({ id: editando.id, payload: values })
        toast.success('Carrinho atualizado com sucesso.')
      } else {
        await criar.mutateAsync(values)
        toast.success('Carrinho cadastrado com sucesso.')
      }
      setModalAberto(false)
    } catch (err) {
      toast.error('Não foi possível salvar o carrinho.', extrairMensagemErro(err))
    }
  }

  async function onExcluir(carrinho: Carrinho) {
    if (!confirm(`Excluir o carrinho "${carrinho.descricao}"?`)) return
    try {
      await excluir.mutateAsync(carrinho.id)
      toast.success('Carrinho excluído com sucesso.')
    } catch (err) {
      toast.error('Não foi possível excluir o carrinho.', extrairMensagemErro(err))
    }
  }

  return (
    <>
      <PageHeader
        title="Carrinhos"
        description="Frota de carrinhos cadastrados — situação, tipo e dados de aquisição."
        actions={
          <Button onClick={abrirNovo}>
            <Plus /> Novo carrinho
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição..."
            className="pl-8"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              setPagina(1)
            }}
          />
        </div>
        <Select
          className="w-48"
          value={statusFiltro}
          onChange={(e) => {
            setStatusFiltro(e.target.value)
            setPagina(1)
          }}
        >
          <option value="">Todas as situações</option>
          {status?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </Select>
        <PageSizeSelect
          tamanhoPagina={tamanhoPagina}
          onChange={(valor) => {
            setTamanhoPagina(valor)
            setPagina(1)
          }}
        />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {!isLoading && carrinhos?.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum carrinho encontrado.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {carrinhos?.map((carrinho) => (
          <Card key={carrinho.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-base">{carrinho.descricao}</CardTitle>
                <p className="text-xs text-muted-foreground">{carrinho.tipoCarrinhoDescricao}</p>
              </div>
              <Badge variant={STATUS_VARIANTE[carrinho.statusId] ?? 'default'}>{carrinho.statusNome}</Badge>
            </CardHeader>
            <CardContent className="space-y-1 pt-0 text-sm">
              <p className="text-muted-foreground">
                Fornecedor: <span className="text-foreground">{carrinho.fornecedor}</span>
              </p>
              <p className="text-muted-foreground">
                Valor: <span className="text-foreground">{formatarMoeda(carrinho.valorAquisicao)}</span>
              </p>
              <div className="flex justify-end gap-1 pt-2">
                <Button variant="ghost" size="icon" onClick={() => setDetalhe(carrinho)} title="Ver detalhes">
                  <Eye className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => abrirEdicao(carrinho)} title="Editar">
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onExcluir(carrinho)} title="Excluir">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data && data.totalRegistros > 0 && (
        <Card className="mt-4">
          <Pagination
            pagina={data.pagina}
            totalPaginas={data.totalPaginas}
            totalRegistros={data.totalRegistros}
            tamanhoPagina={data.tamanhoPagina ?? tamanhoPagina}
            onPageChange={setPagina}
          />
        </Card>
      )}

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar carrinho' : 'Novo carrinho'}</DialogTitle>
          </DialogHeader>
          <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="descricao">Descrição</Label>
              <Input id="descricao" placeholder="Ex.: 01 Ursinho Pooh" {...register('descricao')} />
              {errors.descricao && <p className="text-xs text-destructive">{errors.descricao.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tipoCarrinhoId">Tipo</Label>
              <Select id="tipoCarrinhoId" {...register('tipoCarrinhoId')}>
                {tipos?.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.descricao}
                  </option>
                ))}
              </Select>
              {errors.tipoCarrinhoId && <p className="text-xs text-destructive">{errors.tipoCarrinhoId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="statusId">Situação</Label>
              <Select id="statusId" {...register('statusId')}>
                {status?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </Select>
              {errors.statusId && <p className="text-xs text-destructive">{errors.statusId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dataAquisicao">Data de aquisição</Label>
              <Input id="dataAquisicao" type="date" {...register('dataAquisicao')} />
              {errors.dataAquisicao && <p className="text-xs text-destructive">{errors.dataAquisicao.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="valorAquisicao">Valor de aquisição</Label>
              <Input id="valorAquisicao" type="number" step="0.01" {...register('valorAquisicao')} />
              {errors.valorAquisicao && <p className="text-xs text-destructive">{errors.valorAquisicao.message}</p>}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <Input id="fornecedor" {...register('fornecedor')} />
              {errors.fornecedor && <p className="text-xs text-destructive">{errors.fornecedor.message}</p>}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="observacao">Observação</Label>
              <Input id="observacao" {...register('observacao')} />
            </div>

            {/* Como no legado, a foto entra depois que o carrinho existe, e salva na hora. */}
            <div className="col-span-2">
              {editando ? (
                <CampoImagem titulo="Foto" genero="a" url={`/carrinho/${editando.id}/foto`} ladoMaximo={400} />
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Camera className="size-4" /> A foto pode ser incluída depois de salvar, ao abrir o carrinho.
                </p>
              )}
            </div>

            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CarrinhoDetalhesDialog
        carrinho={detalhe}
        onClose={() => setDetalhe(null)}
        onEditar={(carrinho) => {
          setDetalhe(null)
          abrirEdicao(carrinho)
        }}
      />
    </>
  )
}
