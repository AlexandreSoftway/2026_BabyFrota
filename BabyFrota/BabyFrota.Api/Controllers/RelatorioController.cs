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
    private readonly IRelatorioLogService _log;

    public RelatorioController(IRelatorioService service, IRelatorioLogService log)
    {
        _service = service;
        _log = log;
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

    // Relatório de Log: igual ao menu do legado (Default.aspx mostra "Log" só ao Administrador).
    [HttpGet("log")]
    [Authorize(Policy = "Administrador")]
    public async Task<ActionResult<RelatorioLogResultado>> ListarLog([FromQuery] RelatorioLogFiltro filtro, CancellationToken ct)
        => Ok(await _log.ListarAsync(filtro, ct));

    [HttpGet("log/{id:int}")]
    [Authorize(Policy = "Administrador")]
    public async Task<ActionResult<LogDetalheDto>> ObterLog(int id, CancellationToken ct)
    {
        var detalhe = await _log.ObterAsync(id, ct);
        return detalhe is null ? NotFound() : Ok(detalhe);
    }

    [HttpGet("log/tabelas")]
    [Authorize(Policy = "Administrador")]
    public ActionResult<List<string>> ListarTabelasDoLog() => Ok(_log.ListarTabelas());
}
