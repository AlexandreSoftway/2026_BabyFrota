using System.Globalization;
using System.Runtime.CompilerServices;
using System.Text;
using System.Xml;
using BabyFrota.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace BabyFrota.Data.Auditoria;

/// <summary>
/// Log de auditoria igual ao do legado (AuditLog.cs): cada inclusão, alteração e exclusão gravada pelo EF vira uma linha em
/// TBLog, com usuário, IP, data, tabela, colunas modificadas e o registro antes e depois em XML. As linhas entram no mesmo
/// SaveChanges (mesma transação e mesma ida ao banco), então nenhum fluxo muda e nenhuma gravação fica sem rastro.
/// </summary>
/// <remarks>
/// Como no legado: a ação é "Inserção", "Atualização" ou "Exclusão"; foto e documento (colunas binárias) não entram no XML,
/// só o nome da coluna em "colunas modificadas"; e o código gerado pelo banco numa inclusão sai 0, porque o log é gravado
/// junto com o registro, antes de o banco gerar o código. A senha sai como "***".
/// </remarks>
public sealed class AuditoriaInterceptor : SaveChangesInterceptor
{
    public const string AcaoInsercao = "Inserção";
    public const string AcaoAtualizacao = "Atualização";
    public const string AcaoExclusao = "Exclusão";

    private const string XsiNamespace = "http://www.w3.org/2001/XMLSchema-instance";
    private const string SenhaOculta = "***";

    private static readonly XmlWriterSettings ConfiguracaoXml = new() { OmitXmlDeclaration = true };

    private readonly IAuditoriaContexto? _contexto;

    // Linhas de log que este SaveChanges pôs no contexto. Se a gravação falhar elas saem de novo; senão, uma nova
    // tentativa com o mesmo contexto gravaria o log em dobro.
    private readonly ConditionalWeakTable<DbContext, List<LogAuditoria>> _pendentes = new();

    public AuditoriaInterceptor(IAuditoriaContexto? contexto = null)
    {
        _contexto = contexto;
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        Registrar(eventData.Context);
        return result;
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        Registrar(eventData.Context);
        return ValueTask.FromResult(result);
    }

    public override int SavedChanges(SaveChangesCompletedEventData eventData, int result)
    {
        Esquecer(eventData.Context);
        return result;
    }

