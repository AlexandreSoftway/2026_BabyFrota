using System.Globalization;
using BabyFrota.Data;
using BabyFrota.Domain.Entities;
using BabyFrota.DTOs.Carrinhos;
using Microsoft.EntityFrameworkCore;

namespace BabyFrota.Services.Carrinhos;

/// <summary>
/// Faixas de preço por tempo de uso (PrecoLocacao), que a devolução usa para cobrar. Igual ao legado (NPrecoLocacao):
/// "de", "até" (em minutos) e valor. A mais: o servidor recusa faixa que cubra os mesmos minutos de outra do mesmo tipo,
/// porque aí a devolução não teria um preço certo para aqueles minutos.
/// </summary>
public class PrecoLocacaoService : IPrecoLocacaoService
{
    /// <summary>Maior valor de decimal(12,2).</summary>
    private const decimal ValorMaximo = 9_999_999_999.99m;

    private readonly AppDbContext _db;

    public PrecoLocacaoService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<PrecoLocacaoDto>> ListarAsync(int tipoCarrinhoId, CancellationToken ct = default)
    {
        await GarantirTipoAsync(tipoCarrinhoId, ct);

        return await _db.PrecoLocacoes
            .Where(p => p.CdtipoCarrinho == tipoCarrinhoId)
            .OrderBy(p => p.MinimoMinutos)
            .ThenBy(p => p.MaximoMinutos)
            .Select(p => new PrecoLocacaoDto
            {
                Id = p.CdprecoLocacao,
                TipoCarrinhoId = p.CdtipoCarrinho,
                MinimoMinutos = p.MinimoMinutos,
                MaximoMinutos = p.MaximoMinutos,
                Valor = p.Valor,
            })
            .ToListAsync(ct);
    }

    public async Task<PrecoLocacaoDto> CriarAsync(int tipoCarrinhoId, PrecoLocacaoUpsertRequest request, CancellationToken ct = default)
    {
        await GarantirTipoAsync(tipoCarrinhoId, ct);
        var valor = Validar(request);
        await ValidarSobreposicaoAsync(tipoCarrinhoId, request, idAtual: null, ct);

        var entidade = new PrecoLocacao
        {
            CdtipoCarrinho = tipoCarrinhoId,
            MinimoMinutos = request.MinimoMinutos,
            MaximoMinutos = request.MaximoMinutos,
            Valor = valor,
        };
        _db.PrecoLocacoes.Add(entidade);
        await _db.SaveChangesAsync(ct);

        return ParaDto(entidade);
    }

    public async Task<PrecoLocacaoDto> AtualizarAsync(int id, PrecoLocacaoUpsertRequest request, CancellationToken ct = default)
    {
        var entidade = await _db.PrecoLocacoes.FirstOrDefaultAsync(p => p.CdprecoLocacao == id, ct)
            ?? throw new KeyNotFoundException($"Faixa de preço {id} não encontrada.");

        var valor = Validar(request);
        await ValidarSobreposicaoAsync(entidade.CdtipoCarrinho, request, idAtual: id, ct);

        entidade.MinimoMinutos = request.MinimoMinutos;
        entidade.MaximoMinutos = request.MaximoMinutos;
        entidade.Valor = valor;
        await _db.SaveChangesAsync(ct);

        return ParaDto(entidade);
    }

    public async Task ExcluirAsync(int id, CancellationToken ct = default)
    {
        var entidade = await _db.PrecoLocacoes.FirstOrDefaultAsync(p => p.CdprecoLocacao == id, ct)
            ?? throw new KeyNotFoundException($"Faixa de preço {id} não encontrada.");

        _db.PrecoLocacoes.Remove(entidade);
        await _db.SaveChangesAsync(ct);
    }

    private async Task GarantirTipoAsync(int tipoCarrinhoId, CancellationToken ct)
    {
        if (!await _db.TipoCarrinhos.AnyAsync(t => t.CdtipoCarrinho == tipoCarrinhoId, ct))
            throw new KeyNotFoundException($"Tipo de carrinho {tipoCarrinhoId} não encontrado.");
    }

    /// <summary>Valida os campos e devolve o valor com 2 casas, como a coluna decimal(12,2).</summary>
    private static decimal Validar(PrecoLocacaoUpsertRequest request)
    {
        if (request.MinimoMinutos < 0)
            throw new ArgumentException("O tempo inicial não pode ser negativo.");
        if (request.MaximoMinutos < request.MinimoMinutos)
            throw new ArgumentException("O tempo final precisa ser igual ou maior que o inicial.");
        if (request.Valor < 0)
            throw new ArgumentException("O valor não pode ser negativo.");
        if (request.Valor > ValorMaximo)
            throw new ArgumentException("Valor acima do permitido.");

        return decimal.Round(request.Valor, 2, MidpointRounding.AwayFromZero);
    }

    private async Task ValidarSobreposicaoAsync(int tipoCarrinhoId, PrecoLocacaoUpsertRequest request, int? idAtual, CancellationToken ct)
    {
        var outra = await _db.PrecoLocacoes
            .Where(p => p.CdtipoCarrinho == tipoCarrinhoId
                && p.CdprecoLocacao != (idAtual ?? 0)
                && p.MinimoMinutos <= request.MaximoMinutos
                && p.MaximoMinutos >= request.MinimoMinutos)
            .OrderBy(p => p.MinimoMinutos)
            .Select(p => new { p.MinimoMinutos, p.MaximoMinutos, p.Valor })
            .FirstOrDefaultAsync(ct);

        if (outra is not null)
            throw new InvalidOperationException(
                $"Essa faixa cobre minutos da faixa de {outra.MinimoMinutos} a {outra.MaximoMinutos} minutos " +
                $"({Moeda(outra.Valor)}). Ajuste os tempos para as faixas não se cruzarem.");
    }

    /// <summary>Formata em reais sem depender da cultura do servidor, como a LocacaoService.</summary>
    private static string Moeda(decimal valor)
        => "R$ " + valor.ToString("N2", CultureInfo.InvariantCulture).Replace(",", "#").Replace(".", ",").Replace("#", ".");

    private static PrecoLocacaoDto ParaDto(PrecoLocacao p) => new()
    {
        Id = p.CdprecoLocacao,
        TipoCarrinhoId = p.CdtipoCarrinho,
        MinimoMinutos = p.MinimoMinutos,
        MaximoMinutos = p.MaximoMinutos,
        Valor = p.Valor,
    };
}
