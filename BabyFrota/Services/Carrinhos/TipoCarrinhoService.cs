using BabyFrota.Data;
using BabyFrota.Domain.Entities;
using BabyFrota.DTOs.Carrinhos;
using Microsoft.EntityFrameworkCore;

namespace BabyFrota.Services.Carrinhos;

/// <summary>
/// Fatia vertical de demonstração da arquitetura (Domain -> Data -> Services -> DTOs -> Api).
/// Serve de modelo para os demais serviços de cadastro (Cliente, Usuário, Carrinho...).
/// </summary>
public class TipoCarrinhoService : ITipoCarrinhoService
{
    private readonly AppDbContext _db;

    public TipoCarrinhoService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<TipoCarrinhoDto>> ListarAsync(CancellationToken ct = default)
    {
        return await _db.TipoCarrinhos
            .OrderBy(t => t.Descricao)
            .Select(t => new TipoCarrinhoDto
            {
                Id = t.CdtipoCarrinho,
                Descricao = t.Descricao,
                QuantidadeCarrinhos = t.Carrinhos.Count,
                QuantidadeFaixas = t.PrecoLocacoes.Count,
            })
            .ToListAsync(ct);
    }

    public async Task<TipoCarrinhoDto?> ObterPorIdAsync(int id, CancellationToken ct = default)
    {
        return await _db.TipoCarrinhos
            .Where(t => t.CdtipoCarrinho == id)
            .Select(t => new TipoCarrinhoDto
            {
                Id = t.CdtipoCarrinho,
                Descricao = t.Descricao,
                QuantidadeCarrinhos = t.Carrinhos.Count,
                QuantidadeFaixas = t.PrecoLocacoes.Count,
            })
            .FirstOrDefaultAsync(ct);
    }

    public async Task<TipoCarrinhoDto> CriarAsync(TipoCarrinhoUpsertRequest request, CancellationToken ct = default)
    {
        var entidade = new TipoCarrinho { Descricao = request.Descricao };
        _db.TipoCarrinhos.Add(entidade);
        await _db.SaveChangesAsync(ct);

        return new TipoCarrinhoDto { Id = entidade.CdtipoCarrinho, Descricao = entidade.Descricao, QuantidadeCarrinhos = 0, QuantidadeFaixas = 0 };
    }

    public async Task<TipoCarrinhoDto> AtualizarAsync(int id, TipoCarrinhoUpsertRequest request, CancellationToken ct = default)
    {
        var entidade = await _db.TipoCarrinhos.FirstOrDefaultAsync(t => t.CdtipoCarrinho == id, ct)
            ?? throw new KeyNotFoundException($"Tipo de carrinho {id} não encontrado.");

        entidade.Descricao = request.Descricao;
        await _db.SaveChangesAsync(ct);

        return new TipoCarrinhoDto
        {
            Id = entidade.CdtipoCarrinho,
            Descricao = entidade.Descricao,
            QuantidadeCarrinhos = await _db.Carrinhos.CountAsync(c => c.CdtipoCarrinho == id, ct),
            QuantidadeFaixas = await _db.PrecoLocacoes.CountAsync(p => p.CdtipoCarrinho == id, ct),
        };
    }

    public async Task ExcluirAsync(int id, CancellationToken ct = default)
    {
        var entidade = await _db.TipoCarrinhos.FirstOrDefaultAsync(t => t.CdtipoCarrinho == id, ct)
            ?? throw new KeyNotFoundException($"Tipo de carrinho {id} não encontrado.");

        var emUso = await _db.Carrinhos.AnyAsync(c => c.CdtipoCarrinho == id, ct);
        if (emUso)
            throw new InvalidOperationException("Não é possível excluir um tipo de carrinho em uso.");

        // Como o legado (NTipoCarrinho.Excluir): as faixas de preço do tipo saem junto. Sem isso a chave estrangeira de
        // PrecoLocacao impedia a exclusão de qualquer tipo com preço cadastrado.
        var faixas = await _db.PrecoLocacoes.Where(p => p.CdtipoCarrinho == id).ToListAsync(ct);
        _db.PrecoLocacoes.RemoveRange(faixas);
        _db.TipoCarrinhos.Remove(entidade);
        await _db.SaveChangesAsync(ct);
    }
}
