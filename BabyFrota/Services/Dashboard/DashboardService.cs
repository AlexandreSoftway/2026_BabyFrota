using BabyFrota.Data;
using BabyFrota.Domain.Enums;
using BabyFrota.DTOs.Dashboard;
using Microsoft.EntityFrameworkCore;

namespace BabyFrota.Services.Dashboard;

/// <summary>
/// KPIs da home. Tudo sai em consultas agregadas (contagens e somas no banco), sem carregar locações na memória.
/// </summary>
public class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;

    public DashboardService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<DashboardResumoDto> ObterResumoAsync(DateTime? dataInicio, DateTime? dataFim, CancellationToken ct = default)
    {
        var inicio = (dataInicio ?? DateTime.Today).Date;
        var fim = (dataFim ?? DateTime.Today).Date;
        if (inicio > fim)
            throw new InvalidOperationException("A data inicial não pode ser depois da data final.");
        var limite = fim.AddDays(1);

        // ---- Agora ----
        var frota = await _db.Carrinhos
            .GroupBy(c => c.Cdstatus)
            .Select(g => new { Status = g.Key, Quantidade = g.Count() })
            .ToListAsync(ct);
        var totalCarrinhos = frota.Sum(f => f.Quantidade);
        var alugados = frota.Where(f => f.Status == (int)SituacaoCarrinho.Alugado).Sum(f => f.Quantidade);
        var disponiveis = frota.Where(f => f.Status == (int)SituacaoCarrinho.Disponivel).Sum(f => f.Quantidade);

        var caixaAbertoId = await _db.CaixaMovimentos
            .Where(c => c.Dtfechamento == null)
            .OrderByDescending(c => c.Dtabertura)
            .Select(c => (int?)c.CdcaixaMovimento)
            .FirstOrDefaultAsync(ct);

        decimal? faturamentoCaixaAtual = null;
        if (caixaAbertoId is not null)
        {
            faturamentoCaixaAtual = await _db.Locacoes
                .Where(l => l.CdcaixaMovimento == caixaAbertoId)
                .SumAsync(l => (decimal?)l.ValorTotal, ct) ?? 0m;
        }

        // ---- Período ----
        var entregues = await _db.Locacoes.CountAsync(l => l.Dtentrega >= inicio && l.Dtentrega < limite, ct);

        // O valor é cobrado na devolução: o faturamento do período é o das locações devolvidas nele.
        var devolvidas = await _db.Locacoes
            .Where(l => l.Dtdevolucao >= inicio && l.Dtdevolucao < limite)
            .GroupBy(_ => 1)
            .Select(g => new { Quantidade = g.Count(), Faturamento = g.Sum(l => l.ValorTotal ?? 0m) })
            .FirstOrDefaultAsync(ct);
        var qtdDevolvidas = devolvidas?.Quantidade ?? 0;
        var faturamento = devolvidas?.Faturamento ?? 0m;

        var topCarrinhos = await _db.Locacoes
            .Where(l => l.Dtentrega >= inicio && l.Dtentrega < limite)
            .GroupBy(l => l.CdcarrinhoNavigation.Descricao)
            .Select(g => new CarrinhoMaisLocadoDto
            {
                Descricao = g.Key,
                QuantidadeLocacoes = g.Count(),
            })
            .OrderByDescending(x => x.QuantidadeLocacoes)
            .Take(5)
            .ToListAsync(ct);

        return new DashboardResumoDto
        {
            TotalCarrinhos = totalCarrinhos,
            CarrinhosDisponiveis = disponiveis,
            CarrinhosAlugados = alugados,
            PercentualOcupacao = totalCarrinhos == 0 ? 0 : Math.Round(alugados * 100.0 / totalCarrinhos, 1),
            CaixaAberto = caixaAbertoId is not null,
            FaturamentoCaixaAtual = faturamentoCaixaAtual,
            DataInicio = inicio,
            DataFim = fim,
            LocacoesEntregues = entregues,
            LocacoesDevolvidas = qtdDevolvidas,
            Faturamento = faturamento,
            TicketMedio = qtdDevolvidas > 0 ? faturamento / qtdDevolvidas : 0m,
            TopCarrinhos = topCarrinhos,
        };
    }
}
