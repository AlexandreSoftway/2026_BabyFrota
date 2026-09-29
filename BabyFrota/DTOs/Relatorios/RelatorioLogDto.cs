namespace BabyFrota.DTOs.Relatorios;

/// <summary>
/// Filtros do Relatório de Log, os mesmos do legado (RelatorioLog.aspx): usuário, tabela, ação e período. Aqui as duas
/// datas são obrigatórias: o log tem mais de um milhão de linhas, e o legado sem datas lia a tabela inteira.
/// </summary>
public class RelatorioLogFiltro
{
    public int? UsuarioId { get; set; }
    public string? Tabela { get; set; }

    /// <summary>"Inserção", "Atualização", "Exclusão" ou "Login".</summary>
    public string? Acao { get; set; }

    public DateTime? DataInicio { get; set; }
    public DateTime? DataFinal { get; set; }
}

/// <summary>Uma linha do relatório, com as colunas do RelatorioLog.rdlc (Ação, Data, Tabela, Usuário, IP, Colunas).</summary>
public class LogRelatorioDto
{
    public int Id { get; set; }
    public string Acao { get; set; } = string.Empty;
    public DateTime Data { get; set; }
    public string Tabela { get; set; } = string.Empty;
    public string? Usuario { get; set; }
    public string Ip { get; set; } = string.Empty;
    public string? Colunas { get; set; }
}

public class RelatorioLogResultado
{
    public List<LogRelatorioDto> Itens { get; set; } = new();

    /// <summary>O período tinha mais linhas que <see cref="Limite"/>; vieram só as primeiras.</summary>
    public bool Truncado { get; set; }

    public int Limite { get; set; }
}

/// <summary>O registro antes e depois da gravação (ValorAntigo/ValorNovo de TBLog), coluna a coluna.</summary>
public class LogDetalheDto
{
    public int Id { get; set; }
    public string Acao { get; set; } = string.Empty;
    public DateTime Data { get; set; }
    public string Tabela { get; set; } = string.Empty;
    public string? Usuario { get; set; }
    public string Ip { get; set; } = string.Empty;
    public List<LogCampoDto> Campos { get; set; } = new();

    /// <summary>Só quando o XML gravado não pôde ser lido: o texto como está no banco.</summary>
    public string? TextoAntigo { get; set; }
    public string? TextoNovo { get; set; }
}

public class LogCampoDto
{
    public string Coluna { get; set; } = string.Empty;
    public string? Antes { get; set; }
    public string? Depois { get; set; }
    public bool Alterado { get; set; }
}
