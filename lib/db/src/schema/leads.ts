import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  segment: text("segment").notNull().default("cold"),
  interest: text("interest"),
  destination: text("destination"),
  budget: text("budget"),
  status: text("status").notNull().default("new"),
  notes: text("notes"),
  conversationId: integer("conversation_id"),
  // Aviation / trip fields
  airline: text("airline"),
  flightNumber: text("flight_number"),
  bookingNumber: text("booking_number"),
  departureDate: text("departure_date"),
  arrivalDate: text("arrival_date"),
  luggage: text("luggage"),
  handLuggage: text("hand_luggage"),
  tariff: text("tariff"),
  passengersCount: text("passengers_count"),
  serviceClass: text("service_class"),
  paymentStatus: text("payment_status"),
  ageCategory: text("age_category"),
  leadSource: text("lead_source"),
  birthday: text("birthday"),
  assignedTo: text("assigned_to"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
