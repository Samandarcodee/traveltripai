import { Router, type IRouter } from "express";
import { db, conversationsTable, messagesTable, settingsTable, promotionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import * as telegramAccount from "../services/telegram-account.js";

const router: IRouter = Router();

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row?.value ?? null;
}

async function sendBotMessage(token: string, chatId: string | number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

const BASE_SYSTEM_PROMPT = `Siz OKSTours kompaniyasining rasmiy AI Agentsiz.
Sizning vazifangiz: aviabilet, tur paketlar, mehmonxona, transfer va vizaga oid savollarni qabul qilish, mijozga eng aniq javob berish, sotuvni oshirish.
Har doim qisqa, aniq va professional javob bering. O'zbek, rus yoki ingliz tilida javob bering (mijoz qaysi tilda yozsa).`;

async function buildSystemPrompt(): Promise<string> {
  const activePromos = await db.select().from(promotionsTable).where(eq(promotionsTable.active, 1)).limit(10);
  if (activePromos.length === 0) return BASE_SYSTEM_PROMPT;
  const promoText = activePromos.map((p) =>
    `- ${p.title}: ${p.description}${(p as any).discount ? ` (${(p as any).discount})` : ""}${(p as any).destination ? ` [${(p as any).destination}]` : ""}${(p as any).validUntil ? ` — ${(p as any).validUntil} gacha` : ""}`
  ).join("\n");
  return `${BASE_SYSTEM_PROMPT}\n\nFAOL AKSIYALAR:\n${promoText}`;
}

router.post("/telegram/webhook", async (req, res): Promise<void> => {
  res.status(200).json({ ok: true });

  try {
    const update = req.body;
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
          await sendBotMessage(token, chatId, `Assalomu alaykum! OKSTours AI Agentiga xush kelibsiz. Savolingizni yozing — men yordam beraman! ✈️`);
        }
      }
      return;
    }

    const { db: _db, conversationsTable: _ct, messagesTable: _mt, leadsTable, activityTable } = await import("@workspace/db");
    const { and } = await import("drizzle-orm");

    let [conversation] = await _db.select().from(_ct).where(
      and(eq(_ct.channel, "telegram"), eq(_ct.externalId, chatId))
    );

    if (!conversation) {
      const [lead] = await _db.insert(leadsTable).values({
        name: customerName,
        segment: "cold",
        status: "new",
        leadSource: "telegram",
      }).returning();

      const [newConv] = await _db.insert(_ct).values({
        channel: "telegram",
        status: "active",
        customerName,
        externalId: chatId,
        leadId: lead.id,
      }).returning();
      conversation = newConv;

      await _db.update(leadsTable)
        .set({ conversationId: newConv.id })
        .where(eq(leadsTable.id, lead.id));

      await _db.insert(activityTable).values({
        type: "new_lead",
        description: `Telegram bot yangi mijoz: ${customerName}`,
        conversationId: newConv.id,
        leadId: lead.id,
      });
    }

    if (conversation.operatorMode === 1) {
      await _db.insert(_mt).values({ conversationId: conversation.id, role: "user", content: text });
      await _db.update(_ct).set({ lastMessage: text, lastMessageAt: new Date() }).where(eq(_ct.id, conversation.id));
      return;
    }

    await _db.insert(_mt).values({ conversationId: conversation.id, role: "user", content: text });

    const history = await _db.select().from(_mt)
      .where(eq(_mt.conversationId, conversation.id))
      .orderBy(_mt.createdAt);

    const systemPrompt = await buildSystemPrompt();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-20).map((m) => ({
          role: m.role === "operator" ? "assistant" : (m.role as "user" | "assistant"),
          content: m.content,
        })),
      ],
      max_tokens: 500,
    });

    const aiReply = completion.choices[0]?.message?.content ?? "Kechirasiz, hozir javob bera olmayapman.";

    await _db.insert(_mt).values({ conversationId: conversation.id, role: "assistant", content: aiReply });
    await _db.update(_ct).set({ lastMessage: aiReply, lastMessageAt: new Date() }).where(eq(_ct.id, conversation.id));

    await _db.insert(activityTable).values({
      type: "new_message",
      description: `Telegram bot xabar: ${customerName} — "${text.slice(0, 60)}"`,
      conversationId: conversation.id,
      leadId: conversation.leadId ?? undefined,
    });

    const token = await getSetting("telegram_bot_token");
    if (token) {
      await sendBotMessage(token, chatId, aiReply);
    }
  } catch (err) {
    console.error("Telegram webhook error:", err);
  }
});

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
