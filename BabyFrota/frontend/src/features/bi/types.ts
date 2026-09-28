// Espelham DTOs/Bi/BiDto.cs: o BI de clientes e de locações do sistema novo.

export interface BiClientesFiltro {
  pagina?: number
  tamanhoPagina?: number
  nome?: string
  cidade?: string
  uf?: string
  dataCadastroInicio?: string
  dataCadastroFinal?: string
  dataLocacaoInicio?: string
  dataLocacaoFinal?: string
}

export interface BiCliente {
  id: number
  nome: string
  cpf: string
  email: string | null
  cidade: string | null
  uf: string | null
  telefone: string
  dataCadastro: string | null
  quantidadeLocacoes: number
  tempoTotalMinutos: number
  totalGasto: number
  dataUltimaLocacao: string | null
  primeiroTipoCarrinho: string | null
}

export interface BiClientesResumo {
  totalClientes: number
  totalLocacoes: number
  totalGasto: number
  ticketMedioPorCliente: number
}

export interface BiLocacoesFiltro {
  pagina?: number
  tamanhoPagina?: number
  dataEntregaInicio?: string
  dataEntregaFinal?: string
  clienteNome?: string
  carrinhoId?: number
  tipoCarrinhoId?: number
  somenteEmAndamento?: boolean
}

export interface BiLocacao {
  id: number
  dataEntrega: string
  dataDevolucao: string | null
  clienteId: number
  clienteNome: string
  carrinhoId: number
  carrinhoDescricao: string
  tipoCarrinhoDescricao: string
  tempoMinutos: number | null
  valorTotal: number | null
  desconto: number | null
  troco: number | null
  formaPagamento: string
  quantidadeParcelas: number
  usuarioEntregaNome: string
  usuarioDevolucaoNome: string | null
  emAndamento: boolean
}

export interface BiLocacoesResumo {
  totalLocacoes: number
  faturamento: number
  ticketMedio: number
  tempoMedioMinutos: number
}

export interface BiFaturamentoPorDia {
  data: string
  quantidade: number
  faturamento: number
}
