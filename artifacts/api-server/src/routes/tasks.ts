import { Router, type IRouter } from "express";
import { db, tasksTable, activityTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function formatTask(t: typeof tasksTable.$inferSelect) {
  return {
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

router.get("/leads/:leadId/tasks", async (req, res): Promise<void> => {
  const leadId = Number(req.params.leadId);
  if (isNaN(leadId)) {
    res.status(400).json({ error: "Invalid leadId" });
    return;
  }
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.leadId, leadId)).orderBy(desc(tasksTable.createdAt));
  res.json(tasks.map(formatTask));
});

router.post("/leads/:leadId/tasks", async (req, res): Promise<void> => {
  const leadId = Number(req.params.leadId);
  if (isNaN(leadId)) {
    res.status(400).json({ error: "Invalid leadId" });
    return;
  }

  const { title, description, dueDate, status, priority, assignedTo } = req.body;
  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  const [task] = await db.insert(tasksTable).values({
    leadId,
    title,
    description: description ?? null,
    dueDate: dueDate ?? null,
    status: status ?? "open",
    priority: priority ?? "medium",
    assignedTo: assignedTo ?? null,
  }).returning();

  await db.insert(activityTable).values({
    type: "status_change",
    description: `Yangi vazifa yaratildi: "${title}"`,
    leadId,
  });

  res.status(201).json(formatTask(task));
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { title, description, dueDate, status, priority, assignedTo } = req.body;
  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (dueDate !== undefined) updateData.dueDate = dueDate;
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;
  if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

  const [task] = await db.update(tasksTable).set(updateData).where(eq(tasksTable.id, id)).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(formatTask(task));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.status(204).end();
});

export default router;
