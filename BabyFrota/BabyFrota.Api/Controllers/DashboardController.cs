using BabyFrota.DTOs.Dashboard;
using BabyFrota.Services.Dashboard;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabyFrota.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _service;

    public DashboardController(IDashboardService service)
    {
        _service = service;
    }

    /// <summary>KPIs da home para o período (datas inclusivas; sem datas, o dia de hoje).</summary>
    [HttpGet("resumo")]
    public async Task<ActionResult<DashboardResumoDto>> Resumo(
        [FromQuery] DateTime? dataInicio, [FromQuery] DateTime? dataFim, CancellationToken ct)
        => Ok(await _service.ObterResumoAsync(dataInicio, dataFim, ct));
}
