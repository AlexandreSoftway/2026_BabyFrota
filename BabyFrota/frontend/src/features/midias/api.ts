import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

/**
 * Imagens guardadas no próprio registro (foto e documento do cliente, foto do carrinho). `url` é a rota da API, ex.:
 * "/cliente/12/foto". A imagem vem pelo axios (com o token), e não por um <img src> direto, porque a API exige login.
 */
const chave = (url: string | null) => ['midia', url] as const

/** A imagem, ou null se o registro não tiver (a API responde 204). */
export function useImagem(url: string | null) {
  return useQuery({
    queryKey: chave(url),
    queryFn: async () => {
      const resposta = await api.get<Blob>(url as string, { responseType: 'blob' })
      return resposta.status === 204 || resposta.data.size === 0 ? null : resposta.data
    },
    enabled: url !== null,
    staleTime: 5 * 60_000,
  })
}

export function useEnviarImagem(url: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (imagem: Blob) => {
      const formulario = new FormData()
      formulario.append('arquivo', imagem, 'imagem.jpg')
      await api.put(url, formulario)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chave(url) }),
  })
}

export function useRemoverImagem(url: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.delete(url)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chave(url) }),
  })
}