    public override ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData, int result, CancellationToken cancellationToken = default)
    {
        Esquecer(eventData.Context);
        return ValueTask.FromResult(result);
    }

    public override void SaveChangesFailed(DbContextErrorEventData eventData) => Desfazer(eventData.Context);

    public override Task SaveChangesFailedAsync(DbContextErrorEventData eventData, CancellationToken cancellationToken = default)
    {
        Desfazer(eventData.Context);
        return Task.CompletedTask;
    }

    public override void SaveChangesCanceled(DbContextEventData eventData) => Desfazer(eventData.Context);

    public override Task SaveChangesCanceledAsync(DbContextEventData eventData, CancellationToken cancellationToken = default)
    {
        Desfazer(eventData.Context);
        return Task.CompletedTask;
    }

    private void Registrar(DbContext? db)
    {
        if (db is null || _contexto is not { Ativa: true })
            return;

        var agora = DateTime.Now;
        var logs = new List<LogAuditoria>();

        // Entries() roda o DetectChanges antes: pega também o que foi alterado só pelo setter da propriedade.
        foreach (var entrada in db.ChangeTracker.Entries())
        {
            if (entrada.Entity is LogAuditoria)
                continue;

            var tabela = entrada.Metadata.GetTableName();
            if (tabela is null)
                continue;

            switch (entrada.State)
            {
                case EntityState.Added:
                    logs.Add(NovoLog(AcaoInsercao, tabela, agora, colunas: null, antigo: null, novo: Xml(entrada, tabela, original: false)));
                    break;

                case EntityState.Deleted:
                    logs.Add(NovoLog(AcaoExclusao, tabela, agora, colunas: null, antigo: Xml(entrada, tabela, original: true), novo: null));
                    break;

                case EntityState.Modified:
                    var colunas = entrada.Properties.Where(p => p.IsModified).Select(p => p.Metadata.GetColumnName()).ToList();
                    if (colunas.Count == 0)
                        break;
                    logs.Add(NovoLog(
                        AcaoAtualizacao, tabela, agora, string.Join(';', colunas),
                        antigo: Xml(entrada, tabela, original: true), novo: Xml(entrada, tabela, original: false)));
                    break;
            }
        }

        if (logs.Count == 0)
            return;

        db.Set<LogAuditoria>().AddRange(logs);
        _pendentes.AddOrUpdate(db, logs);
    }

    private LogAuditoria NovoLog(string acao, string tabela, DateTime data, string? colunas, string? antigo, string? novo) => new()
    {
        Cdusuario = _contexto!.UsuarioId,
        Acao = acao,
        Data = data,
        Tabela = tabela,
        ColunasModificadas = colunas,
        Ip = _contexto.Ip,
        ValorAntigo = antigo,
        ValorNovo = novo,
    };

    private void Esquecer(DbContext? db)
    {
        if (db is not null)
            _pendentes.Remove(db);
    }

    private void Desfazer(DbContext? db)
    {
        if (db is null || !_pendentes.TryGetValue(db, out var logs))
            return;

        foreach (var log in logs)
            db.Entry(log).State = EntityState.Detached;
        _pendentes.Remove(db);
    }

    /// <summary>
    /// O registro em XML, no formato do legado: raiz com o nome da tabela e um elemento por coluna (nulo = xsi:nil).
    /// Uma falha aqui não pode impedir a gravação do registro, então vira um texto de aviso no lugar do XML.
    /// </summary>
    private static string Xml(EntityEntry entrada, string tabela, bool original)
    {
        try
        {
            var texto = new StringBuilder(512);
            using (var xml = XmlWriter.Create(texto, ConfiguracaoXml))
            {
                xml.WriteStartElement(tabela);
                xml.WriteAttributeString("xmlns", "xsi", null, XsiNamespace);

                var ehUsuario = entrada.Entity is Usuario;
                foreach (var propriedade in entrada.Properties)
                {
                    var meta = propriedade.Metadata;
                    if (meta.ClrType == typeof(byte[]))
                        continue;

                    xml.WriteStartElement(meta.GetColumnName());

                    object? valor = original ? propriedade.OriginalValue : propriedade.CurrentValue;
                    if (!original && propriedade.IsTemporary)
                        valor = 0;
                    else if (ehUsuario && meta.Name == nameof(Usuario.Senha) && valor is not null)
                        valor = SenhaOculta;

                    if (valor is null)
                        xml.WriteAttributeString("nil", XsiNamespace, "true");
                    else
                        xml.WriteString(TextoXml(valor));

                    xml.WriteEndElement();
                }

                xml.WriteEndElement();
            }

            return texto.ToString();
        }
        catch (Exception ex)
        {
            return $"(não foi possível registrar os valores: {ex.Message})";
        }
    }

    /// <summary>Valor como o XmlSerializer do legado escrevia: datas ISO sem fuso, números com ponto.</summary>
    private static string TextoXml(object valor) => valor switch
    {
        string texto => SemCaracteresInvalidos(texto),
        DateTime data => XmlConvert.ToString(data, XmlDateTimeSerializationMode.Unspecified),
        DateOnly data => XmlConvert.ToString(data.ToDateTime(TimeOnly.MinValue), XmlDateTimeSerializationMode.Unspecified),
        bool logico => XmlConvert.ToString(logico),
        IFormattable numero => numero.ToString(null, CultureInfo.InvariantCulture),
        _ => SemCaracteresInvalidos(valor.ToString() ?? string.Empty),
    };

    /// <summary>Um caractere de controle colado num campo de texto deixaria o XML inválido (e o XmlWriter lança erro).</summary>
    private static string SemCaracteresInvalidos(string texto)
    {
        var primeiroInvalido = -1;
        for (var i = 0; i < texto.Length; i++)
        {
            if (!ValidoNoXml(texto, i))
            {
                primeiroInvalido = i;
                break;
            }
            if (char.IsHighSurrogate(texto[i]))
                i++;
        }

        if (primeiroInvalido < 0)
            return texto;

        var limpo = new StringBuilder(texto.Length);
        limpo.Append(texto, 0, primeiroInvalido);
        for (var i = primeiroInvalido; i < texto.Length; i++)
        {
            if (!ValidoNoXml(texto, i))
                continue;
            limpo.Append(texto[i]);
            if (char.IsHighSurrogate(texto[i]))
                limpo.Append(texto[++i]);
        }
        return limpo.ToString();
    }

    private static bool ValidoNoXml(string texto, int i)
    {
        var c = texto[i];
        if (char.IsHighSurrogate(c))
            return i + 1 < texto.Length && char.IsLowSurrogate(texto[i + 1]);
        if (char.IsLowSurrogate(c))
            return false;
        return XmlConvert.IsXmlChar(c);
    }
}
