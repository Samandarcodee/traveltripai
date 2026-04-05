import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row?.value ?? null;
}

async function setSetting(key: string, value: string | null): Promise<void> {
  await db
    .insert(settingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
}

router.get("/settings", async (_req, res): Promise<void> => {
  const token = await getSetting("telegram_bot_token");
  const webhookUrl = await getSetting("telegram_webhook_url");
  const botUsername = await getSetting("telegram_bot_username");
  const operatorName = await getSetting("operator_name");
  const companyName = await getSetting("company_name");

  res.json({
    telegramBotToken: token ? token.slice(0, 6) + "..." + token.slice(-4) : null,
    telegramWebhookUrl: webhookUrl,
    telegramBotUsername: botUsername,
    telegramConnected: !!token && !!botUsername,
    operatorName,
    companyName,
  });
});

router.put("/settings", async (req, res): Promise<void> => {
  const { telegramBotToken, telegramWebhookUrl, operatorName, companyName } = req.body;

  if (telegramBotToken !== undefined) {
    await setSetting("telegram_bot_token", telegramBotToken);
    if (!telegramBotToken) {
      await setSetting("telegram_bot_username", null);
    }
  }
  if (telegramWebhookUrl !== undefined) await setSetting("telegram_webhook_url", telegramWebhookUrl);
  if (operatorName !== undefined) await setSetting("operator_name", operatorName);
  if (companyName !== undefined) await setSetting("company_name", companyName);

  const token = await getSetting("telegram_bot_token");
  const webhookUrl = await getSetting("telegram_webhook_url");
  const botUsername = await getSetting("telegram_bot_username");
  const opName = await getSetting("operator_name");
  const coName = await getSetting("company_name");

  res.json({
    telegramBotToken: token ? token.slice(0, 6) + "..." + token.slice(-4) : null,
    telegramWebhookUrl: webhookUrl,
    telegramBotUsername: botUsername,
    telegramConnected: !!token && !!botUsername,
    operatorName: opName,
    companyName: coName,
  });
});

router.post("/settings/telegram/test", async (_req, res): Promise<void> => {
  const token = await getSetting("telegram_bot_token");

  if (!token) {
    res.json({ ok: false, error: "Bot token kiritilmagan" });
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json() as any;

    if (data.ok) {
      await setSetting("telegram_bot_username", data.result.username);
      res.json({
        ok: true,
        botUsername: data.result.username,
        botName: data.result.first_name,
      });
    } else {
      res.json({ ok: false, error: data.description ?? "Bot token noto'g'ri" });
    }
  } catch {
    res.json({ ok: false, error: "Telegram API ga ulanib bo'lmadi" });
  }
});

export { getSetting };
export default router;
