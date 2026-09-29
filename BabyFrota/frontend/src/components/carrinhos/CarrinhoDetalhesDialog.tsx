import { Baby, Pencil } from 'lucide-react'
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
import type { Carrinho } from '@/features/carrinhos/types'
import { formatarDataCurta } from '@/lib/formatos'
import { formatarMoeda } from '@/lib/utils'

/** Espelha o enum SituacaoCarrinho do backend: 1 Disponível, 2 Manutenção, 3 Reservado, 4 Alugado. */
const STATUS_VARIANTE: Record<number, 'success' | 'warning' | 'info' | 'default'> = {
  1: 'success',
  2: 'warning',
  3: 'info',
  4: 'default',
}

/** O cadastro do carrinho, só para ver, com a foto. Os dados vêm da própria listagem (ela já traz tudo). */
export function CarrinhoDetalhesDialog({
  carrinho,
  onClose,
  onEditar,
}: {
  carrinho: Carrinho | null
  onClose: () => void
  onEditar?: (carrinho: Carrinho) => void
}) {
  return (
    <Dialog open={carrinho !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
        {carrinho && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
                {carrinho.descricao}
                <Badge variant={STATUS_VARIANTE[carrinho.statusId] ?? 'default'}>{carrinho.statusNome}</Badge>
              </DialogTitle>
              <DialogDescription>
                Carrinho nº {carrinho.id}
                {carrinho.dataCadastro ? ` · cadastrado em ${formatarDataCurta(carrinho.dataCadastro)}` : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 sm:flex-row">
              <CampoImagem titulo="Foto" genero="a" url={`/carrinho/${carrinho.id}/foto`} ladoMaximo={400} somenteLeitura />
              <SecaoDetalhe titulo="Dados do carrinho" icone={Baby} className="flex-1">
                <ItemDetalhe rotulo="Tipo" valor={carrinho.tipoCarrinhoDescricao} />
                <ItemDetalhe rotulo="Situação" valor={carrinho.statusNome} />
                <ItemDetalhe rotulo="Aquisição" valor={formatarDataCurta(carrinho.dataAquisicao)} />
                <ItemDetalhe rotulo="Valor" valor={formatarMoeda(carrinho.valorAquisicao)} />
                <ItemDetalhe rotulo="Fornecedor" valor={carrinho.fornecedor} />
                <ItemDetalhe rotulo="Observação" valor={carrinho.observacao} />
              </SecaoDetalhe>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Fechar
              </Button>
              {onEditar && (
                <Button type="button" onClick={() => onEditar(carrinho)}>
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
