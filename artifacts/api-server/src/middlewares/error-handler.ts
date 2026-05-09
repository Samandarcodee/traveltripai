import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

// Custom error class for API errors
export class ApiErrorException extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiErrorException";
  }
}

// Global error handler middleware
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Handle custom API errors
  if (err instanceof ApiErrorException) {
    logger.error(
      {
        code: err.code,
        statusCode: err.statusCode,
        details: err.details,
        url: req.url,
        method: req.method,
      },
      `API Error: ${err.message}`,
    );

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(process.env.NODE_ENV !== "production" && err.details && { details: err.details }),
      },
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof SyntaxError && "body" in err) {
    logger.warn(
      { url: req.url, method: req.method, error: err.message },
      "Invalid JSON payload",
    );
    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_JSON",
        message: "Request body contains invalid JSON",
      },
    });
    return;
  }

  // Handle generic errors
  logger.error(
    {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      url: req.url,
      method: req.method,
    },
    "Unhandled error",
  );

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      ...(process.env.NODE_ENV !== "production" && {
        details: err instanceof Error ? err.message : String(err),
      }),
    },
  });
};
