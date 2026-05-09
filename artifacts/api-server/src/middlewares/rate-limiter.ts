import rateLimit from "express-rate-limit";

// Rate limiter for general API endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/health" || req.path === "/healthz";
  },
});

// Stricter rate limiter for sensitive endpoints (Telegram webhook, bulk operations)
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Limit each IP to 1000 requests per hour
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict limiter for authentication/login attempts
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 attempts per 15 minutes
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
