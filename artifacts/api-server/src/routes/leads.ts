import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, leadsTable, conversationsTable, messagesTable, activityTable } from "@workspace/db";
import {
  ListLeadsQueryParams,
  CreateLeadBody,
  GetLeadParams,
  UpdateLeadParams,
  UpdateLeadBody,
  BookLeadParams,
  BookLeadBody,
} from "@workspace/api-zod";

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

export default router;
