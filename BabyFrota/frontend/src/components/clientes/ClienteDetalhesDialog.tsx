import { Baby, IdCard, Loader2, MapPin, Pencil, Phone } from 'lucide-react'
import { ItemDetalhe, SecaoDetalhe } from '@/components/detalhes/Detalhes'
import { CampoImagem } from '@/components/midia/CampoImagem'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useClienteDetalhe } from '@/features/clientes/api'
import { descreverSexo, formatarCep, formatarCpf, formatarDataCurta, formatarTelefone } from '@/lib/formatos'
import { extrairMensagemErro } from '@/lib/utils'

/** Tudo o que o cadastro do cliente guarda, só para ver: dados, contato, endereço, filhos, foto e documento. */
export function ClienteDetalhesDialog({
  clienteId,
  onClose,
  onEditar,
}: {
  clienteId: number | null
  onClose: () => void
  onEditar?: (id: number) => void
}) {
  const { data: c, isLoading, isError, error } = useClienteDetalhe(clienteId)

  const endereco = c ? [c.logradouro, c.numero && `nº ${c.numero}`].filter(Boolean).join(', ') : ''
  const cidade = c ? [c.cidade, c.uf].filter(Boolean).join('/') : ''

  return (
    <Dialog open={clienteId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
            {c?.nome ?? 'Cliente'}
            {c && <Badge variant="secondary">{c.quantidadeLocacoes} locações</Badge>}
          </DialogTitle>
          <DialogDescription>
            {c
              ? `Cliente nº ${c.id}${c.dataCadastro ? ` · cadastrado em ${formatarDataCurta(c.dataCadastro)}` : ''}`
              : 'Carregando os dados do cliente...'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Carregando...
          </p>
        )}
        {isError && (
          <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
            Não foi possível carregar o cliente: {extrairMensagemErro(error, 'erro ao consultar.')}
          </p>
        )}

        {c && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-6">
              <CampoImagem titulo="Foto" genero="a" url={`/cliente/${c.id}/foto`} ladoMaximo={400} somenteLeitura />
              <CampoImagem
                titulo="Documento"
                genero="o"
                url={`/cliente/${c.id}/documento`}
                ladoMaximo={1600}
                formato="documento"
                somenteLeitura
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SecaoDetalhe titulo="Dados pessoais" icone={IdCard}>
                <ItemDetalhe rotulo="CPF" valor={formatarCpf(c.cpf)} />
                <ItemDetalhe rotulo="RG" valor={c.rg} />
                <ItemDetalhe rotulo="Nascimento" valor={formatarDataCurta(c.dataNascimento)} />
                <ItemDetalhe rotulo="Sexo" valor={descreverSexo(c.sexo)} />
                <ItemDetalhe rotulo="Profissão" valor={c.profissao} />
                <ItemDetalhe rotulo="Classe social" valor={c.classeSocial} />
              </SecaoDetalhe>

              <SecaoDetalhe titulo="Contato" icone={Phone}>
                <ItemDetalhe rotulo="Celular" valor={formatarTelefone(c.dddCelular, c.celular)} />
                <ItemDetalhe rotulo="Telefone" valor={formatarTelefone(c.ddd, c.telefone)} />
                <ItemDetalhe rotulo="E-mail" valor={c.email} />
              </SecaoDetalhe>

              <SecaoDetalhe titulo="Endereço" icone={MapPin} className="sm:col-span-2">
                <ItemDetalhe rotulo="CEP" valor={formatarCep(c.cep)} />
                <ItemDetalhe rotulo="Logradouro" valor={endereco} />
                <ItemDetalhe rotulo="Complemento" valor={c.complemento} />
                <ItemDetalhe rotulo="Cidade/UF" valor={cidade} />
              </SecaoDetalhe>

              <SecaoDetalhe titulo={`Filhos (${c.filhos.length})`} icone={Baby} className="sm:col-span-2">
                {c.filhos.length === 0 ? (
                  <ItemDetalhe rotulo="Nenhum" valor={null} />
                ) : (
                  c.filhos.map((f) => (
                    <ItemDetalhe
                      key={f.id}
                      rotulo={f.nome}
                      valor={[formatarDataCurta(f.dataNascimento), descreverSexo(f.sexo)].filter(Boolean).join(' · ') || null}
                    />
                  ))
                )}
              </SecaoDetalhe>
            </div>

            {c.observacao?.trim() && (
              <div className="rounded-lg border p-3 text-sm">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Observação</p>
                <p className="whitespace-pre-line break-words">{c.observacao}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {c && onEditar && (
            <Button type="button" onClick={() => onEditar(c.id)}>
              <Pencil /> Editar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
