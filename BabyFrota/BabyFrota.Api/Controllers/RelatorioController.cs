using BabyFrota.DTOs.Common;
using BabyFrota.DTOs.Relatorios;
using BabyFrota.Services.Relatorios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabyFrota.Api.Controllers;

// Igual ao legado (RelatorioClientes.aspx, RelatorioHistoricoXxx.aspx): relatório é só para Administrador e Gerente.
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Supervisor")]
public class RelatorioController : ControllerBase
{
    private readonly IRelatorioService _service;

    public RelatorioController(IRelatorioService service)
    {
        _service = service;
    }

    [HttpGet("clientes")]
    public async Task<ActionResult<PagedResult<ClienteRelatorioDto>>> ListarClientes([FromQuery] RelatorioClientesFiltro filtro, CancellationToken ct)
        => Ok(await _service.ListarClientesAsync(filtro, ct));

    [HttpGet("clientes/resumo")]
    public async Task<ActionResult<RelatorioClientesResumoDto>> ObterResumoClientes([FromQuery] RelatorioClientesFiltro filtro, CancellationToken ct)
        => Ok(await _service.ObterResumoClientesAsync(filtro, ct));

    [HttpGet("historico")]
    public async Task<ActionResult<PagedResult<LocacaoHistoricoDto>>> ListarHistorico([FromQuery] RelatorioHistoricoFiltro filtro, CancellationToken ct)
        => Ok(await _service.ListarHistoricoAsync(filtro, ct));

    [HttpGet("historico/resumo")]
    public async Task<ActionResult<RelatorioHistoricoResumoDto>> ObterResumoHistorico([FromQuery] RelatorioHistoricoFiltro filtro, CancellationToken ct)
        => Ok(await _service.ObterResumoHistoricoAsync(filtro, ct));

    [HttpGet("historico/faturamento-por-dia")]
    public async Task<ActionResult<List<FaturamentoPorDiaDto>>> ObterFaturamentoPorDia([FromQuery] RelatorioHistoricoFiltro filtro, CancellationToken ct)
        => Ok(await _service.ObterFaturamentoPorDiaAsync(filtro, ct));
}
