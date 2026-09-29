import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PagedResult } from '@/types/paged-result'
import type { Cliente, ClienteUpsert } from './types'

const QUERY_KEY = ['clientes']

interface Filtro {
  nome?: string
  cpf?: string
  pagina?: number
  tamanhoPagina?: number
}

async function listar(filtro: Filtro): Promise<PagedResult<Cliente>> {
  const { data } = await api.get<PagedResult<Cliente>>('/cliente', { params: filtro })
  return data
}

export function useClientes(filtro: Filtro = {}) {
  return useQuery({
    queryKey: [...QUERY_KEY, filtro],
    queryFn: () => listar(filtro),
    placeholderData: keepPreviousData,
  })
}

/** Detalhe completo (com Filhos) — usado ao abrir o modal de edição, não na listagem. */
export async function obterClientePorId(id: number): Promise<Cliente> {
  const { data } = await api.get<Cliente>(`/cliente/${id}`)
  return data
}

/** O mesmo detalhe, para o modal "Ver detalhes"; só consulta quando o modal abre. */
export function useClienteDetalhe(id: number | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'detalhe', id],
    queryFn: () => obterClientePorId(id as number),
    enabled: id !== null,
  })
}

export function useCriarCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ClienteUpsert) => api.post<Cliente>('/cliente', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useAtualizarCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ClienteUpsert }) =>
      api.put<Cliente>(`/cliente/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useExcluirCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/cliente/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
