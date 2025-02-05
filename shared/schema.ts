import { pgTable, text, serial, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
});

export const tokens = pgTable("tokens", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  sensitiveData: jsonb("sensitive_data").notNull(),
  userId: serial("user_id").references(() => users.id),
  created: timestamp("created").notNull().defaultNow(),
  expires: timestamp("expires"),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: jsonb("details"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const tokenizationSchema = z.object({
  data: z.record(z.string()),
  expiryHours: z.number().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Token = typeof tokens.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
