import { useState, type KeyboardEvent } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AxiosError } from 'axios'
import { ArrowLeftRight, Loader2, Plus, Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useCarrinhosParaTroca,
  useFormasRecebimento,
  usePreviaDevolucao,
  useRegistrarDevolucao,
  useTrocarCarrinho,
  useTrocasDaLocacao,
} from '@/features/locacoes/api'
import { useImprimirComprovante } from '@/features/locacoes/comprovante'
import type { Locacao } from '@/features/locacoes/types'
import { useAgora } from '@/hooks/use-agora'
import { PERFIL_ADMINISTRADOR } from '@/lib/perfis'
import { cn, extrairMensagemErro, formatarDataHora, formatarMinutos, formatarMoeda, tempoDecorrido } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { toast } from '@/stores/toast-store'

export type AbaLocacao = 'devolucao' | 'troca'
/** Dinheiro é o id 1 da tabela FormaRecebimento; o legado também já vinha com ele marcado. */
const FORMA_PADRAO_ID = 1

const centavos = (reais: number) => Math.round(reais * 100)
const emReais = (valorEmCentavos: number) => valorEmCentavos / 100

const pagamentoSchema = z.object({
  formaRecebimentoId: z.coerce.number().min(1, 'Selecione a forma'),
  valor: z.coerce.number().min(0.01, 'Valor inválido'),
})

// Sem `.min(1)` em pagamentos: com valor a receber igual a zero (desconto total) a devolução não exige pagamento.
// A obrigatoriedade quando há valor a receber é checada em aoConfirmar.
const devolucaoSchema = z.object({
  desconto: z.coerce.number().min(0).optional(),
  observacao: z.string().optional(),
  pagamentos: z.array(pagamentoSchema),
})
type DevolucaoFormValues = z.infer<typeof devolucaoSchema>

const ABAS = [
  { id: 'devolucao', rotulo: 'Devolução', icone: Undo2 },
  { id: 'troca', rotulo: 'Troca de carrinho', icone: ArrowLeftRight },
] as const

// ---------------------------------------------------------------------------------------------------------------------
// Devolução
// ---------------------------------------------------------------------------------------------------------------------

