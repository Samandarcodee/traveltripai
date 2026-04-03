import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, conversationsTable, leadsTable, messagesTable, activityTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats/dashboard", async (_req, res): Promise<void> => {
  const totalConversationsResult = await db.select({ count: sql<number>`count(*)::int` }).from(conversationsTable);
  const totalConversations = totalConversationsResult[0]?.count ?? 0;

  const activeConversationsResult = await db.select({ count: sql<number>`count(*)::int` })
    .from(conversationsTable)
    .where(eq(conversationsTable.status, "active"));
  const activeConversations = activeConversationsResult[0]?.count ?? 0;

  const totalLeadsResult = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable);
  const totalLeads = totalLeadsResult[0]?.count ?? 0;

  const hotLeadsResult = await db.select({ count: sql<number>`count(*)::int` })
    .from(leadsTable).where(eq(leadsTable.segment, "hot"));
  const hotLeads = hotLeadsResult[0]?.count ?? 0;

  const warmLeadsResult = await db.select({ count: sql<number>`count(*)::int` })
    .from(leadsTable).where(eq(leadsTable.segment, "warm"));
  const warmLeads = warmLeadsResult[0]?.count ?? 0;

  const coldLeadsResult = await db.select({ count: sql<number>`count(*)::int` })
    .from(leadsTable).where(eq(leadsTable.segment, "cold"));
  const coldLeads = coldLeadsResult[0]?.count ?? 0;

  const bookedLeadsResult = await db.select({ count: sql<number>`count(*)::int` })
    .from(leadsTable).where(eq(leadsTable.status, "booked"));
  const bookedLeads = bookedLeadsResult[0]?.count ?? 0;

  const channelBreakdownRaw = await db.select({
    channel: conversationsTable.channel,
    count: sql<number>`count(*)::int`,
  }).from(conversationsTable).groupBy(conversationsTable.channel);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMessagesResult = await db.select({ count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .where(sql`${messagesTable.createdAt} >= ${todayStart.toISOString()}`);
  const todayMessages = todayMessagesResult[0]?.count ?? 0;

  res.json({
    totalConversations,
    activeConversations,
    totalLeads,
    hotLeads,
    warmLeads,
    coldLeads,
    bookedLeads,
    channelBreakdown: channelBreakdownRaw,
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

export default router;
