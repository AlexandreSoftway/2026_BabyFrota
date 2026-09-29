import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AxiosError } from 'axios'
import { Baby, Camera, Eye, Loader2, MapPinCheck, Pencil, Plus, Trash2, X } from 'lucide-react'
import { ClienteDetalhesDialog } from '@/components/clientes/ClienteDetalhesDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { CampoImagem } from '@/components/midia/CampoImagem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import {
  obterClientePorId,
  useAtualizarCliente,
  useCriarCliente,
  useExcluirCliente,
  useClientes,
} from '@/features/clientes/api'
import { buscarCep } from '@/features/cep/api'
import type { Cliente } from '@/features/clientes/types'
import { toast } from '@/stores/toast-store'
import { extrairMensagemErro } from '@/lib/utils'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

const filhoSchema = z.object({
  id: z.number().optional(),
  nome: z.string().min(1, 'Informe o nome'),
  dataNascimento: z.string().optional(),
  sexo: z.string().optional(),
})

const schema = z.object({
  nome: z.string().min(2, 'Informe o nome completo'),
  cpf: z.string().min(11, 'CPF inválido'),
  rg: z.string().optional(),
  ddd: z.string().min(2, 'Informe o DDD'),
  telefone: z.string().min(8, 'Telefone inválido'),
  dddCelular: z.string().optional(),
  celular: z.string().optional(),
  email: z.union([z.string().email('Email inválido'), z.literal('')]).optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  dataNascimento: z.string().optional(),
  profissao: z.string().optional(),
  observacao: z.string().optional(),
  filhos: z.array(filhoSchema),
})
type FormValues = z.infer<typeof schema>

const TAMANHO_PAGINA_PADRAO = 10

