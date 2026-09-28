using System.Data.Common;
using System.Data.SqlTypes;
using System.Globalization;
using BabyFrota.DTOs.Relatorios;

namespace BabyFrota.Services.Relatorios;

/// <summary>
/// Lê as colunas pelo nome, sem diferenciar maiúsculas ("dtentrega", "UFCliente"...). A procedure no banco é a do legado
/// e já foi alterada fora dos scripts do repositório; por isso uma coluna que falte vira nulo, em vez de derrubar o relatório.
/// </summary>
internal sealed class LeitorDeColunas
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    private readonly DbDataReader _reader;
    private readonly Dictionary<string, int> _ordinais = new(StringComparer.OrdinalIgnoreCase);

    public LeitorDeColunas(DbDataReader reader)
    {
        _reader = reader;
        for (var i = 0; i < reader.FieldCount; i++)
            _ordinais.TryAdd(reader.GetName(i), i);
    }

    private bool TemValor(string coluna, out int ordinal)
        => _ordinais.TryGetValue(coluna, out ordinal) && !_reader.IsDBNull(ordinal);

    public string? Texto(string coluna)
        => TemValor(coluna, out var i) ? Convert.ToString(_reader.GetValue(i), PtBr) : null;

    public int? Inteiro(string coluna)
        => TemValor(coluna, out var i) ? Convert.ToInt32(_reader.GetValue(i), CultureInfo.InvariantCulture) : null;

    public DateTime? Data(string coluna)
    {
        if (!TemValor(coluna, out var i))
            return null;

        return _reader.GetValue(i) switch
        {
            DateTime data => data,
            string texto when DateTime.TryParse(texto, PtBr, DateTimeStyles.None, out var data) => data,
            _ => null,
        };
    }

    public decimal? Decimal(string coluna)
    {
        if (!TemValor(coluna, out var i))
            return null;

        try
        {
            return Convert.ToDecimal(_reader.GetValue(i), CultureInfo.InvariantCulture);
        }
        catch (OverflowException)
        {
            // TempoMinutos vem de uma divisão com muitas casas decimais; se não couber no decimal do .NET, arredonda.
            return SqlDecimal.Round((SqlDecimal)_reader.GetProviderSpecificValue(i), 10).Value;
        }
    }
}

/// <summary>Converte uma linha das procedures do legado nos DTOs, com os nomes de coluna delas.</summary>
internal static class LeituraProcedures
{
    /// <summary>Uma linha de SPRelatorioClientes.</summary>
    public static ClienteRelatorioDto Cliente(LeitorDeColunas c) => new()
    {
        CodigoCliente = c.Inteiro("CodigoCliente") ?? 0,
        NomeCliente = c.Texto("NomeCliente"),
        DataNascimento = c.Data("DataNascimento"),
        UfCliente = c.Texto("UFCliente"),
        CidadeCliente = c.Texto("CidadeCliente"),
        ComplementoCliente = c.Texto("ComplementoCliente"),
        LogradouroCliente = c.Texto("LogradouroCliente"),
        Genero = c.Texto("Genero"),
        ClasseSocial = c.Texto("CS"),
        DataCadastro = c.Data("DataCadastro"),
        DataPenultimaLocacao = c.Data("DataPenultimaLocacao"),
        DataUltimaLocacao = c.Data("DataUltimaLocacao"),
        PrimeiroTipoCarrinhoLocado = c.Texto("PrimeiroTipoCarrinhoLocado"),
        Celular = c.Texto("Celular"),
        EmailCliente = c.Texto("EmailCliente"),
        FilhoNome1 = c.Texto("FilhoNome1"),
        FilhoDtNascimento1 = c.Data("FilhoDTNascimento1"),
        FilhoTpSexo1 = c.Texto("FilhoTPSexo1"),
        FilhoNome2 = c.Texto("FilhoNome2"),
        FilhoDtNascimento2 = c.Data("FilhoDTNascimento2"),
        FilhoTpSexo2 = c.Texto("FilhoTPSexo2"),
        FilhoNome3 = c.Texto("FilhoNome3"),
        FilhoDtNascimento3 = c.Data("FilhoDTNascimento3"),
        FilhoTpSexo3 = c.Texto("FilhoTPSexo3"),
        QtdLocacoes = c.Inteiro("QtdLocacoes"),
        TempoTotal = c.Inteiro("TempoTotal"),
        TotalGasto = c.Decimal("TotalGasto"),
        Observacao = c.Texto("Observacao"),
    };

