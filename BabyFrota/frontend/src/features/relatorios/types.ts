// Espelham os DTOs de DTOs/Relatorios/RelatorioDto.cs: as colunas das procedures e dos RDLC do legado.
// Datas chegam como texto ISO sem fuso ("2026-09-24T12:32:00").

/** Filtros do Relatório de Clientes, iguais aos do legado. */
export interface RelatorioClientesFiltro {
  clienteId?: number
  cidade?: string
  complemento?: string
  uf?: string
  dataCadastroInicio?: string
  dataCadastroFinal?: string
  dataLocacaoInicio?: string
  dataLocacaoFinal?: string
}

export interface ClienteRelatorio {
  codigoCliente: number
  nomeCliente: string | null
  dataNascimento: string | null
  ufCliente: string | null
  cidadeCliente: string | null
  complementoCliente: string | null
  logradouroCliente: string | null
  genero: string | null
  classeSocial: string | null
  dataCadastro: string | null
  dataPenultimaLocacao: string | null
  dataUltimaLocacao: string | null
  primeiroTipoCarrinhoLocado: string | null
  celular: string | null
  emailCliente: string | null
  filhoNome1: string | null
  filhoDtNascimento1: string | null
  filhoTpSexo1: string | null
  filhoNome2: string | null
  filhoDtNascimento2: string | null
  filhoTpSexo2: string | null
  filhoNome3: string | null
  filhoDtNascimento3: string | null
  filhoTpSexo3: string | null
  qtdLocacoes: number | null
  tempoTotal: number | null
  totalGasto: number | null
  observacao: string | null
}

/** Os três relatórios de histórico do legado. */
export type ModeloHistorico = 'ocupacao' | 'detalhado' | 'simplificado'

/** Filtros dos relatórios de histórico, iguais aos do legado. As duas datas são obrigatórias. */
export interface RelatorioHistoricoFiltro {
  dataEntregaInicio: string
  dataEntregaFinal: string
  clienteId?: number
  carrinhoId?: number
  tipoCarrinhoId?: number
  usuarioEntregaId?: number
  usuarioDevolucaoId?: number
}

export interface HistoricoLocacaoDetalhado {
  dataEntrega: string
  nrSemana: number | null
  nrDia: number | null
  mes: string | null
  ano: number | null
  diaSemana: string | null
  dia: number | null
  numeroCaixa: number | null
  dtAberturaCaixa: string | null
  dtFechamentoCaixa: string | null
  totalMinutosCaixa: number | null
  dataHoraCadastroCliente: string | null
  tempoCadastroCliente: number | null
  codigoCliente: number | null
  nomeCliente: string | null
  cpfCliente: string | null
  genero: string | null
  dataNascimento: string | null
  profissao: string | null
  ufCliente: string | null
  cidadeCliente: string | null
  complementoCliente: string | null
  classeSocial: string | null
  logradouroCliente: string | null
  nrLogradouroCliente: string | null
  celular: string | null
  telefone: string | null
  emailCliente: string | null
  cepCliente: string | null
  rg: string | null
  filhoNome1: string | null
  filhoDtNascimento1: string | null
  filhoTpSexo1: string | null
  filhoNome2: string | null
  filhoDtNascimento2: string | null
  filhoTpSexo2: string | null
  filhoNome3: string | null
  filhoDtNascimento3: string | null
  filhoTpSexo3: string | null
  codigoCarrinho: number | null
  descricaoCarrinho: string | null
  tipoCarrinho: string | null
  codigoLocacao: number
  horaSaida: string | null
  horaChegada: string | null
  tempoMinutos: number | null
  tempoHoras: string | null
  formaPagamento: string | null
  valorTotal: number | null
  desconto: number | null
  valorRecebido: number | null
  usuarioEntrega: string | null
  usuarioDevolucao: string | null
  localAtendimento: string | null
  observacao: string | null
}

export interface HistoricoLocacaoSimplificado {
  dataEntrega: string
  mes: string | null
  ano: number | null
  diaSemana: string | null
  dia: number | null
  codigoCliente: number | null
  nomeCliente: string | null
  ufCliente: string | null
  cidadeCliente: string | null
  classeSocial: string | null
  genero: string | null
  tipoCarrinho: string | null
  codigoLocacao: number
  horaSaida: string | null
  horaChegada: string | null
  tempoMinutos: number | null
  formaPagamento: string | null
  valorTotal: number | null
}

/** Uma linha do "Histórico de Locações" do legado: a ocupação de um caixa. As colunas já vêm formatadas. */
export interface HistoricoOcupacao {
  descricaoCarrinho: string
  tipoCarrinho: string
  nrDiaAno: string
  nrSemanaAno: string
  diaSemana: string
  data: string
  horaAbertura: string
  horaFechamento: string
  minutosDisponiveis: string
  minutosUtilizados: string
  minutosOciosos: string
  pcTempoUtilizado: string
  quantidade: string
  vlFaturado: string
  tempoMedio: string
  valorMedio: string
  /** As 17 faixas de hora, de 08:01–09:00 a 00:01–01:00. */
  faixas: string[]
  totalManha: string
  totalTarde: string
  totalNoite: string
  // Valores numéricos para os indicadores e o gráfico.
  dataAbertura: string
  quantidadeLocacoes: number
  valorFaturado: number
  minutosDisponiveisValor: number
  minutosUtilizadosValor: number
}

export interface UsuarioFiltro {
  id: number
  nome: string
}
