using System.Security.Claims;
using BabyFrota.Data;
using BabyFrota.Services.Common;
using Microsoft.AspNetCore.Authorization;

namespace BabyFrota.Api.Security;

/// <summary>Perfis aceitos por uma política (ex.: só Administrador, ou Administrador+Gerente).</summary>
public class PerfilRequirement : IAuthorizationRequirement
{
    public IReadOnlyCollection<int> PerfisPermitidos { get; }

    public PerfilRequirement(params int[] perfisPermitidos)
    {
        PerfisPermitidos = perfisPermitidos;
    }
}

/// <summary>
/// Confere o perfil do usuário direto no banco a cada requisição, com <see cref="PerfilUsuarioExtensions"/> — a mesma
/// consulta que os Services já usam para desconto e fechamento de caixa — e não pelo claim "perfilId" do token: assim,
/// rebaixar alguém de perfil vale na próxima requisição, sem esperar o token expirar (até 8h) ou pedir novo login.
/// </summary>
public class PerfilAuthorizationHandler : AuthorizationHandler<PerfilRequirement>
{
    private readonly AppDbContext _db;

    public PerfilAuthorizationHandler(AppDbContext db)
    {
        _db = db;
    }

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, PerfilRequirement requirement)
    {
        var idClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (idClaim is null || !int.TryParse(idClaim, out var usuarioId))
            return;

        var perfilId = await _db.ObterPerfilIdAsync(usuarioId, CancellationToken.None);
        if (requirement.PerfisPermitidos.Contains(perfilId))
            context.Succeed(requirement);
    }
}
