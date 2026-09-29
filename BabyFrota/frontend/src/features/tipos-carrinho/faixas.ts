import type { FaixaPrecoTipo } from './types'

const faixaEmTexto = (f: FaixaPrecoTipo) => `${f.minimoMinutos}–${f.maximoMinutos} min`

/**
 * Problemas da tabela que a devolução sente: tempo sem preço (a devolução para com "não há faixa de preço") e minutos
 * cobertos por duas faixas (a devolução cobra qualquer uma das duas). Acima da última faixa não é problema: cobra-se a
 * última.
 */
export function analisarFaixas(faixas: FaixaPrecoTipo[]): string[] {
  if (faixas.length === 0)
    return ['Nenhuma faixa cadastrada: a devolução de um carrinho deste tipo não consegue calcular o valor.']

  const ordenadas = [...faixas].sort((a, b) => a.minimoMinutos - b.minimoMinutos || a.maximoMinutos - b.maximoMinutos)
  const avisos: string[] = []
  const semPreco = (de: number, ate: number) =>
    `Sem preço ${de === ate ? `no minuto ${de}` : `de ${de} a ${ate} minutos`}: uma devolução nesse tempo não consegue calcular o valor.`

  if (ordenadas[0].minimoMinutos > 0) avisos.push(semPreco(0, ordenadas[0].minimoMinutos - 1))

  let maisLonga = ordenadas[0]
  for (const faixa of ordenadas.slice(1)) {
    if (faixa.minimoMinutos <= maisLonga.maximoMinutos) {
      const ate = Math.min(maisLonga.maximoMinutos, faixa.maximoMinutos)
      const minutos = faixa.minimoMinutos === ate ? `o minuto ${ate}` : `os minutos ${faixa.minimoMinutos} a ${ate}`
      avisos.push(`As faixas ${faixaEmTexto(maisLonga)} e ${faixaEmTexto(faixa)} cobrem ${minutos}: ajuste uma delas.`)
    } else if (faixa.minimoMinutos > maisLonga.maximoMinutos + 1) {
      avisos.push(semPreco(maisLonga.maximoMinutos + 1, faixa.minimoMinutos - 1))
    }
    if (faixa.maximoMinutos > maisLonga.maximoMinutos) maisLonga = faixa
  }

  return avisos
}

/** Sugestão para a próxima faixa: começa logo depois da última, com a mesma duração dela. */
export function sugerirProximaFaixa(faixas: FaixaPrecoTipo[]) {
  if (faixas.length === 0) return { minimoMinutos: '0', maximoMinutos: '', valor: '' }
  const ultima = faixas.reduce((a, b) => (b.maximoMinutos > a.maximoMinutos ? b : a))
  const inicio = ultima.maximoMinutos + 1
  return {
    minimoMinutos: String(inicio),
    maximoMinutos: String(inicio + (ultima.maximoMinutos - ultima.minimoMinutos)),
    valor: '',
  }
}
