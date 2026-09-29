using BabyFrota.DTOs.Clientes;
using BabyFrota.DTOs.Common;
using BabyFrota.Services.Clientes;
using BabyFrota.Services.Midias;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabyFrota.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ClienteController : ControllerBase
{
    private readonly IClienteService _service;
    private readonly IMidiaService _midias;

    public ClienteController(IClienteService service, IMidiaService midias)
    {
        _service = service;
        _midias = midias;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<ClienteDto>>> Listar(
        [FromQuery] string? nome, [FromQuery] string? cpf,
        [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 10, CancellationToken ct = default)
        => Ok(await _service.ListarAsync(nome, cpf, pagina, tamanhoPagina, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ClienteDto>> ObterPorId(int id, CancellationToken ct)
    {
        var cliente = await _service.ObterPorIdAsync(id, ct);
        return cliente is null ? NotFound() : Ok(cliente);
    }

    [HttpPost]
    public async Task<ActionResult<ClienteDto>> Criar([FromBody] ClienteUpsertRequest request, CancellationToken ct)
    {
        var criado = await _service.CriarAsync(request, ct);
        return CreatedAtAction(nameof(ObterPorId), new { id = criado.Id }, criado);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ClienteDto>> Atualizar(int id, [FromBody] ClienteUpsertRequest request, CancellationToken ct)
        => Ok(await _service.AtualizarAsync(id, request, ct));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Excluir(int id, CancellationToken ct)
    {
        await _service.ExcluirAsync(id, ct);
        return NoContent();
    }

    // ---------- Foto e documento (igual ao legado: qualquer usuário que cadastra cliente) ----------

    [HttpGet("{id:int}/foto")]
    public Task<IActionResult> ObterFoto(int id, CancellationToken ct)
        => MidiaHttp.ObterAsync(this, _midias, TipoMidia.FotoCliente, id, ct);

    [HttpPut("{id:int}/foto")]
    [RequestSizeLimit(MidiaHttp.LimiteRequisicao)]
    public Task<IActionResult> SalvarFoto(int id, IFormFile? arquivo, CancellationToken ct)
        => MidiaHttp.SalvarAsync(this, _midias, TipoMidia.FotoCliente, id, arquivo, ct);

    [HttpDelete("{id:int}/foto")]
    public Task<IActionResult> RemoverFoto(int id, CancellationToken ct)
        => MidiaHttp.RemoverAsync(this, _midias, TipoMidia.FotoCliente, id, ct);

    [HttpGet("{id:int}/documento")]
    public Task<IActionResult> ObterDocumento(int id, CancellationToken ct)
        => MidiaHttp.ObterAsync(this, _midias, TipoMidia.DocumentoCliente, id, ct);

    [HttpPut("{id:int}/documento")]
    [RequestSizeLimit(MidiaHttp.LimiteRequisicao)]
    public Task<IActionResult> SalvarDocumento(int id, IFormFile? arquivo, CancellationToken ct)
        => MidiaHttp.SalvarAsync(this, _midias, TipoMidia.DocumentoCliente, id, arquivo, ct);

    [HttpDelete("{id:int}/documento")]
    public Task<IActionResult> RemoverDocumento(int id, CancellationToken ct)
        => MidiaHttp.RemoverAsync(this, _midias, TipoMidia.DocumentoCliente, id, ct);
}