export function ClientesPage() {
  const [busca, setBusca] = useState('')
  const buscaAtrasada = useDebouncedValue(busca, 400)
  const [pagina, setPagina] = useState(1)
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)
  const { data, isLoading } = useClientes({ nome: buscaAtrasada || undefined, pagina, tamanhoPagina })

  const criar = useCriarCliente()
  const atualizar = useAtualizarCliente()
  const excluir = useExcluirCliente()

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [erroCep, setErroCep] = useState<string | null>(null)
  const [bairroEncontrado, setBairroEncontrado] = useState<string | null>(null)
  const [carregandoEdicaoId, setCarregandoEdicaoId] = useState<number | null>(null)
  const [detalheId, setDetalheId] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const { fields: filhos, append: adicionarFilho, remove: removerFilho } = useFieldArray({
    control,
    name: 'filhos',
  })

  function onChangeBusca(valor: string) {
    setBusca(valor)
    setPagina(1)
  }

  function onChangeTamanhoPagina(valor: number) {
    setTamanhoPagina(valor)
    setPagina(1)
  }

  function abrirNovo() {
    setEditando(null)
    setErroCep(null)
    setBairroEncontrado(null)
    reset({
      nome: '',
      cpf: '',
      rg: '',
      ddd: '',
      telefone: '',
      dddCelular: '',
      celular: '',
      email: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      cidade: '',
      uf: '',
      dataNascimento: '',
      profissao: '',
      observacao: '',
      filhos: [],
    })
    setModalAberto(true)
  }

  async function abrirEdicao(clienteResumo: Cliente) {
    // A listagem não traz os Filhos (só a contagem, pra não pesar a paginação) — busca o
    // detalhe completo agora, só quando o usuário realmente vai editar.
    setCarregandoEdicaoId(clienteResumo.id)
    try {
      const cliente = await obterClientePorId(clienteResumo.id)
      setEditando(cliente)
      setErroCep(null)
      setBairroEncontrado(null)
      reset({
        nome: cliente.nome,
        cpf: cliente.cpf,
        rg: cliente.rg ?? '',
        ddd: cliente.ddd,
        telefone: cliente.telefone,
        dddCelular: cliente.dddCelular ?? '',
        celular: cliente.celular ?? '',
        email: cliente.email ?? '',
        cep: cliente.cep ?? '',
        logradouro: cliente.logradouro ?? '',
        numero: cliente.numero ?? '',
        complemento: cliente.complemento ?? '',
        cidade: cliente.cidade ?? '',
        uf: cliente.uf ?? '',
        dataNascimento: cliente.dataNascimento?.slice(0, 10) ?? '',
        profissao: cliente.profissao ?? '',
        observacao: cliente.observacao ?? '',
        filhos: cliente.filhos.map((f) => ({
          id: f.id,
          nome: f.nome,
          dataNascimento: f.dataNascimento?.slice(0, 10) ?? '',
          sexo: f.sexo ?? '',
        })),
      })
      setModalAberto(true)
    } finally {
      setCarregandoEdicaoId(null)
    }
  }

  async function onBuscarCep() {
    const cep = getValues('cep')?.replace(/\D/g, '')
    if (!cep || cep.length !== 8) {
      setErroCep('Informe um CEP com 8 dígitos.')
      return
    }
    setErroCep(null)
    setBairroEncontrado(null)
    setBuscandoCep(true)
    try {
      const endereco = await buscarCep(cep)
      setValue('logradouro', endereco.logradouro, { shouldValidate: true })
      setValue('cidade', endereco.cidade, { shouldValidate: true })
      setValue('uf', endereco.uf, { shouldValidate: true })
      setBairroEncontrado(endereco.bairro || null)
    } catch (err) {
      const status = err instanceof AxiosError ? err.response?.status : undefined
      setErroCep(status === 404 ? 'CEP não encontrado.' : 'Não foi possível consultar o CEP agora.')
    } finally {
      setBuscandoCep(false)
    }
  }

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      email: values.email || undefined,
      filhos: values.filhos.map((f) => ({
        id: f.id,
        nome: f.nome,
        dataNascimento: f.dataNascimento || undefined,
        sexo: f.sexo || undefined,
      })),
    }
    try {
      if (editando) {
        await atualizar.mutateAsync({ id: editando.id, payload })
        toast.success('Cliente atualizado com sucesso.')
      } else {
        await criar.mutateAsync(payload)
        toast.success('Cliente cadastrado com sucesso.')
      }
      setModalAberto(false)
    } catch (err) {
      toast.error('Não foi possível salvar o cliente.', extrairMensagemErro(err))
    }
  }

  async function onExcluir(cliente: Cliente) {
    if (!confirm(`Excluir o cliente "${cliente.nome}"?`)) return
    try {
      await excluir.mutateAsync(cliente.id)
      toast.success('Cliente excluído com sucesso.')
    } catch (err) {
      toast.error('Não foi possível excluir o cliente.', extrairMensagemErro(err))
    }
  }

  const columns: DataTableColumn<Cliente>[] = [
    { header: 'Nome', cell: (c) => <span className="font-medium">{c.nome}</span>, exportValue: (c) => c.nome },
    { header: 'CPF', cell: (c) => c.cpf, exportValue: (c) => c.cpf },
    {
      header: 'Contato',
      cell: (c) => (c.celular ? `(${c.dddCelular}) ${c.celular}` : `(${c.ddd}) ${c.telefone}`),
      exportValue: (c) => (c.celular ? `(${c.dddCelular}) ${c.celular}` : `(${c.ddd}) ${c.telefone}`),
    },
    {
      header: 'Cidade/UF',
      cell: (c) => (c.cidade ? `${c.cidade}/${c.uf ?? ''}` : '—'),
      exportValue: (c) => (c.cidade ? `${c.cidade}/${c.uf ?? ''}` : ''),
    },
    {
      header: 'Filhos',
      cell: (c) => <Badge variant="secondary">{c.quantidadeFilhos}</Badge>,
      exportValue: (c) => c.quantidadeFilhos,
    },
    {
      header: 'Locações',
      cell: (c) => <Badge variant="secondary">{c.quantidadeLocacoes}</Badge>,
      exportValue: (c) => c.quantidadeLocacoes,
    },
    {
      header: 'Ações',
      className: 'w-40 text-right',
      cell: (c) => (
        <div className="flex justify-end whitespace-nowrap">
          <Button variant="ghost" size="icon" onClick={() => setDetalheId(c.id)} title="Ver detalhes">
            <Eye className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => abrirEdicao(c)}
            disabled={carregandoEdicaoId === c.id}
            title="Editar"
          >
            {carregandoEdicaoId === c.id ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Pencil className="size-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onExcluir(c)} title="Excluir">
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Cadastro de clientes para locação de carrinhos."
        actions={
          <Button onClick={abrirNovo}>
            <Plus /> Novo cliente
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data?.itens ?? []}
        rowKey={(c) => c.id}
        isLoading={isLoading}
        searchValue={busca}
        onSearchChange={onChangeBusca}
        searchPlaceholder="Buscar por nome..."
        emptyMessage="Nenhum cliente encontrado."
        pagina={data?.pagina ?? pagina}
        totalPaginas={data?.totalPaginas ?? 0}
        totalRegistros={data?.totalRegistros ?? 0}
        tamanhoPagina={data?.tamanhoPagina ?? tamanhoPagina}
        onPageChange={setPagina}
        onTamanhoPaginaChange={onChangeTamanhoPagina}
        exportFileName="clientes"
      />

      <ClienteDetalhesDialog
        clienteId={detalheId}
        onClose={() => setDetalheId(null)}
        onEditar={(id) => {
          const cliente = data?.itens.find((c) => c.id === id)
          setDetalheId(null)
          if (cliente) void abrirEdicao(cliente)
        }}
      />

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" {...register('nome')} />
                {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" {...register('cpf')} />
                {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rg">RG</Label>
                <Input id="rg" {...register('rg')} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ddd">DDD</Label>
                <Input id="ddd" {...register('ddd')} />
                {errors.ddd && <p className="text-xs text-destructive">{errors.ddd.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" {...register('telefone')} />
                {errors.telefone && <p className="text-xs text-destructive">{errors.telefone.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dddCelular">DDD Celular</Label>
                <Input id="dddCelular" {...register('dddCelular')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="celular">Celular</Label>
                <Input id="celular" {...register('celular')} />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
            </div>

            {/* Como no legado, foto e documento entram depois que o cliente existe, e cada um salva na hora. */}
            {editando ? (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Camera className="size-4" /> Foto e documento
                </p>
                <div className="flex flex-wrap gap-6">
                  <CampoImagem titulo="Foto" genero="a" url={`/cliente/${editando.id}/foto`} ladoMaximo={400} />
                  <CampoImagem
                    titulo="Documento"
                    genero="o"
                    url={`/cliente/${editando.id}/documento`}
                    ladoMaximo={1600}
                    formato="documento"
                  />
                </div>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Camera className="size-4" /> Foto e documento podem ser incluídos depois de salvar, ao abrir o cliente.
              </p>
            )}

            <div className="space-y-3 rounded-lg border p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <MapPinCheck className="size-4" /> Endereço
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="flex gap-2">
                    <Input id="cep" placeholder="00000-000" maxLength={9} {...register('cep')} />
                    <Button type="button" variant="outline" onClick={onBuscarCep} disabled={buscandoCep}>
                      {buscandoCep ? <Loader2 className="size-4 animate-spin" /> : 'Buscar'}
                    </Button>
                  </div>
                  {erroCep && <p className="text-xs text-destructive">{erroCep}</p>}
                  {bairroEncontrado && !erroCep && (
                    <p className="text-xs text-muted-foreground">Bairro: {bairroEncontrado}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dataNascimento">Data de nascimento</Label>
                  <Input id="dataNascimento" type="date" {...register('dataNascimento')} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="logradouro">Logradouro</Label>
                  <Input id="logradouro" {...register('logradouro')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="numero">Número</Label>
                  <Input id="numero" {...register('numero')} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input id="complemento" {...register('complemento')} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input id="cidade" {...register('cidade')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="uf">UF</Label>
                    <Input id="uf" maxLength={2} {...register('uf')} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profissao">Profissão</Label>
              <Input id="profissao" {...register('profissao')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observacao">Observação</Label>
              <Input id="observacao" {...register('observacao')} />
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Baby className="size-4" /> Filhos
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adicionarFilho({ nome: '', dataNascimento: '', sexo: '' })}
                >
                  <Plus className="size-4" /> Adicionar filho
                </Button>
              </div>

              {filhos.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum filho cadastrado.</p>
              )}

              {filhos.map((filho, index) => (
                <div key={filho.id} className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`filhos.${index}.nome`}>Nome</Label>
                    <Input id={`filhos.${index}.nome`} {...register(`filhos.${index}.nome` as const)} />
                    {errors.filhos?.[index]?.nome && (
                      <p className="text-xs text-destructive">{errors.filhos[index]?.nome?.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`filhos.${index}.dataNascimento`}>Nascimento</Label>
                    <Input
                      id={`filhos.${index}.dataNascimento`}
                      type="date"
                      className="w-40"
                      {...register(`filhos.${index}.dataNascimento` as const)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`filhos.${index}.sexo`}>Sexo</Label>
                    <Select id={`filhos.${index}.sexo`} className="w-28" {...register(`filhos.${index}.sexo` as const)}>
                      <option value="">—</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removerFilho(index)}
                    title="Remover filho"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <DialogFooter>
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
    </>
  )
}
