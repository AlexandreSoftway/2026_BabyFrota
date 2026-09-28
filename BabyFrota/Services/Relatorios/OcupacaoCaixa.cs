using System.Globalization;
using BabyFrota.DTOs.Relatorios;

namespace BabyFrota.Services.Relatorios;

/// <summary>Caixa fechado, com a janela de tempo em que o carrinho podia ser alugado.</summary>
internal readonly record struct CaixaOcupacao(int Id, DateTime Abertura, DateTime Fechamento);

/// <summary>
/// Locação devolvida. É classe (e não record) de propósito: o cálculo do legado compara locações pela referência
/// (<c>item != itemAuxiliar</c>), e duas locações com os mesmos horários não podem ser tratadas como a mesma.
/// </summary>
internal sealed class LocacaoOcupacao
{
    public int Id { get; init; }
    public DateTime DtEntrega { get; init; }
    public DateTime DtDevolucao { get; init; }
    public decimal? ValorTotal { get; init; }
    public string DescricaoCarrinho { get; init; } = string.Empty;
    public string TipoCarrinho { get; init; } = string.Empty;
}

/// <summary>
/// Porta fiel de <c>NRelatorio.ConsultarHistoricoLocacoes</c> do legado (relatório "Histórico de Locações",
/// HistLocacoes.rdlc), com as mesmas distorções, para os números baterem com o legado:
/// <list type="bullet">
/// <item>"Minutos utilizados" soma a duração de todas as locações do dia, mesmo sobrepostas: o "% tempo utilizado" pode passar de 100%.</item>
/// <item>O preenchimento das faixas de hora segue o algoritmo original, inclusive onde ele sobrescreve ou passa de 60 minutos.</item>
/// </list>
/// Os textos saem formatados como o legado formatava, com a cultura pt-BR do Web.config.
/// </summary>
internal static class OcupacaoCaixa
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    /// <summary>Hora de início de cada uma das 17 faixas (Hora0809 … Hora2300, Hora0001).</summary>
    private static readonly int[] HorasDasFaixas = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0];

    public static List<HistoricoOcupacaoDto> Calcular(
        IEnumerable<CaixaOcupacao> caixas, IReadOnlyCollection<LocacaoOcupacao> locacoes, bool filtroPorCarrinho, bool filtroPorTipo)
    {
        var resultado = new List<HistoricoOcupacaoDto>();

        foreach (var cx in caixas)
        {
            var horas = new double[HorasDasFaixas.Length];

            var minDisponiveis = (cx.Fechamento - cx.Abertura).TotalMinutes;

            var locacoesCaixa = locacoes
                .Where(w => w.DtEntrega >= cx.Abertura && w.DtEntrega <= cx.Fechamento)
                .OrderBy(o => o.DtEntrega)
                .ThenBy(t => t.DtDevolucao)
                .ToList();

            var minUtilizados = locacoesCaixa.Count > 0 ? MinutosUtilizados(locacoesCaixa, horas) : 0;
            var minOciosos = minDisponiveis - minUtilizados;
            var pcUtilizados = minUtilizados > 0 ? (minUtilizados / minDisponiveis) * 100 : 0;
            var valorTotal = locacoesCaixa.Sum(s => s.ValorTotal) ?? 0m;
            var minTotais = locacoesCaixa.Sum(s => (s.DtDevolucao - s.DtEntrega).TotalMinutes);

            double totalManha = 0, totalTarde = 0, totalNoite = 0;
            string descricaoCarrinho, tipoCarrinho;

            if (locacoesCaixa.Count > 0)
            {
                totalManha = horas[0] + horas[1] + horas[2] + horas[3];
                totalTarde = horas[4] + horas[5] + horas[6] + horas[7] + horas[8] + horas[9];
                totalNoite = horas[10] + horas[11] + horas[12] + horas[13] + horas[14] + horas[15] + horas[16];

                if (filtroPorCarrinho)
                {
                    descricaoCarrinho = locacoesCaixa[0].DescricaoCarrinho;
                    tipoCarrinho = locacoesCaixa[0].TipoCarrinho;
                }
                else if (filtroPorTipo)
                {
                    tipoCarrinho = locacoesCaixa[0].TipoCarrinho;
                    descricaoCarrinho = "-";
                }
                else
                {
                    tipoCarrinho = "-";
                    descricaoCarrinho = "-";
                }
            }
            else
            {
                // Filtrando por carrinho ou tipo, o dia sem locação dele não entra no relatório.
                if (filtroPorCarrinho || filtroPorTipo)
                    continue;

                tipoCarrinho = "-";
                descricaoCarrinho = "-";
            }

            resultado.Add(new HistoricoOcupacaoDto
            {
                DescricaoCarrinho = descricaoCarrinho,
                TipoCarrinho = tipoCarrinho,
                NrDiaAno = cx.Abertura.DayOfYear.ToString(PtBr),
                NrSemanaAno = PtBr.Calendar
                    .GetWeekOfYear(cx.Abertura, CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Sunday)
                    .ToString(PtBr),
                DiaSemana = DiaDaSemana(cx.Abertura.DayOfWeek)[..3],
                Data = cx.Abertura.ToString("yyMMdd", CultureInfo.InvariantCulture),
                HoraAbertura = cx.Abertura.ToString("HH:mm", CultureInfo.InvariantCulture),
                HoraFechamento = cx.Fechamento.ToString("HH:mm", CultureInfo.InvariantCulture),
                // Sem formato no RDLC: sai o double como o .NET Framework escrevia (15 dígitos significativos).
                MinutosDisponiveis = minDisponiveis.ToString("G15", PtBr),
                MinutosUtilizados = minUtilizados.ToString("F2", PtBr),
                MinutosOciosos = minOciosos.ToString("F2", PtBr),
                PcTempoUtilizado = pcUtilizados.ToString("N2", PtBr) + " %",
                Quantidade = locacoesCaixa.Count.ToString(PtBr),
                VlFaturado = Moeda(valorTotal),
                TempoMedio = locacoesCaixa.Count > 0 ? (minTotais / locacoesCaixa.Count).ToString("N2", PtBr) : "0",
                ValorMedio = locacoesCaixa.Count > 0 ? Moeda(valorTotal / locacoesCaixa.Count) : "0",
                Faixas = horas.Select(minutos => TempoOcioso(minutos, 1)).ToList(),
                TotalManha = TempoOcioso(totalManha, 4),
                TotalTarde = TempoOcioso(totalTarde, 6),
                TotalNoite = TempoOcioso(totalNoite, 7),

                DataAbertura = cx.Abertura,
                QuantidadeLocacoes = locacoesCaixa.Count,
                ValorFaturado = valorTotal,
                MinutosDisponiveisValor = minDisponiveis,
                MinutosUtilizadosValor = minUtilizados,
            });
        }

        return resultado;
    }

    /// <summary>
    /// Expressão do RDLC <c>Format(DateAdd("s", minutos * -60, "0H:00:00"), "HH:mm:ss")</c>: as horas da faixa menos os
    /// minutos usados. O DateAdd do VB trunca a fração de segundo, e a data base é 01/01/0001, então voltar para antes
    /// da meia-noite dava erro de data, que o RDLC mostrava como "#Error".
    /// </summary>
    internal static string TempoOcioso(double minutosUsados, int horasDaFaixa)
    {
        var segundos = horasDaFaixa * 3600L + (long)Math.Truncate(minutosUsados * -60);
        return segundos < 0
            ? "#Error"
            : TimeSpan.FromSeconds(segundos).ToString(@"hh\:mm\:ss", CultureInfo.InvariantCulture);
    }

    /// <summary>"c" em pt-BR, com espaço comum depois do R$, como o .NET Framework do legado escrevia.</summary>
    private static string Moeda(decimal valor) => valor.ToString("C", PtBr).Replace(' ', ' ');

    private static string DiaDaSemana(DayOfWeek dia) => dia switch
    {
        DayOfWeek.Saturday => "Sábado",
        DayOfWeek.Sunday => "Domingo",
        DayOfWeek.Monday => "Segunda-Feira",
        DayOfWeek.Tuesday => "Terça-Feira",
        DayOfWeek.Wednesday => "Quarta-Feira",
        DayOfWeek.Thursday => "Quinta-Feira",
        _ => "Sexta-Feira",
    };

    // ---------- Daqui para baixo: RetornarMinutosUtilizados, PreencherHorario e PreencherPropHora do legado ----------

    private static double MinutosUtilizados(List<LocacaoOcupacao> lista, double[] horas)
    {
        var aux = lista.OrderBy(o => o.DtEntrega).ToList();
        var itemAuxiliar = aux[0];
        var contador = (itemAuxiliar.DtDevolucao - itemAuxiliar.DtEntrega).TotalMinutes;
        var horaAnterior = new DateTime();

        PreencherHorario(itemAuxiliar, horas, ref horaAnterior);

        foreach (var item in aux)
        {
            if (ReferenceEquals(item, itemAuxiliar))
                continue;

            if (item.DtEntrega > itemAuxiliar.DtEntrega && item.DtEntrega < itemAuxiliar.DtDevolucao && item.DtDevolucao > itemAuxiliar.DtDevolucao)
            {
                PreencherHorario(item, horas, ref horaAnterior);
                itemAuxiliar = item;
            }
            else if (item.DtDevolucao > itemAuxiliar.DtDevolucao)
            {
                PreencherHorario(item, horas, ref horaAnterior);
                itemAuxiliar = item;
            }

            contador += (item.DtDevolucao - item.DtEntrega).TotalMinutes;
        }

        return contador;
    }

    private static void PreencherHorario(LocacaoOcupacao item, double[] horas, ref DateTime horaAnterior)
    {
        for (var i = 0; i < HorasDasFaixas.Length; i++)
            horas[i] = MinutosNaFaixa(item, HorasDasFaixas[i], horas[i], horaAnterior);

        if (item.DtDevolucao > horaAnterior)
            horaAnterior = item.DtDevolucao;
    }

    private static double MinutosNaFaixa(LocacaoOcupacao item, int hora, double acumulado, DateTime horaAnterior)
    {
        var entrega = item.DtEntrega;
        var devolucao = item.DtDevolucao;

        if (entrega.Hour == hora && devolucao.Hour > hora)
        {
            if (acumulado >= 60)
                return 60;

            var fimDaHora = new DateTime(entrega.Year, entrega.Month, entrega.Day, hora + 1, 0, 0);
            var minutos = horaAnterior < entrega ? (fimDaHora - entrega).TotalMinutes : (fimDaHora - horaAnterior).TotalMinutes;
            return acumulado + minutos > 60 ? 60 : acumulado + minutos;
        }

        if (entrega.Hour == hora && devolucao.Hour == hora)
        {
            if (horaAnterior < entrega)
                return acumulado + (devolucao - entrega).TotalMinutes;
            if (horaAnterior > devolucao)
                return acumulado;
            return acumulado + (devolucao - horaAnterior).TotalMinutes;
        }

        if (entrega.Hour < hora && devolucao.Hour == hora)
        {
            if (acumulado >= 60)
                return 60;

            // Como no legado: usa a data da entrega (numa locação de mais de um dia a conta passa de 60 minutos).
            var inicioDaHora = new DateTime(entrega.Year, entrega.Month, entrega.Day, hora, 0, 0);
            return (devolucao - inicioDaHora).TotalMinutes;
        }

        if (entrega.Hour < hora && devolucao.Hour > hora)
            return 60;

        return acumulado > 0 ? acumulado : 0;
    }
}
