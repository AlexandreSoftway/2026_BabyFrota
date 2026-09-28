import type { ColunaExportacao, GrupoCabecalho, ValorExportavel } from '@/lib/export'
import type {
  ClienteRelatorio,
  HistoricoLocacaoDetalhado,
  HistoricoLocacaoSimplificado,
  HistoricoOcupacao,
} from './types'

/**
 * Colunas dos relatórios, copiadas dos RDLC do legado: mesmos títulos (inclusive os erros de digitação deles, como
 * "UFCliente" e "LOCAÇÂO", para a saída ser a mesma), mesma ordem, mesmas faixas de grupo e mesmos formatos.
 * "\n" separa as duas linhas de cabeçalho que os RDLC do histórico têm.
 */
export interface ColunaRelatorio<T> extends ColunaExportacao {
  valor: (linha: T) => ValorExportavel
}

// ---------- Datas, nos formatos dos RDLC ----------

function partes(iso: string | null | undefined) {
  // Lido do texto, sem passar por Date: a data vem sem fuso e não pode "andar" uma hora.
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/)
  return m ? { ano: m[1], mes: m[2], dia: m[3], hora: m[4] ?? '00', minuto: m[5] ?? '00', segundo: m[6] ?? '00' } : null
}

/** Formato "yyyy-MM-dd". */
function dataAaaaMmDd(iso: string | null) {
  const p = partes(iso)
  return p ? `${p.ano}-${p.mes}-${p.dia}` : null
}

/** Formato "dd-MM-yyyy". */
function dataDdMmAaaa(iso: string | null) {
  const p = partes(iso)
  return p ? `${p.dia}-${p.mes}-${p.ano}` : null
}

/** Formato "g" em pt-BR (dd/MM/yyyy HH:mm). */
function dataHoraCurta(iso: string | null) {
  const p = partes(iso)
  return p ? `${p.dia}/${p.mes}/${p.ano} ${p.hora}:${p.minuto}` : null
}

/** Data sem formato no RDLC: o padrão do .NET em pt-BR (dd/MM/yyyy HH:mm:ss). */
function dataHoraCompleta(iso: string | null) {
  const p = partes(iso)
  return p ? `${p.dia}/${p.mes}/${p.ano} ${p.hora}:${p.minuto}:${p.segundo}` : null
}

/** "dd/MM/yyyy" — para os filtros impressos no relatório. */
export function dataCurta(iso: string | null | undefined) {
  const p = partes(iso)
  return p ? `${p.dia}/${p.mes}/${p.ano}` : ''
}

// ---------- Relatório de Clientes (RelatorioClientes.rdlc) ----------

export const colunasClientes: ColunaRelatorio<ClienteRelatorio>[] = [
  { cabecalho: 'Código', valor: (c) => c.codigoCliente, tipo: 'inteiro' },
  { cabecalho: 'Nome', valor: (c) => c.nomeCliente },
  { cabecalho: 'Dt Nasc', valor: (c) => dataAaaaMmDd(c.dataNascimento) },
  { cabecalho: 'UFCliente', valor: (c) => c.ufCliente },
  { cabecalho: 'Cidade', valor: (c) => c.cidadeCliente },
  { cabecalho: 'Complemento', valor: (c) => c.complementoCliente },
  { cabecalho: 'Logradouro Cliente', valor: (c) => c.logradouroCliente },
  { cabecalho: 'Gênero', valor: (c) => c.genero },
  { cabecalho: 'CS', valor: (c) => c.classeSocial },
  { cabecalho: 'Data Cadastro', valor: (c) => dataAaaaMmDd(c.dataCadastro) },
  { cabecalho: 'Data Penultima Locação', valor: (c) => dataDdMmAaaa(c.dataPenultimaLocacao) },
  { cabecalho: 'Data Ult Locação', valor: (c) => dataDdMmAaaa(c.dataUltimaLocacao) },
  { cabecalho: 'Tipo de Carrinho locado pela 1ª vez', valor: (c) => c.primeiroTipoCarrinhoLocado },
  { cabecalho: 'Celular', valor: (c) => c.celular },
  { cabecalho: 'Email', valor: (c) => c.emailCliente },
  { cabecalho: 'Nome Filho 1', valor: (c) => c.filhoNome1 },
  { cabecalho: 'Dt Nasc', valor: (c) => dataAaaaMmDd(c.filhoDtNascimento1) },
  { cabecalho: 'Gênero', valor: (c) => c.filhoTpSexo1 },
  { cabecalho: 'Nome Filho 2', valor: (c) => c.filhoNome2 },
  { cabecalho: 'Dt Nasc', valor: (c) => dataAaaaMmDd(c.filhoDtNascimento2) },
  { cabecalho: 'Gênero', valor: (c) => c.filhoTpSexo2 },
  { cabecalho: 'Nome Filho 3', valor: (c) => c.filhoNome3 },
  { cabecalho: 'Dt Nasc', valor: (c) => dataAaaaMmDd(c.filhoDtNascimento3) },
  { cabecalho: 'Gênero', valor: (c) => c.filhoTpSexo3 },
  { cabecalho: 'Qtd Locações', valor: (c) => c.qtdLocacoes, tipo: 'inteiro' },
  { cabecalho: 'Tempo Total', valor: (c) => c.tempoTotal, tipo: 'inteiro' },
  { cabecalho: 'Total Gasto', valor: (c) => c.totalGasto, tipo: 'moeda' },
  { cabecalho: 'Observação', valor: (c) => c.observacao },
]

