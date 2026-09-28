using BabyFrota.Services.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace BabyFrota.Api.Middleware;

/// <summary>
/// Converte exceções de negócio lançadas pelos Services em respostas HTTP padronizadas (ProblemDetails),
/// evitando try/catch repetido em cada Controller.
/// </summary>
public class ApiExceptionHandler : IExceptionHandler
{
    private readonly ILogger<ApiExceptionHandler> _logger;

    public ApiExceptionHandler(ILogger<ApiExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (status, title) = exception switch
        {
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Não autorizado"),
            AcessoNegadoException => (StatusCodes.Status403Forbidden, "Acesso negado"),
            KeyNotFoundException => (StatusCodes.Status404NotFound, "Recurso não encontrado"),
            InvalidOperationException => (StatusCodes.Status400BadRequest, "Operação inválida"),
            ArgumentException => (StatusCodes.Status400BadRequest, "Requisição inválida"),
            _ => (StatusCodes.Status500InternalServerError, "Erro interno"),
        };

        if (status == StatusCodes.Status500InternalServerError)
            _logger.LogError(exception, "Erro não tratado em {Path}", httpContext.Request.Path);

        httpContext.Response.StatusCode = status;

        await httpContext.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = exception.Message,
            Instance = httpContext.Request.Path,
        }, cancellationToken);

        return true;
    }
}

/// <summary>
/// Corpo do 403 quando uma política de perfil (<see cref="Security.PerfilRequirement"/>) recusa o acesso — mesmo formato
/// ProblemDetails do <see cref="ApiExceptionHandler"/>, para a tela mostrar uma mensagem, e não um erro genérico.
/// </summary>
public class AcessoNegadoResultHandler : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler _padrao = new();

    public async Task HandleAsync(
        RequestDelegate next, HttpContext context, AuthorizationPolicy policy, PolicyAuthorizationResult authorizeResult)
    {
        if (!authorizeResult.Forbidden)
        {
            await _padrao.HandleAsync(next, context, policy, authorizeResult);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = StatusCodes.Status403Forbidden,
            Title = "Acesso negado",
            Detail = "Seu perfil não tem permissão para acessar este recurso.",
            Instance = context.Request.Path,
        });
    }
}
