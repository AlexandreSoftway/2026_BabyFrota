using BabyFrota.DTOs.Common;
using BabyFrota.DTOs.Usuarios;
using BabyFrota.Services.Usuarios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabyFrota.Api.Controllers;

// Igual ao legado (CadastroUsuario.aspx): a tela inteira, e não só criar/editar, é só para Administrador.
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Administrador")]
public class UsuarioController : ControllerBase
{
    private readonly IUsuarioService _service;

    public UsuarioController(IUsuarioService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<UsuarioDto>>> Listar(
        [FromQuery] string? nome, [FromQuery] string? cpf,
        [FromQuery] int pagina = 1, [FromQuery] int tamanhoPagina = 10, CancellationToken ct = default)
        => Ok(await _service.ListarAsync(nome, cpf, pagina, tamanhoPagina, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UsuarioDto>> ObterPorId(int id, CancellationToken ct)
    {
        var usuario = await _service.ObterPorIdAsync(id, ct);
        return usuario is null ? NotFound() : Ok(usuario);
    }

    [HttpGet("perfis")]
    public async Task<ActionResult<List<PerfilDto>>> ListarPerfis(CancellationToken ct)
        => Ok(await _service.ListarPerfisAsync(ct));

    [HttpPost]
    public async Task<ActionResult<UsuarioDto>> Criar([FromBody] UsuarioUpsertRequest request, CancellationToken ct)
    {
        var criado = await _service.CriarAsync(request, ct);
        return CreatedAtAction(nameof(ObterPorId), new { id = criado.Id }, criado);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UsuarioDto>> Atualizar(int id, [FromBody] UsuarioUpsertRequest request, CancellationToken ct)
        => Ok(await _service.AtualizarAsync(id, request, ct));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Inativar(int id, CancellationToken ct)
    {
        await _service.InativarAsync(id, ct);
        return NoContent();
    }
}
