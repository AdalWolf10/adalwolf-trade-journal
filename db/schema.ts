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
