import { Router, type IRouter } from "express";
import { desc, eq, sql, and, gte } from "drizzle-orm";
import { db, conversationsTable, leadsTable, messagesTable, activityTable } from "@workspace/db";
import { GetTimeSeriesQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stats/dashboard", async (_req, res): Promise<void> => {
  const [{ count: totalConversations }] = await db.select({ count: sql<number>`count(*)::int` }).from(conversationsTable);
  const [{ count: activeConversations }] = await db.select({ count: sql<number>`count(*)::int` }).from(conversationsTable).where(eq(conversationsTable.status, "active"));
  const [{ count: totalLeads }] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable);
  const [{ count: hotLeads }] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable).where(eq(leadsTable.segment, "hot"));
  const [{ count: warmLeads }] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable).where(eq(leadsTable.segment, "warm"));
  const [{ count: coldLeads }] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable).where(eq(leadsTable.segment, "cold"));
  const [{ count: bookedLeads }] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable).where(eq(leadsTable.status, "booked"));

  const channelBreakdown = await db.select({
    channel: conversationsTable.channel,
    count: sql<number>`count(*)::int`,
  }).from(conversationsTable).groupBy(conversationsTable.channel);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [{ count: todayMessages }] = await db.select({ count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .where(gte(messagesTable.createdAt, todayStart));

  res.json({
    totalConversations,
    activeConversations,
    totalLeads,
    hotLeads,
    warmLeads,
    coldLeads,
    bookedLeads,
    channelBreakdown,
    todayMessages,
  });
});

router.get("/stats/activity", async (_req, res): Promise<void> => {
  const activity = await db.select().from(activityTable)
    .orderBy(desc(activityTable.createdAt))
    .limit(20);

  res.json(activity.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  })));
});

router.get("/stats/time-series", async (req, res): Promise<void> => {
  const params = GetTimeSeriesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const period = params.data.period ?? "daily";

  let days = 30;
  if (period === "weekly") days = 84;
  if (period === "monthly") days = 365;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const groupFn =
    period === "monthly"
      ? sql`to_char(date_trunc('month', created_at), 'YYYY-MM')`
      : period === "weekly"
      ? sql`to_char(date_trunc('week', created_at), 'YYYY-MM-DD')`
      : sql`to_char(date_trunc('day', created_at), 'YYYY-MM-DD')`;

  const msgRows = await db
    .select({ date: groupFn.as("date"), count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .where(gte(messagesTable.createdAt, startDate))
    .groupBy(groupFn)
    .orderBy(groupFn);

  const leadRows = await db
    .select({ date: groupFn.as("date"), count: sql<number>`count(*)::int` })
    .from(leadsTable)
    .where(gte(leadsTable.createdAt, startDate))
    .groupBy(groupFn)
    .orderBy(groupFn);

  const bookRows = await db
    .select({ date: groupFn.as("date"), count: sql<number>`count(*)::int` })
    .from(leadsTable)
    .where(and(gte(leadsTable.createdAt, startDate), eq(leadsTable.status, "booked")))
    .groupBy(groupFn)
    .orderBy(groupFn);

  const dateSet = new Set<string>();
  msgRows.forEach((r) => dateSet.add(String(r.date)));
  leadRows.forEach((r) => dateSet.add(String(r.date)));
  bookRows.forEach((r) => dateSet.add(String(r.date)));

  const msgMap = new Map(msgRows.map((r) => [String(r.date), r.count]));
  const leadMap = new Map(leadRows.map((r) => [String(r.date), r.count]));
  const bookMap = new Map(bookRows.map((r) => [String(r.date), r.count]));

  const sortedDates = Array.from(dateSet).sort();

  const data = sortedDates.map((date) => ({
    date,
    messages: msgMap.get(date) ?? 0,
    leads: leadMap.get(date) ?? 0,
    bookings: bookMap.get(date) ?? 0,
  }));

  const totalMessages = data.reduce((s, d) => s + d.messages, 0);
  const totalLeads = data.reduce((s, d) => s + d.leads, 0);
  const totalBookings = data.reduce((s, d) => s + d.bookings, 0);

  res.json({ period, data, totalMessages, totalLeads, totalBookings });
});

export default router;
