import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/auth";
import { errorHandler } from "./middlewares/error-handler";
import { apiLimiter } from "./middlewares/rate-limiter";

const app: Express = express();

// Request logging
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : null; // null = allow all (development)

app.use(
  cors({
    origin: allowedOrigins
      ? (origin, cb) => {
          if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
          cb(new Error(`CORS: origin "${origin}" not allowed`));
        }
      : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  }),
);

// Security and size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
app.use("/api", apiLimiter);

// Authentication middleware (wraps auth to handle async errors)
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  try {
    authMiddleware(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Routes
app.use("/api", router);

const staticDir =
  process.env.STATIC_DIR ??
  path.resolve(__dirname, "../../okstours/dist/public");

if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    res.sendFile(path.join(staticDir, "index.html"));
  });
} else if (process.env.NODE_ENV === "production") {
  logger.warn({ staticDir }, "Static frontend directory not found");
}

// Error handler (must be last)
app.use(errorHandler);

export default app;
