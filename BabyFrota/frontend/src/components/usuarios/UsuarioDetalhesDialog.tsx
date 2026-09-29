import { IdCard, Pencil, Phone } from 'lucide-react'
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
import type { Usuario } from '@/features/usuarios/types'
import { formatarCpf, formatarDataCurta, formatarTelefone } from '@/lib/formatos'

/**
 * O cadastro do usuário, só para ver. A foto é a que o legado gravou (o sistema novo não troca foto de usuário). Os dados
 * vêm da própria listagem.
 */
export function UsuarioDetalhesDialog({
  usuario,
  onClose,
  onEditar,
}: {
  usuario: Usuario | null
  onClose: () => void
  onEditar?: (usuario: Usuario) => void
}) {
  return (
    <Dialog open={usuario !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
        {usuario && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
                {usuario.nome}
                <Badge variant={usuario.ativo ? 'success' : 'secondary'}>{usuario.ativo ? 'Ativo' : 'Inativo'}</Badge>
              </DialogTitle>
              <DialogDescription>
                {usuario.perfilNome} · usuário nº {usuario.id}
                {usuario.dataCadastro ? ` · cadastrado em ${formatarDataCurta(usuario.dataCadastro)}` : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 sm:flex-row">
              <CampoImagem titulo="Foto" genero="a" url={`/usuario/${usuario.id}/foto`} ladoMaximo={400} somenteLeitura />
              <div className="flex flex-1 flex-col gap-3">
                <SecaoDetalhe titulo="Acesso" icone={IdCard}>
                  <ItemDetalhe rotulo="E-mail" valor={usuario.email} />
                  <ItemDetalhe rotulo="Perfil" valor={usuario.perfilNome} />
                  <ItemDetalhe rotulo="Situação" valor={usuario.ativo ? 'Ativo' : 'Inativo (não entra no sistema)'} />
                </SecaoDetalhe>
                <SecaoDetalhe titulo="Documentos e contato" icone={Phone}>
                  <ItemDetalhe rotulo="CPF" valor={formatarCpf(usuario.cpf)} />
                  <ItemDetalhe rotulo="RG" valor={usuario.rg} />
                  <ItemDetalhe rotulo="Celular" valor={formatarTelefone(usuario.dddCelular, usuario.celular)} />
                  <ItemDetalhe rotulo="Telefone" valor={formatarTelefone(usuario.ddd, usuario.telefone)} />
                </SecaoDetalhe>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Fechar
              </Button>
              {onEditar && (
                <Button type="button" onClick={() => onEditar(usuario)}>
                  <Pencil /> Editar
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
