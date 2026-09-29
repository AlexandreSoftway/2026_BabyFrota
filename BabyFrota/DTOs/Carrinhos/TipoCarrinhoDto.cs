namespace BabyFrota.DTOs.Carrinhos;

public class TipoCarrinhoDto
{
    public int Id { get; set; }
    public string Descricao { get; set; } = string.Empty;
    public int QuantidadeCarrinhos { get; set; }
    public int QuantidadeFaixas { get; set; }
}

public class TipoCarrinhoUpsertRequest
{
    public string Descricao { get; set; } = string.Empty;
}

/// <summary>Faixa de preço por tempo de uso de um tipo de carrinho (tabela PrecoLocacao).</summary>
public class PrecoLocacaoDto
{
    public int Id { get; set; }
    public int TipoCarrinhoId { get; set; }
    public int MinimoMinutos { get; set; }
    public int MaximoMinutos { get; set; }
    public decimal Valor { get; set; }
}

public class PrecoLocacaoUpsertRequest
{
    public int MinimoMinutos { get; set; }
    public int MaximoMinutos { get; set; }
    public decimal Valor { get; set; }
}