// ---------- Histórico Detalhado (HistoricoLocacoesDetalhado.rdlc) ----------

// O legado não estendeu a faixa "DADOS DO CLIENTE" quando incluiu o Filho 3: as 3 colunas dele ficam sem título.
export const gruposDetalhado: GrupoCabecalho[] = [
  { titulo: 'DADOS DO DIA', colunas: 6 },
  { titulo: 'DADOS DA ABERTURA DO DIA', colunas: 4 },
  { titulo: 'DADOS DO CLIENTE', colunas: 25 },
  { titulo: '', colunas: 3 },
  { titulo: 'DADOS DO CARRINHO', colunas: 3 },
  { titulo: 'DADOS DA LOCAÇÂO', colunas: 5 },
  { titulo: 'DADOS FINANCEIROS', colunas: 4 },
  { titulo: 'DADOS OPERACIONAIS', colunas: 4 },
]

export const colunasDetalhado: ColunaRelatorio<HistoricoLocacaoDetalhado>[] = [
  { cabecalho: 'Semana\nNº', valor: (l) => l.nrSemana, tipo: 'inteiro' },
  { cabecalho: 'Dia\nNº', valor: (l) => l.nrDia, tipo: 'inteiro' },
  { cabecalho: 'Mês', valor: (l) => l.mes },
  { cabecalho: 'Ano', valor: (l) => l.ano, tipo: 'inteiro' },
  { cabecalho: 'Data\nSemana', valor: (l) => l.diaSemana },
  { cabecalho: 'Data\nDia', valor: (l) => l.dia, tipo: 'inteiro' },
  { cabecalho: 'Número\nCaixa', valor: (l) => l.numeroCaixa, tipo: 'inteiro' },
  { cabecalho: 'Data/Hora\nAbertura', valor: (l) => dataHoraCurta(l.dtAberturaCaixa) },
  { cabecalho: 'Data/Hora\nFechamento', valor: (l) => dataHoraCurta(l.dtFechamentoCaixa) },
  { cabecalho: 'Total\nMinutos', valor: (l) => l.totalMinutosCaixa, tipo: 'inteiro' },
  { cabecalho: 'Data/Hora\nCadastro', valor: (l) => dataHoraCurta(l.dataHoraCadastroCliente) },
  { cabecalho: 'Tempo\nCadastro', valor: (l) => l.tempoCadastroCliente, tipo: 'inteiro' },
  { cabecalho: 'Código', valor: (l) => l.codigoCliente, tipo: 'inteiro' },
  { cabecalho: 'Nome', valor: (l) => l.nomeCliente },
  { cabecalho: 'CPF', valor: (l) => l.cpfCliente },
  { cabecalho: 'Gênero', valor: (l) => l.genero },
  { cabecalho: 'Data\nNascimento', valor: (l) => dataHoraCompleta(l.dataNascimento) },
  { cabecalho: 'Profissão', valor: (l) => l.profissao },
  { cabecalho: 'UF', valor: (l) => l.ufCliente },
  { cabecalho: 'Cidade', valor: (l) => l.cidadeCliente },
  { cabecalho: 'Complemento', valor: (l) => l.complementoCliente },
  { cabecalho: 'CS', valor: (l) => l.classeSocial },
  { cabecalho: 'Logradouro', valor: (l) => l.logradouroCliente },
  { cabecalho: 'Número', valor: (l) => l.nrLogradouroCliente },
  { cabecalho: 'Celular', valor: (l) => l.celular },
  { cabecalho: 'Telefone', valor: (l) => l.telefone },
  { cabecalho: 'Email', valor: (l) => l.emailCliente },
  { cabecalho: 'CEP', valor: (l) => l.cepCliente },
  { cabecalho: 'RG', valor: (l) => l.rg },
  { cabecalho: 'Filho 1\nNome', valor: (l) => l.filhoNome1 },
  { cabecalho: 'Filho 1\nData Nascimento', valor: (l) => l.filhoDtNascimento1 },
  { cabecalho: 'Filho 1\nGênero', valor: (l) => l.filhoTpSexo1 },
  { cabecalho: 'Filho 2\nNome', valor: (l) => l.filhoNome2 },
  { cabecalho: 'Filho 2\nData Nascimento', valor: (l) => l.filhoDtNascimento2 },
  { cabecalho: 'Filho 2\nGênero', valor: (l) => l.filhoTpSexo2 },
  { cabecalho: 'Filho 3\nNome', valor: (l) => l.filhoNome3 },
  { cabecalho: 'Filho 3\nData Nascimento', valor: (l) => l.filhoDtNascimento3 },
  { cabecalho: 'Filho 3\nGênero', valor: (l) => l.filhoTpSexo3 },
  { cabecalho: 'Carrinho\nCódigo', valor: (l) => l.codigoCarrinho, tipo: 'inteiro' },
  { cabecalho: 'Carrinho\nDescrição', valor: (l) => l.descricaoCarrinho },
  { cabecalho: 'Carrinho\nTipo', valor: (l) => l.tipoCarrinho },
  { cabecalho: 'Locação\nNúmero', valor: (l) => l.codigoLocacao, tipo: 'inteiro' },
  { cabecalho: 'Hora\nSaída', valor: (l) => l.horaSaida },
  { cabecalho: 'Hora\nChegada', valor: (l) => l.horaChegada },
  { cabecalho: 'Tempo de Uso\nMinutos', valor: (l) => l.tempoMinutos, tipo: 'decimal' },
  { cabecalho: 'Tempo de Uso\nHoras', valor: (l) => l.tempoHoras },
  { cabecalho: 'Forma\nPagamento', valor: (l) => l.formaPagamento },
  { cabecalho: 'Valor\nTotal', valor: (l) => l.valorTotal, tipo: 'decimal' },
  { cabecalho: 'Desconto', valor: (l) => l.desconto, tipo: 'decimal' },
  { cabecalho: 'Valor\nRecebido', valor: (l) => l.valorRecebido, tipo: 'decimal' },
  { cabecalho: 'Usuário\nEntrega', valor: (l) => l.usuarioEntrega },
  { cabecalho: 'Usuário\nDevolução', valor: (l) => l.usuarioDevolucao },
  { cabecalho: 'Local\nAtendimento', valor: (l) => l.localAtendimento },
  { cabecalho: 'Observação', valor: (l) => l.observacao },
]

