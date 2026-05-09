import app from "./app";
import { logger } from "./lib/logger";
import { initFromSession } from "./services/telegram-account.js";

const port = Number(process.env["PORT"] ?? 4000);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env["PORT"]}"`);
}

app.listen(port, () => {
  logger.info({ port }, "Server listening");

  initFromSession().catch((e) => {
    logger.warn({ err: e }, "Telegram account init skipped");
  });
});
