namespace BabyFrota.DTOs.Usuarios;

public class UsuarioDto
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Cpf { get; set; }
    public string? Rg { get; set; }
    public string? Ddd { get; set; }
    public string? Telefone { get; set; }
    public string? DddCelular { get; set; }
    public string? Celular { get; set; }
    public int PerfilId { get; set; }
    public string PerfilNome { get; set; } = string.Empty;
    public bool Ativo { get; set; }
    public DateTime? DataCadastro { get; set; }
}

public class UsuarioUpsertRequest
{
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Cpf { get; set; }
    public string? Rg { get; set; }
    public string? Ddd { get; set; }
    public string? Telefone { get; set; }
    public string? DddCelular { get; set; }
    public string? Celular { get; set; }
    public int PerfilId { get; set; }
    public bool Ativo { get; set; } = true;

    /// <summary>Obrigatório na criação. Na edição, deixe em branco para manter a senha atual.</summary>
    public string? Senha { get; set; }
}

public class PerfilDto
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
}
