import { Router, type IRouter } from "express";
import { db, conversationsTable, messagesTable, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import * as telegramAccount from "../services/telegram-account.js";
import { buildSalesPrompt } from "../lib/sales-prompt.js";
import { logger } from "../lib/logger.js";
import { sendTelegramMessage } from "../services/telegram-client.js";
import crypto from "crypto";

const router: IRouter = Router();

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row?.value ?? null;
}

/**
 * Verify Telegram webhook signature
 * Telegram signs all requests with X-Telegram-Bot-Api-Secret-Token header
 */
function verifyTelegramWebhook(req: any, token: string): boolean {
  const secretToken = req.headers["x-telegram-bot-api-secret-token"];

  if (!secretToken || !token) {
    logger.warn("Missing webhook token or secret header");
    return false;
  }

  if (secretToken !== token) {
    logger.warn({ provided: secretToken?.slice(0, 8), expected: token.slice(0, 8) }, "Invalid webhook signature");
    return false;
  }

  return true;
}

router.post("/telegram/webhook", async (req, res): Promise<void> => {
  try {
    const token = await getSetting("telegram_webhook_secret");

    if (token && !verifyTelegramWebhook(req, token)) {
      logger.error("Telegram webhook signature verification failed");
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    res.status(200).json({ ok: true });

    // Process webhook asynchronously (non-blocking response)
    processWebhookAsync(req.body).catch((err) => {
      logger.error({ error: err }, "Webhook processing failed");
    });
  } catch (err) {
    logger.error({ error: err }, "Webhook handler error");
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

async function processWebhookAsync(update: any): Promise<void> {
  const message = update?.message || update?.channel_post;
  if (!message) return;

  const chatId = String(message.chat?.id);
  const text = message.text;
  const firstName = message.from?.first_name ?? "";
  const lastName = message.from?.last_name ?? "";
  const username = message.from?.username ?? "";
  const customerName = [firstName, lastName].filter(Boolean).join(" ") || username || `Telegram User ${chatId}`;

  if (!text || text.startsWith("/")) {
    if (text === "/start") {
      const token = await getSetting("telegram_bot_token");
      if (token) {
        try {
          await sendTelegramMessage(
            token,
            chatId,
            `Assalomu alaykum! OKSTours AI Agentiga xush kelibsiz. Savolingizni yozing — men yordam beraman! ✈️`,
          );
        } catch (err) {
          logger.warn({ error: err }, "Failed to send start message");
        }
      }
    }
    return;
  }

  const { db: _db, conversationsTable: _ct, messagesTable: _mt, leadsTable, activityTable } = await import("@workspace/db");
  const { and } = await import("drizzle-orm");

  let [conversation] = await _db.select().from(_ct).where(
    and(eq(_ct.channel, "telegram"), eq(_ct.externalId, chatId)),
  );

  if (!conversation) {
    const [lead] = await _db
      .insert(leadsTable)
      .values({
        name: customerName,
        segment: "cold",
        status: "new",
        leadSource: "telegram",
      })
      .returning();

    const [newConv] = await _db
      .insert(_ct)
      .values({
        channel: "telegram",
        status: "active",
        customerName,
        externalId: chatId,
        leadId: lead.id,
      })
      .returning();
    conversation = newConv;

    await _db.update(leadsTable).set({ conversationId: newConv.id }).where(eq(leadsTable.id, lead.id));

    await _db.insert(activityTable).values({
      type: "new_lead",
      description: `Telegram: новый клиент ${customerName}`,
      conversationId: newConv.id,
      leadId: lead.id,
    });
  }

  if (conversation.operatorMode === 1) {
    await _db.insert(_mt).values({ conversationId: conversation.id, role: "user", content: text });
    await _db
      .update(_ct)
      .set({ lastMessage: text, lastMessageAt: new Date() })
      .where(eq(_ct.id, conversation.id));
    return;
  }

  await _db.insert(_mt).values({ conversationId: conversation.id, role: "user", content: text });

  const history = await _db.select().from(_mt).where(eq(_mt.conversationId, conversation.id)).orderBy(_mt.createdAt);

  const systemPrompt = await buildSalesPrompt();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      ...history
        .slice(-20)
        .map((m) => ({
          role: m.role === "operator" ? "assistant" : ("user" as const),
          content: m.content,
        })),
    ],
    max_tokens: 500,
  });

  const aiReply = completion.choices[0]?.message?.content ?? "Kechirasiz, hozir javob bera olmayapman.";

  await _db.insert(_mt).values({ conversationId: conversation.id, role: "assistant", content: aiReply });
  await _db
    .update(_ct)
    .set({ lastMessage: aiReply, lastMessageAt: new Date() })
    .where(eq(_ct.id, conversation.id));

  await _db.insert(activityTable).values({
    type: "new_message",
    description: `Telegram: ${customerName} — "${text.slice(0, 60)}"`,
    conversationId: conversation.id,
    leadId: conversation.leadId ?? undefined,
  });

  const token = await getSetting("telegram_bot_token");
  if (token) {
    try {
      await sendTelegramMessage(token, chatId, aiReply);
    } catch (err) {
      logger.warn({ error: err }, "Failed to send AI response");
    }
  }
}

router.post("/telegram/account/connect", async (req, res): Promise<void> => {
  const { phone, apiId, apiHash } = req.body;

  if (!phone || !apiId || !apiHash) {
    res.status(400).json({ status: "error", error: "phone, apiId va apiHash majburiy" });
    return;
  }

  const result = await telegramAccount.startAuth(String(phone).trim(), Number(apiId), String(apiHash).trim());
  res.json(result);
});

router.post("/telegram/account/verify", async (req, res): Promise<void> => {
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ status: "error", error: "Kod kiritilmagan" });
    return;
  }

  const result = await telegramAccount.verifyCode(String(code).trim());
  res.json(result);
});

router.post("/telegram/account/verify-2fa", async (req, res): Promise<void> => {
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ status: "error", error: "Parol kiritilmagan" });
    return;
  }

  const result = await telegramAccount.verify2FA(String(password));
  res.json(result);
});

router.delete("/telegram/account", async (_req, res): Promise<void> => {
  await telegramAccount.disconnectAccount();
  res.json({ ok: true });
});

export { getSetting, sendBotMessage as sendTelegramMessage };
export default router;
