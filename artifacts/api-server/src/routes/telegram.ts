import { Router, type IRouter } from "express";
import { db, conversationsTable, messagesTable, leadsTable, activityTable, settingsTable, promotionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row?.value ?? null;
}

async function sendTelegramMessage(token: string, chatId: string | number, text: string): Promise<void> {
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
    `- ${p.title}: ${p.description}${p.discount ? ` (${p.discount})` : ""}${p.destination ? ` [${p.destination}]` : ""}${p.validUntil ? ` — ${p.validUntil} gacha` : ""}`
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
          await sendTelegramMessage(token, chatId, `Assalomu alaykum! OKSTours AI Agentiga xush kelibsiz. Savolingizni yozing — men yordam beraman! ✈️`);
        }
      }
      return;
    }

    let [conversation] = await db.select().from(conversationsTable).where(
      and(eq(conversationsTable.channel, "telegram"), eq(conversationsTable.externalId, chatId))
    );

    if (!conversation) {
      const [lead] = await db.insert(leadsTable).values({
        name: customerName,
        segment: "cold",
        status: "new",
        leadSource: "telegram",
      }).returning();

      const [newConv] = await db.insert(conversationsTable).values({
        channel: "telegram",
        status: "active",
        customerName,
        externalId: chatId,
        leadId: lead.id,
      }).returning();
      conversation = newConv;

      await db.insert(activityTable).values({
        type: "new_lead",
        description: `Telegram yangi mijoz: ${customerName}`,
        conversationId: newConv.id,
        leadId: lead.id,
      });
    }

    if (conversation.operatorMode === 1) {
      await db.insert(messagesTable).values({
        conversationId: conversation.id,
        role: "user",
        content: text,
      });
      await db.update(conversationsTable)
        .set({ lastMessage: text, lastMessageAt: new Date() })
        .where(eq(conversationsTable.id, conversation.id));
      return;
    }

    await db.insert(messagesTable).values({
      conversationId: conversation.id,
      role: "user",
      content: text,
    });

    const history = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, conversation.id))
      .orderBy(messagesTable.createdAt);

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

    await db.insert(messagesTable).values({
      conversationId: conversation.id,
      role: "assistant",
      content: aiReply,
    });

    await db.update(conversationsTable)
      .set({ lastMessage: aiReply, lastMessageAt: new Date() })
      .where(eq(conversationsTable.id, conversation.id));

    await db.insert(activityTable).values({
      type: "new_message",
      description: `Telegram xabar: ${customerName} — "${text.slice(0, 60)}"`,
      conversationId: conversation.id,
      leadId: conversation.leadId ?? undefined,
    });

    const token = await getSetting("telegram_bot_token");
    if (token) {
      await sendTelegramMessage(token, chatId, aiReply);
    }
  } catch (err) {
    console.error("Telegram webhook error:", err);
  }
});

export { getSetting, sendTelegramMessage };
export default router;