function PainelDevolucao({ locacao, onClose }: { locacao: Locacao; onClose: () => void }) {
  const {
    data: previa,
    isFetching: carregandoPrevia,
    isError: previaComErro,
    error: erroPrevia,
  } = usePreviaDevolucao(locacao.id)
  const { data: trocasDaLocacao } = useTrocasDaLocacao(locacao.id)
  const { data: formasRecebimento } = useFormasRecebimento()
  const podeDarDesconto = useAuthStore((s) => s.usuario?.perfilId) === PERFIL_ADMINISTRADOR
  const registrarDevolucao = useRegistrarDevolucao()
  const imprimirComprovante = useImprimirComprovante()

  const {
    register,
    handleSubmit,
    watch,
    control,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<DevolucaoFormValues>({
    resolver: zodResolver(devolucaoSchema),
    defaultValues: { desconto: 0, observacao: '', pagamentos: [] },
  })

  const { fields: pagamentos, append: adicionarPagamento, remove: removerPagamento } = useFieldArray({
    control,
    name: 'pagamentos',
  })

  const desconto = watch('desconto') ?? 0
  const valoresPagamentos = watch('pagamentos')

  // Tudo em centavos inteiros: comparar reais com ponto flutuante (0,1 + 0,2 ≠ 0,3) faria "faltar" um centavo que não falta.
  const jaRecebido = centavos(previa?.valorJaRecebido ?? 0)
  const valorTotal = previa ? Math.max(0, centavos(previa.valor) - centavos(desconto)) : null
  // O que a locação já recebeu antes (fluxo antigo, em que a entrega cobrava) conta como pago e não deve ser cobrado de novo.
  const semValorAReceber = valorTotal !== null && jaRecebido >= valorTotal
  const somaPagamentos = semValorAReceber
    ? 0
    : (valoresPagamentos ?? []).reduce((soma, p) => soma + centavos(Number(p.valor) || 0), 0)
  const recebido = jaRecebido + somaPagamentos
  // Nunca aceita menos que o total; sobrando, a diferença é sempre troco.
  const falta = valorTotal !== null ? Math.max(0, valorTotal - recebido) : 0
  const troco = valorTotal !== null ? Math.max(0, recebido - valorTotal) : 0

  // Forma que já vem escolhida ao adicionar pagamento: dinheiro, como no legado; se não existir, a primeira da lista.
  const formaPadrao = formasRecebimento?.find((f) => f.id === FORMA_PADRAO_ID)?.id ?? formasRecebimento?.[0]?.id ?? 0

  async function aoConfirmar(values: DevolucaoFormValues) {
    if (!semValorAReceber && values.pagamentos.length === 0) {
      setError('pagamentos', { type: 'manual', message: 'Adicione ao menos uma forma de pagamento' })
      return
    }
    if (falta > 0) {
      setError('pagamentos', {
        type: 'manual',
        message: `Falta ${formatarMoeda(emReais(falta))}. O valor pago não pode ser menor que o total.`,
      })
      return
    }
    try {
      await registrarDevolucao.mutateAsync({
        locacaoId: locacao.id,
        payload: {
          desconto: values.desconto ?? 0,
          observacao: values.observacao || undefined,
          pagamentos: semValorAReceber ? [] : values.pagamentos,
        },
      })
      toast.success('Devolução registrada com sucesso.', `Cliente: ${locacao.clienteNome}`)
      // Como no legado, o comprovante sai logo depois do pagamento. Não espera a impressão para fechar o modal.
      void imprimirComprovante('devolucao', locacao.id, { automatico: true })
      onClose()
    } catch (err) {
      toast.error('Não foi possível registrar a devolução.', extrairMensagemErro(err))
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(aoConfirmar)}>
      {trocasDaLocacao && trocasDaLocacao.length > 0 && (
        <div className="space-y-1.5 rounded-md border p-3">
          <p className="text-sm font-medium">Trocas nesta locação</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {trocasDaLocacao.map((t) => (
              <li key={t.id}>
                <span className="font-medium text-foreground">
                  {t.carrinhoAnteriorDescricao} → {t.novoCarrinhoDescricao}
                </span>{' '}
                · {formatarDataHora(t.dataTroca)} · {t.usuarioNome}
              </li>
            ))}
          </ul>
        </div>
      )}

      {previaComErro && (
        <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          Não foi possível calcular a devolução: {extrairMensagemErro(erroPrevia, 'erro ao consultar o valor.')}
        </p>
      )}
      {previa?.acimaDaTabela && previa.maximoTabelaMinutos !== null && (
        <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-800">
          O tempo passou da última faixa da tabela de preços ({formatarMinutos(previa.maximoTabelaMinutos)}). Está sendo
          cobrado o valor dessa última faixa.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Tempo total</Label>
          <p className="flex h-9 items-center text-sm">
            {carregandoPrevia ? (
              <Loader2 className="size-4 animate-spin" />
            ) : previa ? (
              formatarMinutos(previa.tempoMinutos)
            ) : (
              '—'
            )}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desconto">Desconto</Label>
          <Input
            id="desconto"
            type="number"
            step="0.01"
            readOnly={!podeDarDesconto}
            className={podeDarDesconto ? undefined : 'bg-muted'}
            {...register('desconto')}
          />
          {!podeDarDesconto && <p className="text-xs text-muted-foreground">Somente Administrador concede desconto.</p>}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <span className="text-sm text-muted-foreground">Valor da devolução</span>
        <span className="text-lg font-semibold">{valorTotal !== null ? formatarMoeda(emReais(valorTotal)) : '—'}</span>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="observacao">Observação</Label>
        <Input id="observacao" {...register('observacao')} />
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Pagamento</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={valorTotal === null || semValorAReceber}
            onClick={() => {
              clearErrors('pagamentos')
              adicionarPagamento({ formaRecebimentoId: formaPadrao, valor: 0 })
            }}
          >
            <Plus className="size-4" /> Adicionar forma
          </Button>
        </div>

        {jaRecebido > 0 && (
          <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">
            Esta locação já recebeu {formatarMoeda(emReais(jaRecebido))} antes (entrega no fluxo antigo). Esse valor já conta
            como pago.
          </p>
        )}
        {semValorAReceber && (
          <p className="text-sm text-muted-foreground">Sem valor a receber — nenhum pagamento é necessário.</p>
        )}
        {valorTotal !== null && !semValorAReceber && pagamentos.length === 0 && (
          <p className="text-sm text-muted-foreground">Adicione ao menos uma forma de pagamento.</p>
        )}
        {errors.pagamentos?.message && <p className="text-xs text-destructive">{errors.pagamentos.message}</p>}

        {!semValorAReceber &&
          pagamentos.map((pagamento, index) => (
            <div key={pagamento.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor={`pagamentos.${index}.formaRecebimentoId`}>Forma</Label>
                <Select
                  id={`pagamentos.${index}.formaRecebimentoId`}
                  {...register(`pagamentos.${index}.formaRecebimentoId` as const)}
                >
                  {formasRecebimento?.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`pagamentos.${index}.valor`}>Valor</Label>
                <Input
                  id={`pagamentos.${index}.valor`}
                  type="number"
                  step="0.01"
                  {...register(`pagamentos.${index}.valor` as const)}
                />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removerPagamento(index)} title="Remover">
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}

        {valorTotal !== null && (!semValorAReceber || troco > 0) && (
          <div className="flex items-center justify-between border-t pt-2 text-sm">
            <span className="text-muted-foreground">
              Pago: {formatarMoeda(emReais(recebido))}
              {jaRecebido > 0 && ` (inclui ${formatarMoeda(emReais(jaRecebido))} já recebidos)`}
            </span>
            {falta > 0 ? (
              <span className="font-medium text-destructive">Falta {formatarMoeda(emReais(falta))}</span>
            ) : (
              <span className={troco > 0 ? 'font-semibold text-emerald-700' : 'font-medium'}>
                {troco > 0 ? 'Troco a devolver' : 'Troco'}: {formatarMoeda(emReais(troco))}
              </span>
            )}
          </div>
        )}
      </div>

      {registrarDevolucao.isError && (
        <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {registrarDevolucao.error instanceof AxiosError
            ? (registrarDevolucao.error.response?.data?.detail ?? 'Não foi possível registrar a devolução.')
            : 'Não foi possível registrar a devolução.'}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || !previa || falta > 0}>
          Confirmar devolução
        </Button>
      </DialogFooter>
    </form>
  )
}

// ---------------------------------------------------------------------------------------------------------------------
// Troca de carrinho
// ---------------------------------------------------------------------------------------------------------------------

function PainelTroca({ locacao, onClose }: { locacao: Locacao; onClose: () => void }) {
  const [novoCarrinhoId, setNovoCarrinhoId] = useState(0)
  const { data: carrinhosTroca, isFetching: carregandoCarrinhosTroca } = useCarrinhosParaTroca(locacao.id)
  const trocarCarrinho = useTrocarCarrinho()
  const imprimirComprovante = useImprimirComprovante()

  async function confirmarTroca() {
    if (!novoCarrinhoId) return
    try {
      await trocarCarrinho.mutateAsync({ locacaoId: locacao.id, payload: { novoCarrinhoId } })
      toast.success('Carrinho trocado com sucesso.')
      void imprimirComprovante('troca', locacao.id, { automatico: true })
      onClose()
    } catch (err) {
      toast.error('Não foi possível trocar o carrinho.', extrairMensagemErro(err))
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="novoCarrinhoId">Novo carrinho (mesmo tipo, disponível)</Label>
        <Select id="novoCarrinhoId" value={novoCarrinhoId} onChange={(e) => setNovoCarrinhoId(Number(e.target.value))}>
          <option value={0}>Selecione...</option>
          {carrinhosTroca?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.descricao}
            </option>
          ))}
        </Select>
        {carregandoCarrinhosTroca && <p className="text-xs text-muted-foreground">Carregando carrinhos disponíveis...</p>}
        {!carregandoCarrinhosTroca && carrinhosTroca?.length === 0 && (
          <p className="text-xs text-amber-700">Não há outro carrinho do mesmo tipo disponível agora.</p>
        )}
      </div>

      {trocarCarrinho.isError && (
        <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {trocarCarrinho.error instanceof AxiosError
            ? (trocarCarrinho.error.response?.data?.detail ?? 'Não foi possível trocar o carrinho.')
            : 'Não foi possível trocar o carrinho.'}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="button" onClick={confirmarTroca} disabled={!novoCarrinhoId || trocarCarrinho.isPending}>
          Confirmar troca
        </Button>
      </DialogFooter>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------------
// Modal da locação: uma janela, duas ações
// ---------------------------------------------------------------------------------------------------------------------

function ConteudoLocacao({
  locacao,
  abaInicial,
  onClose,
}: {
  locacao: Locacao
  abaInicial: AbaLocacao
  onClose: () => void
}) {
  const [aba, setAba] = useState<AbaLocacao>(abaInicial)
  const agora = useAgora()

  // Setas esquerda/direita alternam as abas, como manda o padrão de abas acessíveis.
  function aoTeclarNasAbas(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const outra: AbaLocacao = aba === 'devolucao' ? 'troca' : 'devolucao'
    setAba(outra)
    document.getElementById(`aba-locacao-${outra}`)?.focus()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="pr-6 leading-snug">{locacao.clienteNome}</DialogTitle>
        <DialogDescription>
          Carrinho <span className="font-medium text-foreground">{locacao.carrinhoDescricao}</span> · entregue em{' '}
          {formatarDataHora(locacao.dataEntrega)} · {tempoDecorrido(locacao.dataEntrega, agora)} de uso
        </DialogDescription>
      </DialogHeader>

      <div
        role="tablist"
        aria-label="Ação nesta locação"
        onKeyDown={aoTeclarNasAbas}
        className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
      >
        {ABAS.map((a) => (
          <button
            key={a.id}
            id={`aba-locacao-${a.id}`}
            type="button"
            role="tab"
            aria-selected={aba === a.id}
            aria-controls={`painel-locacao-${a.id}`}
            tabIndex={aba === a.id ? 0 : -1}
            onClick={() => setAba(a.id)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              aba === a.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <a.icone className="size-4" /> {a.rotulo}
          </button>
        ))}
      </div>

      {/* Só a aba ativa é montada: a prévia da devolução e a lista de troca só são consultadas quando usadas. */}
      <div role="tabpanel" id={`painel-locacao-${aba}`} aria-labelledby={`aba-locacao-${aba}`}>
        {aba === 'devolucao' ? (
          <PainelDevolucao locacao={locacao} onClose={onClose} />
        ) : (
          <PainelTroca locacao={locacao} onClose={onClose} />
        )}
      </div>
    </>
  )
}

/**
 * Modal de uma locação em andamento, com as ações de devolução e de troca de carrinho. Usado na Entrega (clicando na lista
 * de locações em andamento) e em Troca e Devolução.
 */
export function LocacaoAcoesDialog({
  locacao,
  abaInicial,
  onClose,
}: {
  locacao: Locacao | null
  abaInicial: AbaLocacao
  onClose: () => void
}) {
  return (
    <Dialog open={locacao !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        {/* key: outra locação recomeça do zero (formulário, aba e consultas). */}
        {locacao && <ConteudoLocacao key={locacao.id} locacao={locacao} abaInicial={abaInicial} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
