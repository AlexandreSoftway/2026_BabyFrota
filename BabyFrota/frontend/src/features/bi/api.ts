import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PagedResult } from '@/types/paged-result'
import type {
  BiCliente,
  BiClientesFiltro,
  BiClientesResumo,
  BiFaturamentoPorDia,
  BiLocacao,
  BiLocacoesFiltro,
  BiLocacoesResumo,
} from './types'

export function useBiClientes(filtro: BiClientesFiltro) {
  return useQuery({
    queryKey: ['bi', 'clientes', filtro],
    queryFn: async () => (await api.get<PagedResult<BiCliente>>('/bi/clientes', { params: filtro })).data,
    placeholderData: keepPreviousData,
  })
}

/** O resumo não depende da página: a chave ignora a paginação, para não reconsultar ao trocar de página. */
export function useBiClientesResumo({ pagina: _p, tamanhoPagina: _t, ...filtro }: BiClientesFiltro) {
  return useQuery({
    queryKey: ['bi', 'clientes', 'resumo', filtro],
    queryFn: async () => (await api.get<BiClientesResumo>('/bi/clientes/resumo', { params: filtro })).data,
    placeholderData: keepPreviousData,
  })
}

export function useBiLocacoes(filtro: BiLocacoesFiltro) {
  return useQuery({
    queryKey: ['bi', 'locacoes', filtro],
    queryFn: async () => (await api.get<PagedResult<BiLocacao>>('/bi/locacoes', { params: filtro })).data,
    placeholderData: keepPreviousData,
  })
}

export function useBiLocacoesResumo({ pagina: _p, tamanhoPagina: _t, ...filtro }: BiLocacoesFiltro) {
  return useQuery({
    queryKey: ['bi', 'locacoes', 'resumo', filtro],
    queryFn: async () => (await api.get<BiLocacoesResumo>('/bi/locacoes/resumo', { params: filtro })).data,
    placeholderData: keepPreviousData,
  })
}

export function useBiFaturamentoPorDia({ pagina: _p, tamanhoPagina: _t, ...filtro }: BiLocacoesFiltro) {
  return useQuery({
    queryKey: ['bi', 'locacoes', 'faturamento-por-dia', filtro],
    queryFn: async () =>
      (await api.get<BiFaturamentoPorDia[]>('/bi/locacoes/faturamento-por-dia', { params: filtro })).data,
    placeholderData: keepPreviousData,
  })
}
