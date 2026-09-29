import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, Pencil, Plus, UserX } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { UsuarioDetalhesDialog } from '@/components/usuarios/UsuarioDetalhesDialog'
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
  useAtualizarUsuario,
  useCriarUsuario,
  useInativarUsuario,
  usePerfis,
  useUsuarios,
} from '@/features/usuarios/api'
import type { Usuario } from '@/features/usuarios/types'
import { toast } from '@/stores/toast-store'
import { extrairMensagemErro } from '@/lib/utils'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

function buildSchema(exigirSenha: boolean) {
  return z.object({
    nome: z.string().min(2, 'Informe o nome completo'),
    email: z.string().email('Email inválido'),
    cpf: z.string().optional(),
    telefone: z.string().optional(),
    celular: z.string().optional(),
    perfilId: z.coerce.number().min(1, 'Selecione um perfil'),
    ativo: z.boolean(),
    senha: exigirSenha
      ? z.string().min(6, 'A senha deve ter ao menos 6 caracteres')
      : z.union([z.string().min(6, 'A senha deve ter ao menos 6 caracteres'), z.literal('')]).optional(),
  })
}
type FormValues = z.infer<ReturnType<typeof buildSchema>>

const TAMANHO_PAGINA_PADRAO = 10

export function UsuariosPage() {
  const [busca, setBusca] = useState('')
  const buscaAtrasada = useDebouncedValue(busca, 400)
  const [pagina, setPagina] = useState(1)
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO)
  const { data, isLoading } = useUsuarios({ nome: buscaAtrasada || undefined, pagina, tamanhoPagina })
  const { data: perfis } = usePerfis()

  const criar = useCriarUsuario()
  const atualizar = useAtualizarUsuario()
  const inativar = useInativarUsuario()

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [detalhe, setDetalhe] = useState<Usuario | null>(null)

  const schema = useMemo(() => buildSchema(editando === null), [editando])
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

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
    reset({ nome: '', email: '', cpf: '', telefone: '', celular: '', perfilId: perfis?.[0]?.id ?? 0, ativo: true, senha: '' })
    setModalAberto(true)
  }

  function abrirEdicao(usuario: Usuario) {
    setEditando(usuario)
    reset({
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf ?? '',
      telefone: usuario.telefone ?? '',
      celular: usuario.celular ?? '',
      perfilId: usuario.perfilId,
      ativo: usuario.ativo,
      senha: '',
    })
    setModalAberto(true)
  }

  async function onSubmit(values: FormValues) {
    const payload = { ...values, senha: values.senha || undefined }
    try {
      if (editando) {
        await atualizar.mutateAsync({ id: editando.id, payload })
        toast.success('Usuário atualizado com sucesso.')
      } else {
        await criar.mutateAsync(payload)
        toast.success('Usuário cadastrado com sucesso.')
      }
      setModalAberto(false)
    } catch (err) {
      toast.error('Não foi possível salvar o usuário.', extrairMensagemErro(err))
    }
  }

  async function onInativar(usuario: Usuario) {
    if (!confirm(`Inativar o usuário "${usuario.nome}"? Ele não conseguirá mais acessar o sistema.`)) return
    try {
      await inativar.mutateAsync(usuario.id)
      toast.success('Usuário inativado com sucesso.')
    } catch (err) {
      toast.error('Não foi possível inativar o usuário.', extrairMensagemErro(err))
    }
  }

  const columns: DataTableColumn<Usuario>[] = [
    { header: 'Nome', cell: (u) => <span className="font-medium">{u.nome}</span>, exportValue: (u) => u.nome },
    { header: 'Email', cell: (u) => <span className="text-muted-foreground">{u.email}</span>, exportValue: (u) => u.email },
    {
      header: 'Perfil',
      cell: (u) => <Badge variant="secondary">{u.perfilNome}</Badge>,
      exportValue: (u) => u.perfilNome,
    },
    {
      header: 'Status',
      cell: (u) => <Badge variant={u.ativo ? 'success' : 'outline'}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge>,
      exportValue: (u) => (u.ativo ? 'Ativo' : 'Inativo'),
    },
    {
      header: 'Ações',
      className: 'w-40 text-right',
      cell: (u) => (
        <div className="flex justify-end whitespace-nowrap">
          <Button variant="ghost" size="icon" onClick={() => setDetalhe(u)} title="Ver detalhes">
            <Eye className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => abrirEdicao(u)} title="Editar">
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onInativar(u)} title="Inativar" disabled={!u.ativo}>
            <UserX className="size-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Operadores do sistema — cada um com um perfil de acesso."
        actions={
          <Button onClick={abrirNovo}>
            <Plus /> Novo usuário
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data?.itens ?? []}
        rowKey={(u) => u.id}
        isLoading={isLoading}
        searchValue={busca}
        onSearchChange={onChangeBusca}
        searchPlaceholder="Buscar por nome..."
        emptyMessage="Nenhum usuário encontrado."
        pagina={data?.pagina ?? pagina}
        totalPaginas={data?.totalPaginas ?? 0}
        totalRegistros={data?.totalRegistros ?? 0}
        tamanhoPagina={data?.tamanhoPagina ?? tamanhoPagina}
        onPageChange={setPagina}
        onTamanhoPaginaChange={onChangeTamanhoPagina}
        exportFileName="usuarios"
      />

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar usuário' : 'Novo usuário'}</DialogTitle>
          </DialogHeader>
          <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" {...register('nome')} />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" {...register('cpf')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" {...register('telefone')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="celular">Celular</Label>
              <Input id="celular" {...register('celular')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="perfilId">Perfil</Label>
              <Select id="perfilId" {...register('perfilId')}>
                {perfis?.map((perfil) => (
                  <option key={perfil.id} value={perfil.id}>
                    {perfil.nome}
                  </option>
                ))}
              </Select>
              {errors.perfilId && <p className="text-xs text-destructive">{errors.perfilId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="senha">{editando ? 'Nova senha (opcional)' : 'Senha'}</Label>
              <Input id="senha" type="password" {...register('senha')} />
              {errors.senha && <p className="text-xs text-destructive">{errors.senha.message}</p>}
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input id="ativo" type="checkbox" className="size-4 rounded border-input" {...register('ativo')} />
              <Label htmlFor="ativo">Usuário ativo</Label>
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

      <UsuarioDetalhesDialog
        usuario={detalhe}
        onClose={() => setDetalhe(null)}
        onEditar={(usuario) => {
          setDetalhe(null)
          abrirEdicao(usuario)
        }}
      />
    </>
  )
}
