import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  useAtualizarFaixaPreco,
  useCriarFaixaPreco,
  useExcluirFaixaPreco,
  useFaixasPrecoTipo,
} from '@/features/tipos-carrinho/api'
import { analisarFaixas, sugerirProximaFaixa } from '@/features/tipos-carrinho/faixas'
import type { FaixaPrecoTipo, TipoCarrinho } from '@/features/tipos-carrinho/types'
import { cn, extrairMensagemErro, formatarMinutos, formatarMoeda } from '@/lib/utils'
import { toast } from '@/stores/toast-store'

const inteiro = (valor: string) => /^\d+$/.test(valor.trim())

const schema = z
  .object({
    minimoMinutos: z.string().trim().min(1, 'Informe o início').refine(inteiro, 'Minutos inteiros, a partir de 0'),
    maximoMinutos: z.string().trim().min(1, 'Informe o fim').refine(inteiro, 'Minutos inteiros, a partir de 0'),
    valor: z
      .string()
      .trim()
      .min(1, 'Informe o valor')
      .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0, 'Valor inválido'),
  })
  .refine((v) => !inteiro(v.minimoMinutos) || !inteiro(v.maximoMinutos) || Number(v.maximoMinutos) >= Number(v.minimoMinutos), {
    path: ['maximoMinutos'],
    message: 'O fim precisa ser igual ou maior que o início',
  })
type Valores = z.infer<typeof schema>

/** 150 -> "150 min (2h 30min)": a tabela é em minutos, mas horas ajudam a ler os limites altos. */
function minutos(valor: number) {
  if (valor < 60) return `${valor} min`
  return `${valor} min (${valor % 60 === 0 ? `${valor / 60}h` : formatarMinutos(valor)})`
}

/**
 * Faixas de preço do tipo de carrinho, como no legado (o "+" de cada tipo em CadastroTipoCarrinho.aspx): de, até e valor.
 * Mostra onde a tabela tem minutos sem preço ou cobertos por duas faixas, que é o que faz a devolução errar.
 */
