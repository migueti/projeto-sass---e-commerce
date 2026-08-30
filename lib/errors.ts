/**
 * Custom Error Classes for Financial Application
 *
 * These custom errors provide type-safe, consistent error handling across
 * the application. Use these instead of throwing generic Error with string messages.
 *
 * Usage:
 *   throw new AuthenticationError("Sessão expirada");
 *   throw new UnauthorizedError("Recurso não pertence ao usuário");
 *   throw new PaymentRequiredError("Acesso pago necessário");
 */

/**
 * Base error class for all application errors.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly errorCode?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      errorCode: this.errorCode,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Thrown when user is not authenticated.
 * HTTP Status: 401
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Autenticação necessária") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

/**
 * Thrown when user doesn't have permission to access a resource.
 * HTTP Status: 403
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Acesso negado") {
    super(message, 403, "UNAUTHORIZED_ERROR");
  }
}

/**
 * Thrown when user doesn't have active paid plan access.
 * HTTP Status: 402
 */
export class PaymentRequiredError extends AppError {
  constructor(
    message: string = "Acesso pago necessário para esta ação",
  ) {
    super(message, 402, "PAYMENT_REQUIRED");
  }
}

/**
 * Thrown when a resource is not found.
 * HTTP Status: 404
 */
export class NotFoundError extends AppError {
  constructor(resource: string = "Recurso") {
    super(`${resource} não encontrado.`, 404, "NOT_FOUND");
  }
}

/**
 * Thrown when input validation fails.
 * HTTP Status: 400
 */
export class ValidationError extends AppError {
  constructor(message: string = "Dados inválidos") {
    super(message, 400, "VALIDATION_ERROR");
  }
}

/**
 * Thrown when a resource already exists (e.g., duplicate category name).
 * HTTP Status: 409
 */
export class ConflictError extends AppError {
  constructor(message: string = "Recurso já existe") {
    super(message, 409, "CONFLICT");
  }
}

/**
 * Thrown when a resource cannot be deleted due to related data.
 * HTTP Status: 409
 */
export class DependencyError extends AppError {
  constructor(message: string = "Não é possível deletar esse recurso") {
    super(message, 409, "DEPENDENCY_ERROR");
  }
}

/**
 * Thrown when a database transaction fails due to concurrency.
 * HTTP Status: 409
 */
export class ConcurrencyError extends AppError {
  constructor(message: string = "Conflito de concorrência. Tente novamente.") {
    super(message, 409, "CONCURRENCY_ERROR");
  }
}

/**
 * Thrown when an external service (e.g., payment gateway) fails.
 * HTTP Status: 502
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string = `Erro ao conectar com ${service}`,
  ) {
    super(message, 502, "EXTERNAL_SERVICE_ERROR");
  }
}

/**
 * Helper to determine if an error is an AppError with a specific status.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Helper to get HTTP status code from any error.
 */
export function getStatusCode(error: unknown): number {
  if (isAppError(error)) return error.statusCode;
  if (error instanceof Error) return 500;
  return 500;
}
