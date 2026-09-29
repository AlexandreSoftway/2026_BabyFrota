namespace BabyFrota.Data.Auditoria;

/// <summary>
/// Quem está gravando, para o log de auditoria (TBLog). A Api implementa lendo a requisição atual; fora de uma
/// requisição (a carga inicial do administrador, por exemplo) <see cref="Ativa"/> é falso e nada é auditado.
/// </summary>
public interface IAuditoriaContexto
{
    bool Ativa { get; }

    int? UsuarioId { get; }

    /// <summary>Endereço de quem fez a requisição, já cabendo em TBLog.IP (varchar(16)).</summary>
    string Ip { get; }
}