// ---------- Histórico Simplificado (HistoricoLocacoesSimplificado.rdlc) ----------

export const gruposSimplificado: GrupoCabecalho[] = [
  { titulo: 'DADOS DO DIA', colunas: 4 },
  { titulo: 'DADOS DO CLIENTE', colunas: 6 },
  { titulo: 'DADOS DO CARRINHO', colunas: 1 },
  { titulo: 'DADOS DA LOCAÇÂO', colunas: 4 },
  { titulo: 'DADOS FINANCEIROS', colunas: 2 },
]

export const colunasSimplificado: ColunaRelatorio<HistoricoLocacaoSimplificado>[] = [
  { cabecalho: 'Mês', valor: (l) => l.mes },
  { cabecalho: 'Ano', valor: (l) => l.ano, tipo: 'inteiro' },
  { cabecalho: 'Data\nSemana', valor: (l) => l.diaSemana },
  { cabecalho: 'Data\nDia', valor: (l) => l.dia, tipo: 'inteiro' },
  { cabecalho: 'Código', valor: (l) => l.codigoCliente, tipo: 'inteiro' },
  { cabecalho: 'Nome', valor: (l) => l.nomeCliente },
  { cabecalho: 'UF', valor: (l) => l.ufCliente },
  { cabecalho: 'Cidade', valor: (l) => l.cidadeCliente },
  { cabecalho: 'CS', valor: (l) => l.classeSocial },
  { cabecalho: 'Gênero', valor: (l) => l.genero },
  { cabecalho: 'Tipo', valor: (l) => l.tipoCarrinho },
  { cabecalho: 'Locação\nNúmero', valor: (l) => l.codigoLocacao, tipo: 'inteiro' },
  { cabecalho: 'Hora\nSaída', valor: (l) => l.horaSaida },
  { cabecalho: 'Hora\nChegada', valor: (l) => l.horaChegada },
  { cabecalho: 'Tempo de Uso\nMinutos', valor: (l) => l.tempoMinutos, tipo: 'decimal' },
  { cabecalho: 'Forma\nPagamento', valor: (l) => l.formaPagamento },
  { cabecalho: 'Valor\nTotal', valor: (l) => l.valorTotal, tipo: 'decimal' },
]

