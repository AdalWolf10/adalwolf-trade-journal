import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const exitTrades = sqliteTable("exit_trades", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  beHit: text("be_hit", { enum: ["Yes", "No"] }).notNull(),
  firstTpR: real("first_tp_r").notNull(),
  maxR: real("max_r").notNull(),
  actualR: real("actual_r").notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const authSettings = sqliteTable("auth_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const authAttempts = sqliteTable("auth_attempts", {
  identifier: text("identifier").primaryKey(),
  count: integer("count").notNull(),
  resetAt: integer("reset_at").notNull(),
  lockedUntil: integer("locked_until").notNull(),
});
