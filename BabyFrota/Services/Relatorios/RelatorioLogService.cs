using System.Data;
using System.Data.Common;
using System.Xml;
using System.Xml.Linq;
using BabyFrota.Data;
using BabyFrota.Data.Auditoria;
using BabyFrota.DTOs.Relatorios;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace BabyFrota.Services.Relatorios;

public class RelatorioLogService : IRelatorioLogService
{
    /// <summary>
    /// Um mês de log dá uns 10 mil registros. Acima deste limite o relatório vem cortado e a tela pede um período menor,
    /// em vez de mandar centenas de milhares de linhas ao navegador.
    /// </summary>
    public const int LimiteLinhas = 50_000;

    private const int TempoLimiteSegundos = 60;

    public static readonly string[] Acoes =
        [AuditoriaInterceptor.AcaoInsercao, AuditoriaInterceptor.AcaoAtualizacao, AuditoriaInterceptor.AcaoExclusao, "Login"];

    private static readonly XNamespace Xsi = "http://www.w3.org/2001/XMLSchema-instance";

    /// <summary>
    /// TBLog tem só a chave primária (CDLog) e passa de 4 GB, então filtrar pela data leria a tabela inteira. Mas a data
    /// acompanha o código: o log é gravado na hora, e a maior inversão no banco é de 1 hora (a troca do horário de verão
    /// de 2018). Então duas buscas binárias pelo código acham o trecho do período (uns 40 acessos pela chave, em
    /// milissegundos), com 1 dia de folga de cada lado, e a data filtra o resto. Sem índice novo, e sem custo nenhum a mais
    /// para as gravações do legado e do sistema novo.
    /// </summary>
    private const string ConsultaSql = """
        SET NOCOUNT ON;

        DECLARE @primeiro int, @ultimo int, @lo int, @hi int, @meio int, @data datetime, @de int, @ate int;
        DECLARE @inicioComFolga datetime = DATEADD(DAY, -1, @inicio), @fimComFolga datetime = DATEADD(DAY, 1, @fim);

        SELECT TOP (1) @primeiro = CDLog FROM dbo.TBLog ORDER BY CDLog;
        SELECT TOP (1) @ultimo = CDLog FROM dbo.TBLog ORDER BY CDLog DESC;

        -- Primeiro código gravado a partir de um dia antes do início.
        SELECT @lo = @primeiro, @hi = @ultimo + 1;
        WHILE @lo < @hi
        BEGIN
            SET @meio = @lo + (@hi - @lo) / 2;
            SELECT TOP (1) @data = Data FROM dbo.TBLog WHERE CDLog >= @meio ORDER BY CDLog;
            IF @data >= @inicioComFolga SET @hi = @meio; ELSE SET @lo = @meio + 1;
        END;
        SET @de = @lo;

        -- Primeiro código gravado um dia depois do fim (fica de fora).
        SET @hi = @ultimo + 1;
        WHILE @lo < @hi
        BEGIN
            SET @meio = @lo + (@hi - @lo) / 2;
            SELECT TOP (1) @data = Data FROM dbo.TBLog WHERE CDLog >= @meio ORDER BY CDLog;
            IF @data >= @fimComFolga SET @hi = @meio; ELSE SET @lo = @meio + 1;
        END;
        SET @ate = @lo;

        SELECT TOP (@limite) l.CDLog, l.Acao, l.Data, l.Tabela, u.Nome, l.IP, l.ColunasModificadas
        FROM dbo.TBLog l
        LEFT JOIN dbo.Usuario u ON u.CDUsuario = l.CDUsuario
        WHERE l.CDLog >= @de AND l.CDLog < @ate
          AND l.Data >= @inicio AND l.Data < @fim
          AND (@usuario = 0 OR l.CDUsuario = @usuario)
          AND (@tabela = '' OR l.Tabela = @tabela)
          AND (@acao = '' OR l.Acao = @acao)
        ORDER BY l.CDLog;
        """;

    private readonly AppDbContext _db;

    public RelatorioLogService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<RelatorioLogResultado> ListarAsync(RelatorioLogFiltro filtro, CancellationToken ct = default)
    {
        if (filtro.DataInicio is null || filtro.DataFinal is null)
            throw new InvalidOperationException("Informe a data inicial e a data final.");

        var inicio = filtro.DataInicio.Value.Date;
        // O dia final inteiro (o legado ia até o último milissegundo do dia).
        var fim = filtro.DataFinal.Value.Date.AddDays(1);
        if (inicio >= fim)
            throw new InvalidOperationException("A data inicial não pode ser depois da data final.");

        var acao = filtro.Acao?.Trim() ?? string.Empty;
        if (acao.Length > 0 && !Acoes.Contains(acao))
            throw new ArgumentException("Ação inválida.");

        var conexao = _db.Database.GetDbConnection();
        await _db.Database.OpenConnectionAsync(ct);
        try
        {
            await using var comando = conexao.CreateCommand();
            comando.CommandText = ConsultaSql;
            comando.CommandTimeout = TempoLimiteSegundos;
            comando.Transaction = _db.Database.CurrentTransaction?.GetDbTransaction();
            Parametro(comando, "@inicio", DbType.DateTime, inicio);
            Parametro(comando, "@fim", DbType.DateTime, fim);
            Parametro(comando, "@usuario", DbType.Int32, filtro.UsuarioId ?? 0);
            Parametro(comando, "@tabela", DbType.String, filtro.Tabela?.Trim() ?? string.Empty);
            Parametro(comando, "@acao", DbType.String, acao);
            Parametro(comando, "@limite", DbType.Int32, LimiteLinhas + 1);

            var itens = new List<LogRelatorioDto>();
            await using var reader = await comando.ExecuteReaderAsync(ct);
            while (await reader.ReadAsync(ct))
            {
                itens.Add(new LogRelatorioDto
                {
                    Id = reader.GetInt32(0),
                    Acao = reader.GetString(1),
                    Data = reader.GetDateTime(2),
                    Tabela = reader.GetString(3),
                    Usuario = reader.IsDBNull(4) ? null : reader.GetString(4),
                    Ip = reader.GetString(5),
                    Colunas = reader.IsDBNull(6) ? null : reader.GetString(6),
                });
            }

            var truncado = itens.Count > LimiteLinhas;
            if (truncado)
                itens.RemoveAt(itens.Count - 1);

            return new RelatorioLogResultado { Itens = itens, Truncado = truncado, Limite = LimiteLinhas };
        }
        finally
        {
            await _db.Database.CloseConnectionAsync();
        }
    }

