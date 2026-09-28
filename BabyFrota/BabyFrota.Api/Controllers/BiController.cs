using BabyFrota.DTOs.Bi;
using BabyFrota.DTOs.Common;
using BabyFrota.Services.Bi;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabyFrota.Api.Controllers;

// Como os relatórios: só Administrador e Gerente.
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Supervisor")]
public class BiController : ControllerBase
{
    private readonly IBiService _service;

    public BiController(IBiService service)
    {
        _service = service;
    }

    [HttpGet("clientes")]
    public async Task<ActionResult<PagedResult<BiClienteDto>>> ListarClientes([FromQuery] BiClientesFiltro filtro, CancellationToken ct)
        => Ok(await _service.ListarClientesAsync(filtro, ct));

    [HttpGet("clientes/resumo")]
    public async Task<ActionResult<BiClientesResumoDto>> ObterResumoClientes([FromQuery] BiClientesFiltro filtro, CancellationToken ct)
        => Ok(await _service.ObterResumoClientesAsync(filtro, ct));

    [HttpGet("locacoes")]
    public async Task<ActionResult<PagedResult<BiLocacaoDto>>> ListarLocacoes([FromQuery] BiLocacoesFiltro filtro, CancellationToken ct)
        => Ok(await _service.ListarLocacoesAsync(filtro, ct));

    [HttpGet("locacoes/resumo")]
    public async Task<ActionResult<BiLocacoesResumoDto>> ObterResumoLocacoes([FromQuery] BiLocacoesFiltro filtro, CancellationToken ct)
        => Ok(await _service.ObterResumoLocacoesAsync(filtro, ct));

    [HttpGet("locacoes/faturamento-por-dia")]
    public async Task<ActionResult<List<BiFaturamentoPorDiaDto>>> ObterFaturamentoPorDia([FromQuery] BiLocacoesFiltro filtro, CancellationToken ct)
        => Ok(await _service.ObterFaturamentoPorDiaAsync(filtro, ct));
}
