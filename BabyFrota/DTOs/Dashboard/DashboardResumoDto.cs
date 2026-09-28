namespace BabyFrota.DTOs.Dashboard;

/// <summary>
/// KPIs da home. A frota e o caixa atual são o momento presente; o resto vale para o período escolhido.
/// </summary>
public class DashboardResumoDto
{
    // Agora (não dependem do período)
    public int TotalCarrinhos { get; set; }
    public int CarrinhosDisponiveis { get; set; }
    public int CarrinhosAlugados { get; set; }
    public double PercentualOcupacao { get; set; }

    public bool CaixaAberto { get; set; }
    public decimal? FaturamentoCaixaAtual { get; set; }

    // Período (datas inclusivas)
    public DateTime DataInicio { get; set; }
    public DateTime DataFim { get; set; }

    /// <summary>Locações entregues (saídas de carrinho) no período.</summary>
    public int LocacoesEntregues { get; set; }

    /// <summary>Locações devolvidas no período: é na devolução que o valor é cobrado.</summary>
    public int LocacoesDevolvidas { get; set; }

    /// <summary>Soma do valor das locações devolvidas no período.</summary>
    public decimal Faturamento { get; set; }

    public decimal TicketMedio { get; set; }

    /// <summary>Carrinhos com mais locações entregues no período.</summary>
    public List<CarrinhoMaisLocadoDto> TopCarrinhos { get; set; } = new();
}

public class CarrinhoMaisLocadoDto
{
    public string Descricao { get; set; } = string.Empty;
    public int QuantidadeLocacoes { get; set; }
}
