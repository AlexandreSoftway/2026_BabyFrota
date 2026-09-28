namespace BabyFrota.DTOs.Bi;

// BI do sistema novo (o primeiro relatório de clientes e o histórico de locações, anteriores aos relatórios iguais aos
// do legado): consultas paginadas no servidor, com indicadores, busca na hora e filtros livres.

public class BiClientesFiltro
{
    public int Pagina { get; set; } = 1;
    public int TamanhoPagina { get; set; } = 10;
    public string? Nome { get; set; }
    public string? Cidade { get; set; }
    public string? Uf { get; set; }
    public DateTime? DataCadastroInicio { get; set; }
    public DateTime? DataCadastroFinal { get; set; }
    public DateTime? DataLocacaoInicio { get; set; }
    public DateTime? DataLocacaoFinal { get; set; }
}

public class BiClienteDto
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Cpf { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Cidade { get; set; }
    public string? Uf { get; set; }
    public string Telefone { get; set; } = string.Empty;
    public DateTime? DataCadastro { get; set; }
    public int QuantidadeLocacoes { get; set; }
    public int TempoTotalMinutos { get; set; }
    public decimal TotalGasto { get; set; }
    public DateTime? DataUltimaLocacao { get; set; }
    public string? PrimeiroTipoCarrinho { get; set; }
}

public class BiClientesResumoDto
{
    public int TotalClientes { get; set; }
    public int TotalLocacoes { get; set; }
    public decimal TotalGasto { get; set; }
    public decimal TicketMedioPorCliente { get; set; }
}

public class BiLocacoesFiltro
{
    public int Pagina { get; set; } = 1;
    public int TamanhoPagina { get; set; } = 10;
    public DateTime? DataEntregaInicio { get; set; }
    public DateTime? DataEntregaFinal { get; set; }
    public string? ClienteNome { get; set; }
    public int? CarrinhoId { get; set; }
    public int? TipoCarrinhoId { get; set; }
    public bool? SomenteEmAndamento { get; set; }
}

public class BiLocacaoDto
{
    public int Id { get; set; }
    public DateTime DataEntrega { get; set; }
    public DateTime? DataDevolucao { get; set; }
    public int ClienteId { get; set; }
    public string ClienteNome { get; set; } = string.Empty;
    public int CarrinhoId { get; set; }
    public string CarrinhoDescricao { get; set; } = string.Empty;
    public string TipoCarrinhoDescricao { get; set; } = string.Empty;
    public int? TempoMinutos { get; set; }
    public decimal? ValorTotal { get; set; }
    public decimal? Desconto { get; set; }
    public decimal? Troco { get; set; }
    public string FormaPagamento { get; set; } = string.Empty;
    public int QuantidadeParcelas { get; set; }
    public string UsuarioEntregaNome { get; set; } = string.Empty;
    public string? UsuarioDevolucaoNome { get; set; }
    public bool EmAndamento { get; set; }
}

public class BiLocacoesResumoDto
{
    public int TotalLocacoes { get; set; }
    public decimal Faturamento { get; set; }
    public decimal TicketMedio { get; set; }
    public double TempoMedioMinutos { get; set; }
}

public class BiFaturamentoPorDiaDto
{
    public DateTime Data { get; set; }
    public int Quantidade { get; set; }
    public decimal Faturamento { get; set; }
}