    public async Task<LogDetalheDto?> ObterAsync(int id, CancellationToken ct = default)
    {
        var log = await _db.LogsAuditoria
            .AsNoTracking()
            .Where(l => l.Cdlog == id)
            .Select(l => new
            {
                l.Cdlog,
                l.Acao,
                l.Data,
                l.Tabela,
                Usuario = l.CdusuarioNavigation != null ? l.CdusuarioNavigation.Nome : null,
                l.Ip,
                l.ColunasModificadas,
                l.ValorAntigo,
                l.ValorNovo,
            })
            .FirstOrDefaultAsync(ct);

        if (log is null)
            return null;

        var detalhe = new LogDetalheDto
        {
            Id = log.Cdlog,
            Acao = log.Acao,
            Data = log.Data,
            Tabela = log.Tabela,
            Usuario = log.Usuario,
            Ip = log.Ip,
        };

        var antes = LerCampos(log.ValorAntigo);
        var depois = LerCampos(log.ValorNovo);
        if (antes is null || depois is null)
        {
            detalhe.TextoAntigo = log.ValorAntigo;
            detalhe.TextoNovo = log.ValorNovo;
            return detalhe;
        }

        var ehAtualizacao = antes.Count > 0 && depois.Count > 0;
        var valoresAntes = PorColuna(antes);
        var valoresDepois = PorColuna(depois);
        foreach (var coluna in antes.Concat(depois).Select(c => c.Coluna).Distinct())
        {
            var temAntes = valoresAntes.TryGetValue(coluna, out var valorAntes);
            var temDepois = valoresDepois.TryGetValue(coluna, out var valorDepois);
            detalhe.Campos.Add(new LogCampoDto
            {
                Coluna = coluna,
                Antes = valorAntes,
                Depois = valorDepois,
                Alterado = ehAtualizacao && temAntes && temDepois && valorAntes != valorDepois,
            });
        }

        // Foto e documento entram em "colunas modificadas", mas o conteúdo não é guardado no log (nem no legado).
        var semValorNoLog = (log.ColunasModificadas ?? string.Empty)
            .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(coluna => !valoresAntes.ContainsKey(coluna) && !valoresDepois.ContainsKey(coluna))
            .Distinct();
        foreach (var coluna in semValorNoLog)
            detalhe.Campos.Add(new LogCampoDto { Coluna = coluna, Alterado = true });

        return detalhe;
    }

    public List<string> ListarTabelas()
        => _db.Model.GetEntityTypes()
            .Where(t => t.FindPrimaryKey() is not null && t.GetViewName() is null)
            .Select(t => t.GetTableName())
            .OfType<string>()
            .Where(tabela => tabela != "TBLog")
            .Distinct()
            .Order(StringComparer.OrdinalIgnoreCase)
            .ToList();

    /// <summary>
    /// Colunas do XML de TBLog: as do sistema novo e as do legado (XmlSerializer do EF6). Do legado ficam de fora os
    /// elementos do próprio EF (EntityKey e as "...Reference"). Nulo se o texto não for XML.
    /// </summary>
    private static List<(string Coluna, string? Valor)>? LerCampos(string? xml)
    {
        if (string.IsNullOrWhiteSpace(xml))
            return [];

        try
        {
            return XElement.Parse(xml).Elements()
                .Where(e => !e.HasElements && e.Name.LocalName != "EntityKey" && !e.Name.LocalName.EndsWith("Reference", StringComparison.Ordinal))
                .Select(e => (e.Name.LocalName, (string?)e.Attribute(Xsi + "nil") == "true" ? null : (string?)e.Value))
                .ToList();
        }
        catch (XmlException)
        {
            return null;
        }
    }

    private static Dictionary<string, string?> PorColuna(List<(string Coluna, string? Valor)> campos)
    {
        var valores = new Dictionary<string, string?>(StringComparer.Ordinal);
        foreach (var (coluna, valor) in campos)
            valores.TryAdd(coluna, valor);
        return valores;
    }

    private static void Parametro(DbCommand comando, string nome, DbType tipo, object valor)
    {
        var parametro = comando.CreateParameter();
        parametro.ParameterName = nome;
        parametro.DbType = tipo;
        parametro.Value = valor;
        comando.Parameters.Add(parametro);
    }
}
