using BabyFrota.DTOs.Bi;
using BabyFrota.DTOs.Common;

namespace BabyFrota.Services.Bi;

/// <summary>BI de clientes e de locações do sistema novo: paginado no servidor, com indicadores e gráfico.</summary>
public interface IBiService
{
    Task<PagedResult<BiClienteDto>> ListarClientesAsync(BiClientesFiltro filtro, CancellationToken ct = default);
    Task<BiClientesResumoDto> ObterResumoClientesAsync(BiClientesFiltro filtro, CancellationToken ct = default);

    Task<PagedResult<BiLocacaoDto>> ListarLocacoesAsync(BiLocacoesFiltro filtro, CancellationToken ct = default);
    Task<BiLocacoesResumoDto> ObterResumoLocacoesAsync(BiLocacoesFiltro filtro, CancellationToken ct = default);
    Task<List<BiFaturamentoPorDiaDto>> ObterFaturamentoPorDiaAsync(BiLocacoesFiltro filtro, CancellationToken ct = default);
}
