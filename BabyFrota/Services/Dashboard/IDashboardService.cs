using BabyFrota.DTOs.Dashboard;

namespace BabyFrota.Services.Dashboard;

public interface IDashboardService
{
    /// <summary>KPIs do período (datas inclusivas; sem datas, o dia de hoje) e o estado atual da frota e do caixa.</summary>
    Task<DashboardResumoDto> ObterResumoAsync(DateTime? dataInicio, DateTime? dataFim, CancellationToken ct = default);
}