// ---------- Histórico de Locações / ocupação por dia (HistLocacoes.rdlc) ----------

const FAIXAS_DE_HORA = [
  '08:01 às 09:00', '09:01 às 10:00', '10:01 às 11:00', '11:01 às 12:00',
  '12:01 às 13:00', '13:01 às 14:00', '14:01 às 15:00', '15:01 às 16:00', '16:01 às 17:00', '17:01 às 18:00',
  '18:01 às19:00', '19:01 às 20:00', '20:01 às 21:00', '21:01 às 22:00', '22:01 às 23:00', '23:01 às 00:00', '00:01 às 01:00',
]

export const gruposOcupacao: GrupoCabecalho[] = [
  { titulo: '', colunas: 16 },
  { titulo: 'Manhã', colunas: 4 },
  { titulo: 'Tarde', colunas: 6 },
  { titulo: 'Noite', colunas: 7 },
  { titulo: 'Total do Periodo', colunas: 3 },
]

// Os valores já vêm formatados do servidor, como o legado montava (texto), então não têm tipo numérico.
export const colunasOcupacao: ColunaRelatorio<HistoricoOcupacao>[] = [
  { cabecalho: 'Descrição', valor: (o) => o.descricaoCarrinho },
  { cabecalho: 'Tipo', valor: (o) => o.tipoCarrinho },
  { cabecalho: 'Nº Dia do Ano', valor: (o) => o.nrDiaAno },
  { cabecalho: 'Nº Semana do Ano', valor: (o) => o.nrSemanaAno },
  { cabecalho: 'Dia da Semana', valor: (o) => o.diaSemana },
  { cabecalho: 'Data (AAMMDD)', valor: (o) => o.data },
  { cabecalho: 'Hora Abertura', valor: (o) => o.horaAbertura },
  { cabecalho: 'Hora Fechamento', valor: (o) => o.horaFechamento },
  { cabecalho: 'Minutos Disponíveis', valor: (o) => o.minutosDisponiveis },
  { cabecalho: 'Minutos Utilizados', valor: (o) => o.minutosUtilizados },
  { cabecalho: 'Minutos Ociosos', valor: (o) => o.minutosOciosos },
  { cabecalho: 'Tempo Utilizado (%)', valor: (o) => o.pcTempoUtilizado },
  { cabecalho: 'Quantidade Locações', valor: (o) => o.quantidade },
  { cabecalho: 'Valor Faturado', valor: (o) => o.vlFaturado },
  { cabecalho: 'Tempo Médio Locação', valor: (o) => o.tempoMedio },
  { cabecalho: 'Valor Médio Locações', valor: (o) => o.valorMedio },
  ...FAIXAS_DE_HORA.map((cabecalho, i): ColunaRelatorio<HistoricoOcupacao> => ({ cabecalho, valor: (o) => o.faixas[i] })),
  { cabecalho: 'Manhã', valor: (o) => o.totalManha },
  { cabecalho: 'Tarde', valor: (o) => o.totalTarde },
  { cabecalho: 'Noite', valor: (o) => o.totalNoite },
]
