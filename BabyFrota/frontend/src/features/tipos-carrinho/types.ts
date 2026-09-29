export interface TipoCarrinho {
  id: number
  descricao: string
  quantidadeCarrinhos: number
  quantidadeFaixas: number
}

export interface TipoCarrinhoUpsert {
  descricao: string
}

/** Faixa de preço por tempo de uso (tabela PrecoLocacao): de `minimoMinutos` a `maximoMinutos`, inclusive. */
export interface FaixaPrecoTipo {
  id: number
  tipoCarrinhoId: number
  minimoMinutos: number
  maximoMinutos: number
  valor: number
}

export interface FaixaPrecoUpsert {
  minimoMinutos: number
  maximoMinutos: number
  valor: number
}
