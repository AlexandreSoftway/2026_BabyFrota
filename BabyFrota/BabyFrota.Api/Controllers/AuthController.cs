using BabyFrota.Api.Security;
using BabyFrota.DTOs.Auth;
using BabyFrota.Services.Auth;
using Microsoft.AspNetCore.Mvc;

namespace BabyFrota.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>Autentica um usuário (operador do sistema) e retorna um token JWT.</summary>
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var resultado = await _authService.LoginAsync(request, EnderecoIp.Obter(HttpContext), ct);
        return Ok(resultado);
    }
}
