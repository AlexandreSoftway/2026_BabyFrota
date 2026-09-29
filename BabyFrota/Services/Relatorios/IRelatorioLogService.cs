using BabyFrota.DTOs.Relatorios;

namespace BabyFrota.Services.Relatorios;

/// <summary>Relatório de Log do legado (RelatorioLog.aspx / RelatorioLog.rdlc), sobre a tabela de auditoria TBLog.</summary>
public interface IRelatorioLogService
{
    Task<RelatorioLogResultado> ListarAsync(RelatorioLogFiltro filtro, CancellationToken ct = default);

    /// <summary>O registro antes e depois da gravação; nulo se o log não existir.</summary>
    Task<LogDetalheDto?> ObterAsync(int id, CancellationToken ct = default);

    /// <summary>As tabelas do banco que aparecem no log, para o filtro.</summary>
    List<string> ListarTabelas();
}
