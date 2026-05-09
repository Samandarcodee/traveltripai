import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { ApiErrorException } from "./error-handler";

// Extend Express Request to include user context
declare global {
  namespace Express {
    interface Request {
      apiKey?: string;
    }
  }
}

// Allowed API keys (in production, fetch from database or environment)
// Format: process.env.API_KEYS (comma-separated list)
const getAllowedApiKeys = (): Set<string> => {
  const keysEnv = process.env.API_KEYS || "";
  return new Set(keysEnv.split(",").filter((k) => k.trim()));
};

// Verify API key from headers
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Always allow health checks
  if (req.path === "/health" || req.path === "/healthz") {
    next();
    return;
  }

  const allowedKeys = getAllowedApiKeys();

  // Skip auth entirely when no API_KEYS configured (local dev)
  if (allowedKeys.size === 0) {
    next();
    return;
  }

  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    logger.warn(
      { url: req.url, method: req.method },
      "Missing API key header",
    );
    throw new ApiErrorException(
      "MISSING_API_KEY",
      "API key is required (header: x-api-key)",
      401,
    );
  }

  if (!allowedKeys.has(apiKey)) {
    logger.warn(
      { url: req.url, method: req.method, apiKeyPrefix: apiKey.slice(0, 8) },
      "Invalid API key",
    );
    throw new ApiErrorException(
      "INVALID_API_KEY",
      "The provided API key is invalid",
      401,
    );
  }

  req.apiKey = apiKey;
  logger.debug({ apiKeyPrefix: apiKey.slice(0, 8) }, "API key authenticated");
  next();
};

// Optional: middleware to skip auth for specific routes (webhook, public endpoints)
export const skipAuth = (req: Request, res: Response, next: NextFunction): void => {
  next();
};