    /// <summary>Uma linha de SPHistoricoLocacoes.</summary>
    public static HistoricoLocacaoDetalhadoDto Locacao(LeitorDeColunas c) => new()
    {
        DataEntrega = c.Data("dtentrega") ?? default,
        NrSemana = c.Inteiro("NRSemana"),
        NrDia = c.Inteiro("NRDia"),
        Mes = c.Texto("Mes"),
        Ano = c.Inteiro("Ano"),
        DiaSemana = c.Texto("DiaSemana"),
        Dia = c.Inteiro("Dia"),
        NumeroCaixa = c.Inteiro("NumeroCaixa"),
        DtAberturaCaixa = c.Data("DTAberturaCaixa"),
        DtFechamentoCaixa = c.Data("DTFechamentoCaixa"),
        TotalMinutosCaixa = c.Inteiro("TotalMinutosCaixa"),
        DataHoraCadastroCliente = c.Data("DataHoraCadastroCliente"),
        TempoCadastroCliente = c.Inteiro("TempoCadastroCliente"),
        CodigoCliente = c.Inteiro("CodigoCliente"),
        NomeCliente = c.Texto("NomeCliente"),
        CpfCliente = c.Texto("CPFCliente"),
        Genero = c.Texto("Genero"),
        DataNascimento = c.Data("DataNascimento"),
        Profissao = c.Texto("Profissao"),
        UfCliente = c.Texto("UFCliente"),
        CidadeCliente = c.Texto("CidadeCliente"),
        ComplementoCliente = c.Texto("ComplementoCliente"),
        ClasseSocial = c.Texto("CS"),
        LogradouroCliente = c.Texto("LogradouroCliente"),
        NrLogradouroCliente = c.Texto("NRLogradouroCliente"),
        Celular = c.Texto("Celular"),
        Telefone = c.Texto("Telefone"),
        EmailCliente = c.Texto("EmailCliente"),
        CepCliente = c.Texto("CEPCliente"),
        Rg = c.Texto("RG"),
        FilhoNome1 = c.Texto("FilhoNome1"),
        FilhoDtNascimento1 = c.Texto("FilhoDTNascimento1"),
        FilhoTpSexo1 = c.Texto("FilhoTPSexo1"),
        FilhoNome2 = c.Texto("FilhoNome2"),
        FilhoDtNascimento2 = c.Texto("FilhoDTNascimento2"),
        FilhoTpSexo2 = c.Texto("FilhoTPSexo2"),
        FilhoNome3 = c.Texto("FilhoNome3"),
        FilhoDtNascimento3 = c.Texto("FilhoDTNascimento3"),
        FilhoTpSexo3 = c.Texto("FilhoTPSexo3"),
        CodigoCarrinho = c.Inteiro("CodigoCarrinho"),
        DescricaoCarrinho = c.Texto("DescricaoCarrinho"),
        TipoCarrinho = c.Texto("TipoCarrinho"),
        CodigoLocacao = c.Inteiro("CodigoLocacao") ?? 0,
        HoraSaida = c.Texto("HoraSaida"),
        HoraChegada = c.Texto("HoraChegada"),
        TempoMinutos = c.Decimal("TempoMinutos"),
        TempoHoras = c.Texto("TempoHoras"),
        FormaPagamento = c.Texto("FormaPagamento"),
        ValorTotal = c.Decimal("ValorTotal"),
        Desconto = c.Decimal("Desconto"),
        ValorRecebido = c.Decimal("ValorRecebido"),
        UsuarioEntrega = c.Texto("UsuarioEntrega"),
        UsuarioDevolucao = c.Texto("UsuarioDevolucao"),
        LocalAtendimento = c.Texto("LocalAtendimento"),
        Observacao = c.Texto("Observacao"),
    };

    public static HistoricoLocacaoSimplificadoDto Simplificado(HistoricoLocacaoDetalhadoDto d) => new()
    {
        DataEntrega = d.DataEntrega,
        Mes = d.Mes,
        Ano = d.Ano,
        DiaSemana = d.DiaSemana,
        Dia = d.Dia,
        CodigoCliente = d.CodigoCliente,
        NomeCliente = d.NomeCliente,
        UfCliente = d.UfCliente,
        CidadeCliente = d.CidadeCliente,
        ClasseSocial = d.ClasseSocial,
        Genero = d.Genero,
        TipoCarrinho = d.TipoCarrinho,
        CodigoLocacao = d.CodigoLocacao,
        HoraSaida = d.HoraSaida,
        HoraChegada = d.HoraChegada,
        TempoMinutos = d.TempoMinutos,
        FormaPagamento = d.FormaPagamento,
        ValorTotal = d.ValorTotal,
    };
}
