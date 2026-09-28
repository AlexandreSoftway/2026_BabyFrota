export interface CarrinhoMaisLocado {
  descricao: string
  quantidadeLocacoes: number
}

/** Período do Dashboard (datas "aaaa-mm-dd", inclusivas). */
export interface DashboardPeriodo {
  dataInicio: string
  dataFim: string
}

export interface DashboardResumo {
  // Agora (não dependem do período)
  totalCarrinhos: number
  carrinhosDisponiveis: number
  carrinhosAlugados: number
  percentualOcupacao: number
  caixaAberto: boolean
  faturamentoCaixaAtual: number | null

  // Período
  dataInicio: string
  dataFim: string
  locacoesEntregues: number
  /** Devolvidas no período: é na devolução que o valor é cobrado. */
  locacoesDevolvidas: number
  faturamento: number
  ticketMedio: number
  topCarrinhos: CarrinhoMaisLocado[]
}
