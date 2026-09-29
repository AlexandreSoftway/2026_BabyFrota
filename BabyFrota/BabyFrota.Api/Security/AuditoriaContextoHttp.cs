using System.Security.Claims;
using BabyFrota.Data.Auditoria;

namespace BabyFrota.Api.Security;

/// <summary>Usuário e IP da requisição atual, para o log de auditoria (TBLog), como o legado gravava.</summary>
public sealed class AuditoriaContextoHttp : IAuditoriaContexto
{
    private readonly IHttpContextAccessor _acessor;

    public AuditoriaContextoHttp(IHttpContextAccessor acessor)
    {
        _acessor = acessor;
    }

    public bool Ativa => _acessor.HttpContext is not null;

    public int? UsuarioId
        => int.TryParse(_acessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public string Ip => EnderecoIp.Obter(_acessor.HttpContext);
}

public static class EnderecoIp
{
    /// <summary>TBLog.IP é varchar(16), como o Request.UserHostAddress do legado.</summary>
    private const int TamanhoMaximo = 16;

    /// <summary>
    /// IP de quem fez a requisição. Um IPv4 que chega pelo socket IPv6 (::ffff:192.168.0.4) volta a ser IPv4, que é como o
    /// legado gravava; um IPv6 inteiro é cortado para caber na coluna, em vez de derrubar a gravação.
    /// </summary>
    public static string Obter(HttpContext? http)
    {
        var ip = http?.Connection.RemoteIpAddress;
        if (ip is null)
            return "desconhecido";

        if (ip.IsIPv4MappedToIPv6)
            ip = ip.MapToIPv4();

        var texto = ip.ToString();
        return texto.Length <= TamanhoMaximo ? texto : texto[..TamanhoMaximo];
    }
}
