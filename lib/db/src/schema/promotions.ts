import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const promotionsTable = pgTable("promotions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  discount: text("discount"),
  destination: text("destination"),
  validUntil: text("valid_until"),
  active: integer("active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPromotionSchema = createInsertSchema(promotionsTable).omit({ id: true, createdAt: true });
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type Promotion = typeof promotionsTable.$inferSelect;
