namespace BabyFrota.DTOs.Relatorios;

// Os relatórios saem das mesmas stored procedures e do mesmo cálculo do legado, para os dados baterem com os
// relatórios RDLC (RelatorioClientes.rdlc, HistLocacoes.rdlc, HistoricoLocacoesDetalhado.rdlc e
// HistoricoLocacoesSimplificado.rdlc). Os nomes das propriedades seguem as colunas das procedures.

/// <summary>Filtros do Relatório de Clientes, iguais aos do legado (RelatorioClientes.aspx → SPRelatorioClientes).</summary>
public class RelatorioClientesFiltro
{
    public int? ClienteId { get; set; }
    /// <summary>Igualdade exata, sem diferenciar maiúsculas (como a procedure compara).</summary>
    public string? Cidade { get; set; }
    /// <summary>Igualdade exata, sem diferenciar maiúsculas (como a procedure compara).</summary>
    public string? Complemento { get; set; }
    public string? Uf { get; set; }
    public DateTime? DataCadastroInicio { get; set; }
    public DateTime? DataCadastroFinal { get; set; }
    public DateTime? DataLocacaoInicio { get; set; }
    public DateTime? DataLocacaoFinal { get; set; }
}

/// <summary>Uma linha de SPRelatorioClientes, com as colunas que o RelatorioClientes.rdlc mostra.</summary>
public class ClienteRelatorioDto
{
    public int CodigoCliente { get; set; }
    public string? NomeCliente { get; set; }
    public DateTime? DataNascimento { get; set; }
    public string? UfCliente { get; set; }
    public string? CidadeCliente { get; set; }
    public string? ComplementoCliente { get; set; }
    public string? LogradouroCliente { get; set; }
    public string? Genero { get; set; }
    /// <summary>Coluna "CS" do legado.</summary>
    public string? ClasseSocial { get; set; }
    public DateTime? DataCadastro { get; set; }
    public DateTime? DataPenultimaLocacao { get; set; }
    public DateTime? DataUltimaLocacao { get; set; }
    public string? PrimeiroTipoCarrinhoLocado { get; set; }
    public string? Celular { get; set; }
    public string? EmailCliente { get; set; }
    public string? FilhoNome1 { get; set; }
    public DateTime? FilhoDtNascimento1 { get; set; }
    public string? FilhoTpSexo1 { get; set; }
    public string? FilhoNome2 { get; set; }
    public DateTime? FilhoDtNascimento2 { get; set; }
    public string? FilhoTpSexo2 { get; set; }
    public string? FilhoNome3 { get; set; }
    public DateTime? FilhoDtNascimento3 { get; set; }
    public string? FilhoTpSexo3 { get; set; }
    public int? QtdLocacoes { get; set; }
    /// <summary>Soma da coluna Tempo das locações, em minutos.</summary>
    public int? TempoTotal { get; set; }
    public decimal? TotalGasto { get; set; }
    public string? Observacao { get; set; }
}

/// <summary>
/// Filtros dos três relatórios de histórico, iguais aos do legado (RelatorioHistoricoLocacoes/Detalhado/Simplificado.aspx).
/// As duas datas são obrigatórias. Com carrinho escolhido, o tipo é ignorado (o legado zerava o tipo).
/// </summary>
public class RelatorioHistoricoFiltro
{
    public DateTime? DataEntregaInicio { get; set; }
    public DateTime? DataEntregaFinal { get; set; }
    public int? ClienteId { get; set; }
    public int? CarrinhoId { get; set; }
    public int? TipoCarrinhoId { get; set; }
    public int? UsuarioEntregaId { get; set; }
    public int? UsuarioDevolucaoId { get; set; }
}

/// <summary>Uma linha de SPHistoricoLocacoes, com as 54 colunas do HistoricoLocacoesDetalhado.rdlc.</summary>
public class HistoricoLocacaoDetalhadoDto
{
    /// <summary>Data e hora da entrega (coluna "dtentrega"). Não é coluna do RDLC: serve aos indicadores e ao gráfico.</summary>
    public DateTime DataEntrega { get; set; }

    // Dados do dia
    public int? NrSemana { get; set; }
    public int? NrDia { get; set; }
    public string? Mes { get; set; }
    public int? Ano { get; set; }
    public string? DiaSemana { get; set; }
    public int? Dia { get; set; }

    // Dados da abertura do dia (caixa)
    public int? NumeroCaixa { get; set; }
    public DateTime? DtAberturaCaixa { get; set; }
    public DateTime? DtFechamentoCaixa { get; set; }
    public int? TotalMinutosCaixa { get; set; }

