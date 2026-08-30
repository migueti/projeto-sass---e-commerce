import { describe, it, expect } from "vitest";
import {
  AppError,
  AuthenticationError,
  UnauthorizedError,
  PaymentRequiredError,
  NotFoundError,
  ValidationError,
  ConflictError,
  DependencyError,
  ConcurrencyError,
  ExternalServiceError,
  isAppError,
  getStatusCode,
} from "./errors";

describe("Custom Error Classes", () => {
  describe("AppError", () => {
    it("creates error with default status code", () => {
      const error = new AppError("Test error");
      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe("AppError");
    });

    it("creates error with custom status code", () => {
      const error = new AppError("Custom", 418);
      expect(error.statusCode).toBe(418);
    });

    it("converts to JSON", () => {
      const error = new AppError("Test", 400, "TEST_CODE");
      const json = error.toJSON();
      expect(json).toEqual({
        error: "AppError",
        message: "Test",
        errorCode: "TEST_CODE",
        statusCode: 400,
      });
    });
  });

  describe("AuthenticationError", () => {
    it("has 401 status code", () => {
      const error = new AuthenticationError();
      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe("AUTHENTICATION_ERROR");
    });
  });

  describe("UnauthorizedError", () => {
    it("has 403 status code", () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(403);
      expect(error.errorCode).toBe("UNAUTHORIZED_ERROR");
    });
  });

  describe("PaymentRequiredError", () => {
    it("has 402 status code", () => {
      const error = new PaymentRequiredError();
      expect(error.statusCode).toBe(402);
      expect(error.errorCode).toBe("PAYMENT_REQUIRED");
    });
  });

  describe("NotFoundError", () => {
    it("has 404 status code", () => {
      const error = new NotFoundError("Conta");
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain("Conta");
      expect(error.errorCode).toBe("NOT_FOUND");
    });
  });

  describe("ValidationError", () => {
    it("has 400 status code", () => {
      const error = new ValidationError("Email inválido");
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Email inválido");
      expect(error.errorCode).toBe("VALIDATION_ERROR");
    });
  });

  describe("ConflictError", () => {
    it("has 409 status code", () => {
      const error = new ConflictError("Categoria já existe");
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe("Categoria já existe");
      expect(error.errorCode).toBe("CONFLICT");
    });
  });

  describe("DependencyError", () => {
    it("has 409 status code", () => {
      const error = new DependencyError("Existem transações nesta conta");
      expect(error.statusCode).toBe(409);
      expect(error.errorCode).toBe("DEPENDENCY_ERROR");
    });
  });

  describe("ConcurrencyError", () => {
    it("has 409 status code", () => {
      const error = new ConcurrencyError();
      expect(error.statusCode).toBe(409);
      expect(error.errorCode).toBe("CONCURRENCY_ERROR");
    });
  });

  describe("ExternalServiceError", () => {
    it("has 502 status code", () => {
      const error = new ExternalServiceError("Mercado Pago");
      expect(error.statusCode).toBe(502);
      expect(error.errorCode).toBe("EXTERNAL_SERVICE_ERROR");
    });
  });

  describe("Helper functions", () => {
    it("isAppError identifies AppError instances", () => {
      const appError = new AppError("Test");
      const genericError = new Error("Test");

      expect(isAppError(appError)).toBe(true);
      expect(isAppError(genericError)).toBe(false);
      expect(isAppError("not an error")).toBe(false);
    });

    it("getStatusCode returns correct status from AppError", () => {
      const error = new PaymentRequiredError();
      expect(getStatusCode(error)).toBe(402);
    });

    it("getStatusCode returns 500 for generic Error", () => {
      const error = new Error("Generic");
      expect(getStatusCode(error)).toBe(500);
    });

    it("getStatusCode returns 500 for unknown", () => {
      expect(getStatusCode("unknown")).toBe(500);
    });
  });
});
