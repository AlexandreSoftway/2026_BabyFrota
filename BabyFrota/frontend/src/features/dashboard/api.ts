import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { DashboardPeriodo, DashboardResumo } from './types'

/** Com `habilitado` falso (período inválido), não consulta e a tela continua mostrando o último período válido. */
export function useDashboardResumo(periodo: DashboardPeriodo, habilitado = true) {
  return useQuery({
    queryKey: ['dashboard', 'resumo', periodo],
    queryFn: async () => (await api.get<DashboardResumo>('/dashboard/resumo', { params: periodo })).data,
    enabled: habilitado,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })
}
