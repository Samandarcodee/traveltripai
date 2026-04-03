import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, promotionsTable } from "@workspace/db";
import { CreatePromotionBody, DeletePromotionParams } from "@workspace/api-zod";

const router: IRouter = Router();

function formatPromo(p: typeof promotionsTable.$inferSelect) {
  return {
    ...p,
    active: p.active === 1,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/promotions", async (_req, res): Promise<void> => {
  const promotions = await db.select().from(promotionsTable)
    .orderBy(desc(promotionsTable.createdAt));
  res.json(promotions.map(formatPromo));
});

router.post("/promotions", async (req, res): Promise<void> => {
  const parsed = CreatePromotionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [promo] = await db.insert(promotionsTable).values({
    title: parsed.data.title,
    description: parsed.data.description,
    discount: parsed.data.discount ?? null,
    destination: parsed.data.destination ?? null,
    validUntil: parsed.data.validUntil ?? null,
    active: 1,
  }).returning();

  res.status(201).json(formatPromo(promo));
});

router.delete("/promotions/:id", async (req, res): Promise<void> => {
  const params = DeletePromotionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(promotionsTable)
    .where(eq(promotionsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Promotion not found" });
    return;
  }

  res.status(204).end();
});

export default router;
