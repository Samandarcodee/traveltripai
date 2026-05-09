/**
 * Route-specific validation schemas
 * Used for request/response validation in route handlers
 */

import * as zod from "zod";

// Templates validation schemas
export const CreateTemplateBody = zod.object({
  category: zod.string().default("general"),
  title: zod.string().min(1, "Title is required").max(255),
  content: zod.string().min(1, "Content is required"),
  sortOrder: zod.number().int().nonnegative().default(0),
});

export const UpdateTemplateBody = zod.object({
  category: zod.string().optional(),
  title: zod.string().min(1).max(255).optional(),
  content: zod.string().min(1).optional(),
  sortOrder: zod.number().int().nonnegative().optional(),
});

export const GetTemplateParams = zod.object({
  id: zod.coerce.number().positive("ID must be a positive number"),
});

// Settings validation schemas
export const UpdateSettingsBody = zod.object({
  key: zod.string().min(1),
  value: zod.string(),
});

// Call analysis validation schemas
export const CallAnalysisBody = zod.object({
  transcript: zod.string().min(10, "Transcript must be at least 10 characters"),
  duration: zod.number().positive("Duration must be positive").optional(),
});

// AI Lead extraction schema
export const AiLeadExtraction = zod.object({
  destination: zod.string().optional(),
  budget: zod.string().optional(),
  departureDate: zod.string().optional(),
  passengersCount: zod.number().optional(),
  interest: zod.string().optional(),
  phone: zod.string().optional(),
  name: zod.string().optional(),
  segment: zod.enum(["hot", "warm", "cold"]).optional(),
  status: zod.enum(["new", "contacted", "qualified", "booked", "lost"]).optional(),
});

// Call analysis response schema
export const CallAnalysisResponse = zod.object({
  summary: zod.string().optional(),
  clientRequest: zod.string().optional(),
  objections: zod.string().optional(),
  missedOpportunities: zod.string().optional(),
  recommendations: zod.string().optional(),
  sentiment: zod.enum(["positive", "neutral", "negative"]).optional(),
  leadQuality: zod.enum(["hot", "warm", "cold"]).optional(),
});

// Helper function to validate and return result
export function validateRequest<T>(schema: zod.ZodSchema, data: unknown): zod.SafeParseReturnType<unknown, T> {
  return schema.safeParse(data) as zod.SafeParseReturnType<unknown, T>;
}
