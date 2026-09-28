using BabyFrota.Data;
using BabyFrota.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BabyFrota.Services.Common;

/// <summary>
/// Consulta do perfil direto no banco, e não pelo claim do token: uma troca de perfil vale na hora, sem esperar novo login.
/// Público porque a Api também usa (<c>PerfilAuthorizationHandler</c>, que trava rota inteira por perfil, igual ao legado).
/// </summary>
public static class PerfilUsuarioExtensions
{
    /// <summary>Perfil do usuário; 0 (sem perfil algum) se o usuário não existir.</summary>
    public static Task<int> ObterPerfilIdAsync(this AppDbContext db, int usuarioId, CancellationToken ct)
        => db.Usuarios
            .Where(u => u.Cdusuario == usuarioId)
            .Select(u => u.Cdperfil)
            .FirstOrDefaultAsync(ct);

    public static bool EhAdministrador(int perfilId) => perfilId == (int)PerfilSistema.Administrador;

    /// <summary>Administrador ou Gerente — os perfis que o legado trata como supervisão (relatórios, fechamento de caixa alheio).</summary>
    public static bool EhSupervisor(int perfilId)
        => perfilId == (int)PerfilSistema.Administrador || perfilId == (int)PerfilSistema.Gerente;
}
