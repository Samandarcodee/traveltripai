import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, conversationsTable, messagesTable, activityTable, settingsTable, leadsTable } from "@workspace/db";
import {
  ListConversationsQueryParams,
  CreateConversationBody,
  GetConversationParams,
  UpdateConversationParams,
  UpdateConversationBody,
  GetConversationMessagesParams,
  OperatorReplyParams,
  OperatorReplyBody,
  SendFollowUpParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import * as telegramAccount from "../services/telegram-account.js";

async function sendToTelegram(externalId: string, text: string): Promise<void> {
  if (telegramAccount.isConnected()) {
    const sent = await telegramAccount.sendMessageToUser(externalId, text);
    if (sent) return;
  }
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "telegram_bot_token"));
  const token = row?.value;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: externalId, text }),
    });
  } catch {}
}

const router: IRouter = Router();

function formatConv(c: typeof conversationsTable.$inferSelect) {
  return {
    ...c,
    operatorMode: c.operatorMode === 1,
    lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function formatMsg(m: typeof messagesTable.$inferSelect) {
  return { ...m, createdAt: m.createdAt.toISOString() };
}

router.get("/conversations", async (req, res): Promise<void> => {
  const params = ListConversationsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let query = db.select().from(conversationsTable).$dynamic();
  if (params.data.status) {
    query = query.where(eq(conversationsTable.status, params.data.status));
  }

  const conversations = await query.orderBy(desc(conversationsTable.updatedAt));
  res.json(conversations.map(formatConv));
});

router.post("/conversations", async (req, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [conversation] = await db.insert(conversationsTable).values(parsed.data).returning();
  res.status(201).json(formatConv(conversation));
});

router.get("/conversations/:id", async (req, res): Promise<void> => {
  const params = GetConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conversation] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, params.data.id));
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const messages = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(messagesTable.createdAt);

  res.json({ ...formatConv(conversation), messages: messages.map(formatMsg) });
});

router.patch("/conversations/:id", async (req, res): Promise<void> => {
  const params = UpdateConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateConversationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...body.data };
  if (body.data.operatorMode !== undefined) {
    updateData.operatorMode = body.data.operatorMode ? 1 : 0;
  }

  const [conversation] = await db.update(conversationsTable)
    .set(updateData)
    .where(eq(conversationsTable.id, params.data.id))
    .returning();

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.json(formatConv(conversation));
});

router.get("/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = GetConversationMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const messages = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(messagesTable.createdAt);

  res.json(messages.map(formatMsg));
});

// ─── OPERATOR REPLY ──────────────────────────────────────────────────────────
router.post("/conversations/:id/operator-reply", async (req, res): Promise<void> => {
  const params = OperatorReplyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = OperatorReplyBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [conversation] = await db.select().from(conversationsTable)
    .where(eq(conversationsTable.id, params.data.id));
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const [message] = await db.insert(messagesTable).values({
    conversationId: params.data.id,
    role: "operator",
    content: body.data.content,
  }).returning();

  await db.update(conversationsTable)
    .set({ lastMessage: body.data.content, lastMessageAt: new Date(), operatorMode: 1 })
    .where(eq(conversationsTable.id, params.data.id));

  await db.insert(activityTable).values({
    type: "operator_reply",
    description: `Operator javob berdi: "${body.data.content.slice(0, 60)}${body.data.content.length > 60 ? "..." : ""}"`,
    conversationId: params.data.id,
    leadId: conversation.leadId ?? undefined,
  });

  // Update lead status to "contacted" when operator replies
  if (conversation.leadId) {
    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, conversation.leadId));
    if (lead && lead.status === "new") {
      await db.update(leadsTable)
        .set({ status: "contacted" })
        .where(eq(leadsTable.id, conversation.leadId));
    }
  }

  if (conversation.channel === "telegram" && conversation.externalId) {
    await sendToTelegram(conversation.externalId, body.data.content);
  }

  res.json(formatMsg(message));
});

// ─── SMART FOLLOW-UP ─────────────────────────────────────────────────────────
router.post("/conversations/:id/follow-up", async (req, res): Promise<void> => {
  const params = SendFollowUpParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conversation] = await db.select().from(conversationsTable)
    .where(eq(conversationsTable.id, params.data.id));
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  // Get lead info for personalized follow-up
  let leadContext = "";
  if (conversation.leadId) {
    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, conversation.leadId));
    if (lead) {
      const parts = [];
      if (lead.destination) parts.push(`Yo'nalish: ${lead.destination}`);
      if (lead.budget) parts.push(`Budjet: ${lead.budget}`);
      if (lead.departureDate) parts.push(`Sana: ${lead.departureDate}`);
      if (lead.segment) parts.push(`Segment: ${lead.segment}`);
      if (lead.status) parts.push(`Status: ${lead.status}`);
      if (parts.length > 0) leadContext = `\nMijoz ma'lumotlari: ${parts.join(", ")}`;
    }
  }

  // Get last few messages for context
  const recentMessages = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(desc(messagesTable.createdAt))
    .limit(5);

  const lastContext = recentMessages.reverse().map((m) =>
    `${m.role === "user" ? "Mijoz" : "Agent"}: ${m.content.slice(0, 100)}`
  ).join("\n");

  const customerName = conversation.customerName ?? "mijoz";
  const channel = conversation.channel;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Siz OKSTours kompaniyasining sotuv menejeri agentsiz.
Mijoz javob bermadi (30 daqiqa o'tdi). Ularni qayta qiziqtiradigan qisqa follow-up xabar yozing.
${leadContext}

QOIDALAR:
- Qisqa (1-2 gap)
- Urgentlik yoki qiymat taklif qiling
- Agar yo'nalish ma'lum bo'lsa — u haqida konkret eslatma qiling
- Agar narx so'ralgan bo'lsa — "narxlar hali o'zgarmadi" deng
- Savol bilan tugatadi (javob berishga undash uchun)
- Mijoz tilida yozing

Suhbat konteksti:
${lastContext}

FAQAT XABAR MATNINI YOZING, boshqa narsa yozmang.`,
      },
      {
        role: "user",
        content: `Mijoz: ${customerName}. Kanal: ${channel}. Follow-up yozing.`,
      },
    ],
    max_tokens: 200,
  });

  const followUpText = completion.choices[0]?.message?.content ??
    `Salom ${customerName}! Savolingiz bormi? Yordam berishga tayyorman 😊`;

  const [message] = await db.insert(messagesTable).values({
    conversationId: params.data.id,
    role: "assistant",
    content: followUpText,
  }).returning();

  await db.update(conversationsTable)
    .set({ lastMessage: followUpText, lastMessageAt: new Date() })
    .where(eq(conversationsTable.id, params.data.id));

  await db.insert(activityTable).values({
    type: "follow_up",
    description: `Follow-up yuborildi: ${conversation.customerName ?? "Noma'lum mijoz"}`,
    conversationId: params.data.id,
    leadId: conversation.leadId ?? undefined,
  });

  // Send follow-up to Telegram if applicable
  if (conversation.channel === "telegram" && conversation.externalId) {
    await sendToTelegram(conversation.externalId, followUpText);
  }

  res.json(formatMsg(message));
});

export default router;
