-- =====================================================================================
-- Índice em Locacao por data de devolução (Dashboard por período)
-- =====================================================================================
-- O faturamento do Dashboard é o das locações devolvidas no período escolhido (o valor é
-- cobrado na devolução). Sem índice em DTDevolucao, cada abertura do Dashboard lê a tabela
-- Locacao inteira (centenas de milhares de linhas). Com este índice, lê só as locações do
-- período, e já com o valor junto (INCLUDE), sem voltar à tabela.
--
-- Rode também o 002_indices_locacao_caixa.sql, se ainda não rodou: ele cobre o fechamento,
-- o Fluxo de Caixa e a lista de locações em andamento.
--
-- Seguro em produção: não altera dados, só acelera leituras. A criação pode levar de alguns
-- segundos a poucos minutos; se possível, rode num horário de menor uso. É idempotente.
--
-- Como rodar: abra no SQL Server Management Studio (SSMS), conectado no banco do BabyFrota,
-- e execute (F5).
-- =====================================================================================

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_Locacao_DTDevolucao' AND object_id = OBJECT_ID('dbo.Locacao')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Locacao_DTDevolucao
        ON dbo.Locacao (DTDevolucao)
        INCLUDE (ValorTotal);
    PRINT 'Índice IX_Locacao_DTDevolucao criado.';
END
ELSE
BEGIN
    PRINT 'Índice IX_Locacao_DTDevolucao já existe — nada a fazer.';
END
GO
