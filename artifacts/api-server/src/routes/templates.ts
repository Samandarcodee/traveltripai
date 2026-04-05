import { Router } from "express";
import { db } from "@workspace/db";
import { templatesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/templates", async (req, res) => {
  try {
    const templates = await db.select().from(templatesTable).orderBy(templatesTable.sortOrder, templatesTable.id);
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

router.post("/templates", async (req, res) => {
  try {
    const { category = "general", title, content, sortOrder = 0 } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "title and content are required" });
    }
    const [template] = await db.insert(templatesTable).values({ category, title, content, sortOrder }).returning();
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: "Failed to create template" });
  }
});

router.patch("/templates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { category, title, content, sortOrder } = req.body;
    const updateData: Record<string, unknown> = {};
    if (category !== undefined) updateData.category = category;
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    const [template] = await db.update(templatesTable).set(updateData).where(eq(templatesTable.id, id)).returning();
    if (!template) return res.status(404).json({ error: "Template not found" });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: "Failed to update template" });
  }
});

router.delete("/templates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deleted] = await db.delete(templatesTable).where(eq(templatesTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Template not found" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete template" });
  }
});

export default router;