export function FaixasPrecoDialog({ tipo, onClose }: { tipo: TipoCarrinho | null; onClose: () => void }) {
  const { data: faixas, isLoading, isError, error } = useFaixasPrecoTipo(tipo?.id ?? null)
  const criar = useCriarFaixaPreco()
  const atualizar = useAtualizarFaixaPreco()
  const excluir = useExcluirFaixaPreco()
  const [editando, setEditando] = useState<FaixaPrecoTipo | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Valores>({ resolver: zodResolver(schema), defaultValues: { minimoMinutos: '', maximoMinutos: '', valor: '' } })

  // Fora da edição, o formulário já sugere a próxima faixa (logo depois da última, com a mesma duração).
  useEffect(() => {
    if (faixas && !editando) reset(sugerirProximaFaixa(faixas))
  }, [faixas, editando, reset])

  const avisos = faixas ? analisarFaixas(faixas) : []
  const ultima = faixas?.reduce<FaixaPrecoTipo | null>((a, b) => (a === null || b.maximoMinutos > a.maximoMinutos ? b : a), null)

  function fechar() {
    setEditando(null)
    onClose()
  }

  function editar(faixa: FaixaPrecoTipo) {
    reset({ minimoMinutos: String(faixa.minimoMinutos), maximoMinutos: String(faixa.maximoMinutos), valor: String(faixa.valor) })
    setEditando(faixa)
  }

  async function salvar(valores: Valores) {
    if (!tipo) return
    const payload = {
      minimoMinutos: Number(valores.minimoMinutos),
      maximoMinutos: Number(valores.maximoMinutos),
      valor: Number(valores.valor),
    }
    try {
      if (editando) {
        await atualizar.mutateAsync({ id: editando.id, payload })
        setEditando(null)
        toast.success('Faixa de preço atualizada.')
      } else {
        await criar.mutateAsync({ tipoCarrinhoId: tipo.id, payload })
        toast.success('Faixa de preço incluída.')
      }
    } catch (err) {
      toast.error('Não foi possível salvar a faixa de preço.', extrairMensagemErro(err))
    }
  }

  async function onExcluir(faixa: FaixaPrecoTipo) {
    if (!confirm(`Excluir a faixa de ${faixa.minimoMinutos} a ${faixa.maximoMinutos} minutos (${formatarMoeda(faixa.valor)})?`)) return
    try {
      await excluir.mutateAsync(faixa.id)
      if (editando?.id === faixa.id) setEditando(null)
      toast.success('Faixa de preço excluída.')
    } catch (err) {
      toast.error('Não foi possível excluir a faixa de preço.', extrairMensagemErro(err))
    }
  }

  return (
    <Dialog open={tipo !== null} onOpenChange={(open) => !open && fechar()}>
      {/* Título, formulário e nota ficam fixos no topo; só a lista de faixas rola (uma tabela tem umas 50 faixas). */}
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Faixas de preço</DialogTitle>
          <DialogDescription>
            {tipo?.descricao} — o valor da locação é o da faixa em que o tempo de uso cai, cobrado na devolução.
          </DialogDescription>
        </DialogHeader>

        {tipo && !isError && (
          <form onSubmit={handleSubmit(salvar)} className="shrink-0 space-y-3 rounded-lg border p-3">
            <p className="text-sm font-medium">
              {editando ? `Editar a faixa de ${editando.minimoMinutos} a ${editando.maximoMinutos} minutos` : 'Nova faixa'}
            </p>
            {/* Campos e botão numa linha só (a partir de tablet), para sobrar altura para a lista. */}
            <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <div className="space-y-1.5">
                <Label htmlFor="faixa-de">De (minutos)</Label>
                <Input id="faixa-de" type="number" min={0} step={1} inputMode="numeric" {...register('minimoMinutos')} />
                {errors.minimoMinutos && <p className="text-xs text-destructive">{errors.minimoMinutos.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faixa-ate">Até (minutos)</Label>
                <Input id="faixa-ate" type="number" min={0} step={1} inputMode="numeric" {...register('maximoMinutos')} />
                {errors.maximoMinutos && <p className="text-xs text-destructive">{errors.maximoMinutos.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faixa-valor">Valor (R$)</Label>
                <Input id="faixa-valor" type="number" min={0} step="0.01" inputMode="decimal" {...register('valor')} />
                {errors.valor && <p className="text-xs text-destructive">{errors.valor.message}</p>}
              </div>
              <div className="space-y-1.5">
                {/* Rótulo invisível só para alinhar os botões com os campos. */}
                <Label aria-hidden className="invisible hidden sm:block">
                  Ação
                </Label>
                <div className="flex flex-wrap justify-end gap-2">
                  {editando && (
                    <Button type="button" variant="outline" onClick={() => setEditando(null)}>
                      Cancelar
                    </Button>
                  )}
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : editando ? <Pencil /> : <Plus />}
                    {editando ? 'Salvar faixa' : 'Incluir faixa'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}

        <p className="shrink-0 text-xs text-muted-foreground">
          Cada faixa vale do minuto "de" ao minuto "até", inclusive.
          {ultima && (
            <>
              {' '}
              Acima de {minutos(ultima.maximoMinutos)} a devolução cobra o valor da última faixa ({formatarMoeda(ultima.valor)}).
            </>
          )}
        </p>

        {/* flex-auto (e não flex-1): a lista começa do tamanho dela e só encolhe, rolando, quando o modal chega à altura máxima. */}
        <div className="-mx-6 min-h-0 flex-auto space-y-4 overflow-y-auto px-6">
          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Carregando faixas...
            </p>
          )}
  
          {isError && (
            <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              Não foi possível carregar as faixas: {extrairMensagemErro(error, 'erro ao consultar.')}
            </p>
          )}
  
          {avisos.length > 0 && (
            <div role="status" className="space-y-1 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              {avisos.map((aviso) => (
                <p key={aviso} className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>{aviso}</span>
                </p>
              ))}
            </div>
          )}
  
          {faixas && faixas.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>De</TableHead>
                  <TableHead>Até</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faixas.map((f) => (
                  <TableRow key={f.id} className={cn(editando?.id === f.id && 'bg-primary/5')}>
                    <TableCell className="tabular-nums">{f.minimoMinutos} min</TableCell>
                    <TableCell className="tabular-nums">{minutos(f.maximoMinutos)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatarMoeda(f.valor)}</TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="ghost" size="icon" onClick={() => editar(f)} title="Editar faixa">
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onExcluir(f)}
                        disabled={excluir.isPending}
                        title="Excluir faixa"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button type="button" variant="outline" onClick={fechar}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
