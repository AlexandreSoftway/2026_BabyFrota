using BabyFrota.DTOs.Relatorios;
using BabyFrota.Services.Relatorios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabyFrota.Api.Controllers;

// Igual ao legado (RelatorioClientes.aspx, RelatorioHistoricoXxx.aspx): relatório é só para Administrador e Gerente.
// Cada rota devolve o relatório inteiro (as procedures do legado não paginam); a tela pagina e exporta da mesma lista.
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
    public async Task<ActionResult<List<ClienteRelatorioDto>>> ListarClientes([FromQuery] RelatorioClientesFiltro filtro, CancellationToken ct)
        => Ok(await _service.ListarClientesAsync(filtro, ct));

    [HttpGet("historico/ocupacao")]
    public async Task<ActionResult<List<HistoricoOcupacaoDto>>> ListarHistoricoOcupacao([FromQuery] RelatorioHistoricoFiltro filtro, CancellationToken ct)
        => Ok(await _service.ListarHistoricoOcupacaoAsync(filtro, ct));

    [HttpGet("historico/detalhado")]
    public async Task<ActionResult<List<HistoricoLocacaoDetalhadoDto>>> ListarHistoricoDetalhado([FromQuery] RelatorioHistoricoFiltro filtro, CancellationToken ct)
        => Ok(await _service.ListarHistoricoDetalhadoAsync(filtro, ct));

    [HttpGet("historico/simplificado")]
    public async Task<ActionResult<List<HistoricoLocacaoSimplificadoDto>>> ListarHistoricoSimplificado([FromQuery] RelatorioHistoricoFiltro filtro, CancellationToken ct)
        => Ok(await _service.ListarHistoricoSimplificadoAsync(filtro, ct));

    [HttpGet("usuarios")]
    public async Task<ActionResult<List<UsuarioFiltroDto>>> ListarUsuarios(CancellationToken ct)
        => Ok(await _service.ListarUsuariosAsync(ct));
}
