using BabyFrota.DTOs.Carrinhos;
using BabyFrota.DTOs.Common;
using BabyFrota.Services.Carrinhos;
using BabyFrota.Services.Midias;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabyFrota.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CarrinhoController : ControllerBase
{
    private readonly ICarrinhoService _service;
    private readonly IMidiaService _midias;

    public CarrinhoController(ICarrinhoService service, IMidiaService midias)
    {
        _service = service;
        _midias = midias;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<CarrinhoDto>>> Listar(
        [FromQuery] string? descricao, [FromQuery] int? statusId, [FromQuery] int? tipoCarrinhoId,
        [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 10, CancellationToken ct = default)
        => Ok(await _service.ListarAsync(descricao, statusId, tipoCarrinhoId, pagina, tamanhoPagina, ct));

    [HttpGet("status")]
    public async Task<ActionResult<List<StatusDto>>> ListarStatus(CancellationToken ct)
        => Ok(await _service.ListarStatusAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CarrinhoDto>> ObterPorId(int id, CancellationToken ct)
    {
        var item = await _service.ObterPorIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    // A listagem (acima) fica livre para qualquer usuário logado: a tela Locações também usa como filtro. Igual ao
    // legado, quem é só para Administrador/Gerente é o CADASTRO — criar, editar e excluir carrinho.
    [HttpPost]
    [Authorize(Policy = "Supervisor")]
    public async Task<ActionResult<CarrinhoDto>> Criar([FromBody] CarrinhoUpsertRequest request, CancellationToken ct)
    {
        var criado = await _service.CriarAsync(request, ct);
        return CreatedAtAction(nameof(ObterPorId), new { id = criado.Id }, criado);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "Supervisor")]
    public async Task<ActionResult<CarrinhoDto>> Atualizar(int id, [FromBody] CarrinhoUpsertRequest request, CancellationToken ct)
        => Ok(await _service.AtualizarAsync(id, request, ct));

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "Supervisor")]
    public async Task<IActionResult> Excluir(int id, CancellationToken ct)
    {
        await _service.ExcluirAsync(id, ct);
        return NoContent();
    }

    // ---------- Foto: ver é livre; trocar e remover, só quem cadastra carrinho ----------

    [HttpGet("{id:int}/foto")]
    public Task<IActionResult> ObterFoto(int id, CancellationToken ct)
        => MidiaHttp.ObterAsync(this, _midias, TipoMidia.FotoCarrinho, id, ct);

    [HttpPut("{id:int}/foto")]
    [Authorize(Policy = "Supervisor")]
    [RequestSizeLimit(MidiaHttp.LimiteRequisicao)]
    public Task<IActionResult> SalvarFoto(int id, IFormFile? arquivo, CancellationToken ct)
        => MidiaHttp.SalvarAsync(this, _midias, TipoMidia.FotoCarrinho, id, arquivo, ct);

    [HttpDelete("{id:int}/foto")]
    [Authorize(Policy = "Supervisor")]
    public Task<IActionResult> RemoverFoto(int id, CancellationToken ct)
        => MidiaHttp.RemoverAsync(this, _midias, TipoMidia.FotoCarrinho, id, ct);
}
