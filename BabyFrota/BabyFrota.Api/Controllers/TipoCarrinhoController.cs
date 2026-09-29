using BabyFrota.DTOs.Carrinhos;
using BabyFrota.Services.Carrinhos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabyFrota.Api.Controllers;

/// <summary>
/// CRUD de referência (fatia vertical de demonstração da arquitetura). Os demais cadastros
/// (Cliente, Usuário, Carrinho, PrecoLocacao...) seguem exatamente este mesmo padrão.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TipoCarrinhoController : ControllerBase
{
    private readonly ITipoCarrinhoService _service;
    private readonly IPrecoLocacaoService _precos;

    public TipoCarrinhoController(ITipoCarrinhoService service, IPrecoLocacaoService precos)
    {
        _service = service;
        _precos = precos;
    }

    [HttpGet]
    public async Task<ActionResult<List<TipoCarrinhoDto>>> Listar(CancellationToken ct)
        => Ok(await _service.ListarAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TipoCarrinhoDto>> ObterPorId(int id, CancellationToken ct)
    {
        var item = await _service.ObterPorIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    // A listagem (acima) fica livre para qualquer usuário logado: outras telas usam como filtro/lookup. Igual ao
    // legado, quem é só para Administrador/Gerente é o CADASTRO — criar, editar e excluir tipo de carrinho.
    [HttpPost]
    [Authorize(Policy = "Supervisor")]
    public async Task<ActionResult<TipoCarrinhoDto>> Criar([FromBody] TipoCarrinhoUpsertRequest request, CancellationToken ct)
    {
        var criado = await _service.CriarAsync(request, ct);
        return CreatedAtAction(nameof(ObterPorId), new { id = criado.Id }, criado);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "Supervisor")]
    public async Task<ActionResult<TipoCarrinhoDto>> Atualizar(int id, [FromBody] TipoCarrinhoUpsertRequest request, CancellationToken ct)
        => Ok(await _service.AtualizarAsync(id, request, ct));

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "Supervisor")]
    public async Task<IActionResult> Excluir(int id, CancellationToken ct)
    {
        await _service.ExcluirAsync(id, ct);
        return NoContent();
    }

    // ---------- Faixas de preço (PrecoLocacao): no legado ficavam na própria tela Tipo de Carrinho ----------

    [HttpGet("{tipoCarrinhoId:int}/precos")]
    public async Task<ActionResult<List<PrecoLocacaoDto>>> ListarPrecos(int tipoCarrinhoId, CancellationToken ct)
        => Ok(await _precos.ListarAsync(tipoCarrinhoId, ct));

    [HttpPost("{tipoCarrinhoId:int}/precos")]
    [Authorize(Policy = "Supervisor")]
    public async Task<ActionResult<PrecoLocacaoDto>> CriarPreco(
        int tipoCarrinhoId, [FromBody] PrecoLocacaoUpsertRequest request, CancellationToken ct)
        => Ok(await _precos.CriarAsync(tipoCarrinhoId, request, ct));

    [HttpPut("precos/{id:int}")]
    [Authorize(Policy = "Supervisor")]
    public async Task<ActionResult<PrecoLocacaoDto>> AtualizarPreco(int id, [FromBody] PrecoLocacaoUpsertRequest request, CancellationToken ct)
        => Ok(await _precos.AtualizarAsync(id, request, ct));

    [HttpDelete("precos/{id:int}")]
    [Authorize(Policy = "Supervisor")]
    public async Task<IActionResult> ExcluirPreco(int id, CancellationToken ct)
    {
        await _precos.ExcluirAsync(id, ct);
        return NoContent();
    }
}
