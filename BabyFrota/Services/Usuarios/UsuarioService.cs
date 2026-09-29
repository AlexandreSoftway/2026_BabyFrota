using BabyFrota.Data;
using BabyFrota.Domain.Entities;
using BabyFrota.DTOs.Common;
using BabyFrota.DTOs.Usuarios;
using BabyFrota.Services.Auth;
using Microsoft.EntityFrameworkCore;

namespace BabyFrota.Services.Usuarios;

public class UsuarioService : IUsuarioService
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher _passwordHasher;

    public UsuarioService(AppDbContext db, IPasswordHasher passwordHasher)
    {
        _db = db;
        _passwordHasher = passwordHasher;
    }

    public async Task<PagedResult<UsuarioDto>> ListarAsync(
        string? nome, string? cpf, int pagina, int tamanhoPagina, CancellationToken ct = default)
    {
        pagina = pagina < 1 ? 1 : pagina;
        tamanhoPagina = tamanhoPagina is < 1 or > 500 ? 10 : tamanhoPagina;

        var query = _db.Usuarios.AsQueryable();

        if (!string.IsNullOrWhiteSpace(nome))
            query = query.Where(u => u.Nome.Contains(nome));

        if (!string.IsNullOrWhiteSpace(cpf))
            query = query.Where(u => u.Cpf != null && u.Cpf.Contains(cpf));

        var total = await query.CountAsync(ct);

        // Projeção inline (não uma chamada a método) para o EF Core conseguir traduzir em SQL.
        var itens = await query
            .OrderBy(u => u.Nome)
            .Skip((pagina - 1) * tamanhoPagina)
            .Take(tamanhoPagina)
            .Select(u => new UsuarioDto
            {
                Id = u.Cdusuario,
                Nome = u.Nome,
                Email = u.Email,
                Cpf = u.Cpf,
                Rg = u.Rg,
                Ddd = u.Ddd,
                Telefone = u.Telefone,
                DddCelular = u.Dddcelular,
                Celular = u.Celular,
                PerfilId = u.Cdperfil,
                PerfilNome = u.CdperfilNavigation.Nome,
                Ativo = u.Stativo,
                DataCadastro = u.DataCadastro,
            })
            .ToListAsync(ct);

        return new PagedResult<UsuarioDto>
        {
            Itens = itens,
            Pagina = pagina,
            TamanhoPagina = tamanhoPagina,
            TotalRegistros = total,
        };
    }

    public async Task<UsuarioDto?> ObterPorIdAsync(int id, CancellationToken ct = default)
    {
        var usuario = await _db.Usuarios.Include(u => u.CdperfilNavigation)
            .FirstOrDefaultAsync(u => u.Cdusuario == id, ct);

        return usuario is null ? null : ParaDto(usuario);
    }

    public async Task<UsuarioDto> CriarAsync(UsuarioUpsertRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Senha))
            throw new ArgumentException("Senha é obrigatória para novos usuários.");

        await ValidarUnicidadeAsync(request, idAtual: null, ct);

        var usuario = new Usuario
        {
            Nome = request.Nome,
            Email = request.Email,
            Cpf = request.Cpf,
            Rg = request.Rg,
            Ddd = request.Ddd,
            Telefone = request.Telefone,
            Dddcelular = request.DddCelular,
            Celular = request.Celular,
            Cdperfil = request.PerfilId,
            Stativo = request.Ativo,
            Senha = _passwordHasher.Hash(request.Senha),
            DataCadastro = DateTime.Now,
        };

        _db.Usuarios.Add(usuario);
        await _db.SaveChangesAsync(ct);

        return await ObterPorIdAsync(usuario.Cdusuario, ct)
            ?? throw new InvalidOperationException("Falha ao recarregar usuário recém-criado.");
    }

    public async Task<UsuarioDto> AtualizarAsync(int id, UsuarioUpsertRequest request, CancellationToken ct = default)
    {
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Cdusuario == id, ct)
            ?? throw new KeyNotFoundException($"Usuário {id} não encontrado.");

        await ValidarUnicidadeAsync(request, idAtual: id, ct);

        usuario.Nome = request.Nome;
        usuario.Email = request.Email;
        usuario.Cpf = request.Cpf;
        usuario.Rg = request.Rg;
        usuario.Ddd = request.Ddd;
        usuario.Telefone = request.Telefone;
        usuario.Dddcelular = request.DddCelular;
        usuario.Celular = request.Celular;
        usuario.Cdperfil = request.PerfilId;
        usuario.Stativo = request.Ativo;
        usuario.DataAlteracao = DateTime.Now;

        if (!string.IsNullOrWhiteSpace(request.Senha))
            usuario.Senha = _passwordHasher.Hash(request.Senha);

        await _db.SaveChangesAsync(ct);

        return await ObterPorIdAsync(id, ct)
            ?? throw new InvalidOperationException("Falha ao recarregar usuário atualizado.");
    }

    /// <summary>
    /// Diferente do sistema legado (que excluía o registro), aqui apenas inativamos o usuário:
    /// a tabela Usuario é referenciada por Locação, Caixa, Log etc., e uma exclusão física
    /// quebraria o histórico dessas operações.
    /// </summary>
    public async Task InativarAsync(int id, CancellationToken ct = default)
    {
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Cdusuario == id, ct)
            ?? throw new KeyNotFoundException($"Usuário {id} não encontrado.");

        usuario.Stativo = false;
        usuario.DataAlteracao = DateTime.Now;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<List<PerfilDto>> ListarPerfisAsync(CancellationToken ct = default)
    {
        return await _db.Perfis
            .OrderBy(p => p.Nome)
            .Select(p => new PerfilDto { Id = p.Cdperfil, Nome = p.Nome })
            .ToListAsync(ct);
    }

    private async Task ValidarUnicidadeAsync(UsuarioUpsertRequest request, int? idAtual, CancellationToken ct)
    {
        var emailEmUso = await _db.Usuarios
            .AnyAsync(u => u.Email == request.Email && u.Cdusuario != (idAtual ?? 0), ct);
        if (emailEmUso)
            throw new InvalidOperationException("Já existe um usuário cadastrado com esse email.");

        if (!string.IsNullOrWhiteSpace(request.Cpf))
        {
            var cpfEmUso = await _db.Usuarios
                .AnyAsync(u => u.Cpf == request.Cpf && u.Cdusuario != (idAtual ?? 0), ct);
            if (cpfEmUso)
                throw new InvalidOperationException("Já existe um usuário cadastrado com esse CPF.");
        }

        var perfilExiste = await _db.Perfis.AnyAsync(p => p.Cdperfil == request.PerfilId, ct);
        if (!perfilExiste)
            throw new ArgumentException("Perfil informado não existe.");
    }

    private static UsuarioDto ParaDto(Usuario u) => new()
    {
        Id = u.Cdusuario,
        Nome = u.Nome,
        Email = u.Email,
        Cpf = u.Cpf,
        Rg = u.Rg,
        Ddd = u.Ddd,
        Telefone = u.Telefone,
        DddCelular = u.Dddcelular,
        Celular = u.Celular,
        PerfilId = u.Cdperfil,
        PerfilNome = u.CdperfilNavigation.Nome,
        Ativo = u.Stativo,
        DataCadastro = u.DataCadastro,
    };
}
