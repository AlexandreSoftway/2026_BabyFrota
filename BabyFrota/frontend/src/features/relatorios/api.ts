import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  ClienteRelatorio,
  LogDetalhe,
  ModeloHistorico,
  RelatorioClientesFiltro,
  RelatorioHistoricoFiltro,
  RelatorioLogFiltro,
  RelatorioLogResultado,
  UsuarioFiltro,
} from './types'

/**
 * As procedures do legado são pesadas em períodos longos, então o relatório tem um limite próprio, igual ao do
 * servidor (5 minutos), em vez dos 25 segundos das demais chamadas.
 */
const TEMPO_LIMITE_RELATORIO_MS = 300_000

/**
 * Um relatório pedido pelo botão "Gerar". `geracao` muda a cada clique, para gerar de novo com os mesmos filtros.
 * Nada roda sozinho: nem ao digitar, nem ao voltar para a aba, nem repetindo após erro (a consulta é cara).
 */
export interface PedidoRelatorio<F> {
  filtro: F
  geracao: number
}

const opcoesDeRelatorio = { staleTime: Infinity, refetchOnWindowFocus: false, retry: false } as const

export function useRelatorioClientes(pedido: PedidoRelatorio<RelatorioClientesFiltro> | null) {
  return useQuery({
    queryKey: ['relatorios', 'clientes', pedido],
    queryFn: async () =>
      (
        await api.get<ClienteRelatorio[]>('/relatorio/clientes', {
          params: pedido?.filtro,
          timeout: TEMPO_LIMITE_RELATORIO_MS,
        })
      ).data,
    enabled: pedido !== null,
    ...opcoesDeRelatorio,
  })
}

/** Só consulta quando `pedido` é do `modelo` indicado; a tela chama um hook por modelo. */
export function useRelatorioHistorico<T>(modelo: ModeloHistorico, pedido: PedidoRelatorio<RelatorioHistoricoFiltro> | null) {
  return useQuery({
    queryKey: ['relatorios', 'historico', modelo, pedido],
    queryFn: async () =>
      (
        await api.get<T[]>(`/relatorio/historico/${modelo}`, {
          params: pedido?.filtro,
          timeout: TEMPO_LIMITE_RELATORIO_MS,
        })
      ).data,
    enabled: pedido !== null,
    ...opcoesDeRelatorio,
  })
}

export function useUsuariosRelatorio() {
  return useQuery({
    queryKey: ['relatorios', 'usuarios'],
    queryFn: async () => (await api.get<UsuarioFiltro[]>('/relatorio/usuarios')).data,
    staleTime: 5 * 60_000,
  })
}

// ---------- Relatório de Log ----------

export function useRelatorioLog(pedido: PedidoRelatorio<RelatorioLogFiltro> | null) {
  return useQuery({
    queryKey: ['relatorios', 'log', pedido],
    queryFn: async () =>
      (
        await api.get<RelatorioLogResultado>('/relatorio/log', {
          params: pedido?.filtro,
          timeout: TEMPO_LIMITE_RELATORIO_MS,
        })
      ).data,
    enabled: pedido !== null,
    ...opcoesDeRelatorio,
  })
}

/** O antes e depois de uma linha do log, pedido só quando a linha é aberta. */
export function useLogDetalhe(id: number) {
  return useQuery({
    queryKey: ['relatorios', 'log', 'detalhe', id],
    queryFn: async () => (await api.get<LogDetalhe>(`/relatorio/log/${id}`)).data,
    staleTime: Infinity,
    retry: false,
  })
}

export function useTabelasLog() {
  return useQuery({
    queryKey: ['relatorios', 'log', 'tabelas'],
    queryFn: async () => (await api.get<string[]>('/relatorio/log/tabelas')).data,
    staleTime: Infinity,
  })
}
