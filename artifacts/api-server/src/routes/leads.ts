import { Router, type IRouter } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import { db, leadsTable, conversationsTable, messagesTable, activityTable, settingsTable } from "@workspace/db";
import {
  ListLeadsQueryParams,
  CreateLeadBody,
  GetLeadParams,
  UpdateLeadParams,
  UpdateLeadBody,
  BookLeadParams,
  BookLeadBody,
} from "@workspace/api-zod";
import * as telegramAccount from "../services/telegram-account.js";

const router: IRouter = Router();

function formatLead(l: typeof leadsTable.$inferSelect) {
  return {
    ...l,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

router.get("/leads", async (req, res): Promise<void> => {
  const params = ListLeadsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let query = db.select().from(leadsTable).$dynamic();

  if (params.data.segment) {
    query = query.where(eq(leadsTable.segment, params.data.segment));
  }

  const leads = await query.orderBy(desc(leadsTable.updatedAt));
  res.json(leads.map(formatLead));
});

router.post("/leads", async (req, res): Promise<void> => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lead] = await db.insert(leadsTable).values(parsed.data).returning();
  res.status(201).json(formatLead(lead));
});

router.get("/leads/:id", async (req, res): Promise<void> => {
  const params = GetLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, params.data.id));

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(formatLead(lead));
});

router.patch("/leads/:id", async (req, res): Promise<void> => {
  const params = UpdateLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateLeadBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [lead] = await db.update(leadsTable)
    .set(body.data)
    .where(eq(leadsTable.id, params.data.id))
    .returning();

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(formatLead(lead));
});

router.post("/leads/:id/book", async (req, res): Promise<void> => {
  const params = BookLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = BookLeadBody.safeParse(req.body ?? {});
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, params.data.id));
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  const updateData: Record<string, unknown> = { status: "booked", segment: "hot" };
  if (body.data.notes) {
    updateData.notes = (lead.notes ?? "") + "\n[Bron]: " + body.data.notes;
  }

  const [updatedLead] = await db.update(leadsTable)
    .set(updateData)
    .where(eq(leadsTable.id, params.data.id))
    .returning();

  const confirmationText = `Hurmatli ${lead.name ?? "mijoz"}, broningiz muvaffaqiyatli tasdiqlandi! ✈️ ${body.data.travelDate ? `Sayohat sanasi: ${body.data.travelDate}.` : ""} Barcha tafsilotlarni OKSTours jamoasi bilan bog'laning. Yaxshi sayohat!`;

  if (lead.conversationId) {
    await db.insert(messagesTable).values({
      conversationId: lead.conversationId,
      role: "assistant",
      content: confirmationText,
    });
    await db.update(conversationsTable)
      .set({ lastMessage: confirmationText, lastMessageAt: new Date() })
      .where(eq(conversationsTable.id, lead.conversationId));
  }

  await db.insert(activityTable).values({
    type: "booking",
    description: `Bron tasdiqlandi: ${lead.name ?? "Noma'lum"} ${lead.destination ? `→ ${lead.destination}` : ""}`,
    conversationId: lead.conversationId ?? undefined,
    leadId: lead.id,
  });

  res.json(formatLead(updatedLead));
});

// ─── BULK MESSAGE (Mass Messaging) ───────────────────────────────────────────
router.post("/leads/bulk-message", async (req, res): Promise<void> => {
  const { leadIds, message } = req.body;

  if (!Array.isArray(leadIds) || leadIds.length === 0 || !message?.trim()) {
    res.status(400).json({ error: "leadIds (массив) и message обязательны" });
    return;
  }

  // Get bot token for Telegram fallback
  const [tokenRow] = await db.select().from(settingsTable).where(eq(settingsTable.key, "telegram_bot_token"));
  const botToken = tokenRow?.value ?? null;

  // Fetch leads with their conversations
  const leads = await db.select().from(leadsTable).where(inArray(leadsTable.id, leadIds));

  let sent = 0;
  let failed = 0;

  for (const lead of leads) {
    try {
      if (!lead.conversationId) { failed++; continue; }

      const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, lead.conversationId));
      if (!conv) { failed++; continue; }

      // Save message to conversation
      await db.insert(messagesTable).values({
        conversationId: conv.id,
        role: "assistant",
        content: message,
      });

      await db.update(conversationsTable).set({
        lastMessage: message,
        lastMessageAt: new Date(),
      }).where(eq(conversationsTable.id, conv.id));

      // Send via Telegram
      if (conv.channel === "telegram" && conv.externalId) {
        let delivered = false;

        if (telegramAccount.isConnected()) {
          delivered = await telegramAccount.sendMessageToUser(conv.externalId, message);
        }

        if (!delivered && botToken) {
          try {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: conv.externalId, text: message }),
            });
            delivered = true;
          } catch {}
        }

        if (delivered) sent++; else failed++;
      } else {
        // Non-telegram — message saved but not delivered externally
        sent++;
      }

      await db.insert(activityTable).values({
        type: "follow_up",
        description: `Массовая рассылка: "${message.slice(0, 60)}${message.length > 60 ? "..." : ""}"`,
        conversationId: conv.id,
        leadId: lead.id,
      });
    } catch {
      failed++;
    }
  }

  res.json({ ok: true, sent, failed, total: leads.length });
});

export default router;
