using BabyFrota.DTOs.Empresa;
using BabyFrota.Services.Empresas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BabyFrota.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmpresaController : ControllerBase
{
    private readonly IEmpresaService _service;

    public EmpresaController(IEmpresaService service)
    {
        _service = service;
    }

    // Sem restrição de perfil: o comprovante impresso na entrega/devolução usa esses dados, para qualquer usuário logado.
    [HttpGet]
    public async Task<ActionResult<EmpresaDto>> Obter(CancellationToken ct)
    {
        var empresa = await _service.ObterAsync(ct);
        return empresa is null ? NotFound() : Ok(empresa);
    }

    // Igual ao legado (EC.aspx): editar o cadastro da empresa é só para Administrador.
    [HttpPut]
    [Authorize(Policy = "Administrador")]
    public async Task<ActionResult<EmpresaDto>> Salvar([FromBody] EmpresaUpsertRequest request, CancellationToken ct)
        => Ok(await _service.SalvarAsync(request, ct));
}
