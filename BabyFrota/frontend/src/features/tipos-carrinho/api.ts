import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { FaixaPrecoTipo, FaixaPrecoUpsert, TipoCarrinho, TipoCarrinhoUpsert } from './types'

const QUERY_KEY = ['tipos-carrinho']

async function listar(): Promise<TipoCarrinho[]> {
  const { data } = await api.get<TipoCarrinho[]>('/tipocarrinho')
  return data
}

export function useTiposCarrinho() {
  return useQuery({ queryKey: QUERY_KEY, queryFn: listar })
}

export function useCriarTipoCarrinho() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TipoCarrinhoUpsert) => api.post<TipoCarrinho>('/tipocarrinho', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useAtualizarTipoCarrinho() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: TipoCarrinhoUpsert }) =>
      api.put<TipoCarrinho>(`/tipocarrinho/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useExcluirTipoCarrinho() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/tipocarrinho/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['locacoes', 'precos'] })
    },
  })
}

// ---------- Faixas de preço do tipo ----------

export function useFaixasPrecoTipo(tipoCarrinhoId: number | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, tipoCarrinhoId, 'precos'],
    queryFn: async () => (await api.get<FaixaPrecoTipo[]>(`/tipocarrinho/${tipoCarrinhoId}/precos`)).data,
    enabled: tipoCarrinhoId !== null,
  })
}

/**
 * Depois de mudar uma faixa: recarrega a lista de tipos (a contagem de faixas), as faixas do tipo e a tabela de preços que
 * a Entrega mostra ao escolher o carrinho.
 */
function useAoMudarFaixa() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    queryClient.invalidateQueries({ queryKey: ['locacoes', 'precos'] })
  }
}

export function useCriarFaixaPreco() {
  const aoMudar = useAoMudarFaixa()
  return useMutation({
    mutationFn: ({ tipoCarrinhoId, payload }: { tipoCarrinhoId: number; payload: FaixaPrecoUpsert }) =>
      api.post<FaixaPrecoTipo>(`/tipocarrinho/${tipoCarrinhoId}/precos`, payload),
    onSuccess: aoMudar,
  })
}

export function useAtualizarFaixaPreco() {
  const aoMudar = useAoMudarFaixa()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: FaixaPrecoUpsert }) =>
      api.put<FaixaPrecoTipo>(`/tipocarrinho/precos/${id}`, payload),
    onSuccess: aoMudar,
  })
}

export function useExcluirFaixaPreco() {
  const aoMudar = useAoMudarFaixa()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/tipocarrinho/precos/${id}`),
    onSuccess: aoMudar,
  })
}