    // Dados do cliente
    public DateTime? DataHoraCadastroCliente { get; set; }
    /// <summary>Dias desde o cadastro do cliente.</summary>
    public int? TempoCadastroCliente { get; set; }
    public int? CodigoCliente { get; set; }
    public string? NomeCliente { get; set; }
    public string? CpfCliente { get; set; }
    public string? Genero { get; set; }
    public DateTime? DataNascimento { get; set; }
    public string? Profissao { get; set; }
    public string? UfCliente { get; set; }
    public string? CidadeCliente { get; set; }
    public string? ComplementoCliente { get; set; }
    /// <summary>Coluna "CS" do legado.</summary>
    public string? ClasseSocial { get; set; }
    public string? LogradouroCliente { get; set; }
    public string? NrLogradouroCliente { get; set; }
    public string? Celular { get; set; }
    public string? Telefone { get; set; }
    public string? EmailCliente { get; set; }
    public string? CepCliente { get; set; }
    public string? Rg { get; set; }
    // Na procedure a data de nascimento dos filhos já vem como texto (dd/mm/aaaa).
    public string? FilhoNome1 { get; set; }
    public string? FilhoDtNascimento1 { get; set; }
    public string? FilhoTpSexo1 { get; set; }
    public string? FilhoNome2 { get; set; }
    public string? FilhoDtNascimento2 { get; set; }
    public string? FilhoTpSexo2 { get; set; }
    public string? FilhoNome3 { get; set; }
    public string? FilhoDtNascimento3 { get; set; }
    public string? FilhoTpSexo3 { get; set; }

    // Dados do carrinho
    public int? CodigoCarrinho { get; set; }
    public string? DescricaoCarrinho { get; set; }
    public string? TipoCarrinho { get; set; }

    // Dados da locação
    public int CodigoLocacao { get; set; }
    public string? HoraSaida { get; set; }
    public string? HoraChegada { get; set; }
    /// <summary>Calculado pela procedure a partir das datas, com fração de minuto (não é a coluna Tempo gravada).</summary>
    public decimal? TempoMinutos { get; set; }
    public string? TempoHoras { get; set; }

    // Dados financeiros
    /// <summary>"Diversos" quando a locação tem mais de um pagamento.</summary>
    public string? FormaPagamento { get; set; }
    public decimal? ValorTotal { get; set; }
    public decimal? Desconto { get; set; }
    public decimal? ValorRecebido { get; set; }

    // Dados operacionais
    public string? UsuarioEntrega { get; set; }
    public string? UsuarioDevolucao { get; set; }
    public string? LocalAtendimento { get; set; }
    public string? Observacao { get; set; }
}

/// <summary>As 17 colunas do HistoricoLocacoesSimplificado.rdlc (mesma procedure do Detalhado).</summary>
public class HistoricoLocacaoSimplificadoDto
{
    /// <summary>Não é coluna do RDLC: serve aos indicadores e ao gráfico.</summary>
    public DateTime DataEntrega { get; set; }
    public string? Mes { get; set; }
    public int? Ano { get; set; }
    public string? DiaSemana { get; set; }
    public int? Dia { get; set; }
    public int? CodigoCliente { get; set; }
    public string? NomeCliente { get; set; }
    public string? UfCliente { get; set; }
    public string? CidadeCliente { get; set; }
    public string? ClasseSocial { get; set; }
    public string? Genero { get; set; }
    public string? TipoCarrinho { get; set; }
    public int CodigoLocacao { get; set; }
    public string? HoraSaida { get; set; }
    public string? HoraChegada { get; set; }
    public decimal? TempoMinutos { get; set; }
    public string? FormaPagamento { get; set; }
    public decimal? ValorTotal { get; set; }
}

/// <summary>
/// Uma linha do "Histórico de Locações" do legado (HistLocacoes.rdlc): a ocupação de um caixa (dia). As colunas vêm
/// como texto, formatadas como o legado formatava (pt-BR), porque o legado já as montava como texto.
/// </summary>
public class HistoricoOcupacaoDto
{
    public string DescricaoCarrinho { get; set; } = "-";
    public string TipoCarrinho { get; set; } = "-";
    public string NrDiaAno { get; set; } = string.Empty;
    public string NrSemanaAno { get; set; } = string.Empty;
    public string DiaSemana { get; set; } = string.Empty;
    /// <summary>AAMMDD.</summary>
    public string Data { get; set; } = string.Empty;
    public string HoraAbertura { get; set; } = string.Empty;
    public string HoraFechamento { get; set; } = string.Empty;
    public string MinutosDisponiveis { get; set; } = string.Empty;
    public string MinutosUtilizados { get; set; } = string.Empty;
    public string MinutosOciosos { get; set; } = string.Empty;
    public string PcTempoUtilizado { get; set; } = string.Empty;
    public string Quantidade { get; set; } = string.Empty;
    public string VlFaturado { get; set; } = string.Empty;
    public string TempoMedio { get; set; } = string.Empty;
    public string ValorMedio { get; set; } = string.Empty;

    /// <summary>
    /// As 17 faixas de hora (08:01–09:00 … 00:01–01:00), em HH:mm:ss, como o RDLC mostrava: a hora cheia menos os minutos
    /// usados na faixa (o tempo ocioso). "#Error" onde o RDLC dava erro (minutos usados acima da faixa).
    /// </summary>
    public List<string> Faixas { get; set; } = new();
    public string TotalManha { get; set; } = string.Empty;
    public string TotalTarde { get; set; } = string.Empty;
    public string TotalNoite { get; set; } = string.Empty;

    // Valores numéricos para os indicadores e o gráfico da tela. Não são colunas do legado.
    public DateTime DataAbertura { get; set; }
    public int QuantidadeLocacoes { get; set; }
    public decimal ValorFaturado { get; set; }
    public double MinutosDisponiveisValor { get; set; }
    public double MinutosUtilizadosValor { get; set; }
}

/// <summary>Usuário para os filtros "entregou" e "devolveu" dos relatórios.</summary>
public class UsuarioFiltroDto
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
}
