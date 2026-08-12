import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const exitTrades = sqliteTable("exit_trades", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  instrument: text("instrument").notNull().default(""),
  direction: text("direction").notNull().default(""),
  session: text("session").notNull().default(""),
  setupName: text("setup_name").notNull().default(""),
  beHit: text("be_hit", { enum: ["Yes", "No"] }).notNull(),
  firstTpR: real("first_tp_r").notNull(),
  maxR: real("max_r").notNull(),
  actualR: real("actual_r").notNull(),
  exitType: text("exit_type").notNull().default(""),
  tags: text("tags").notNull().default(""),
  notes: text("notes").notNull().default(""),
  mistakeCategory: text("mistake_category").notNull().default(""),
  mistakeNotes: text("mistake_notes").notNull().default(""),
  lessonLearned: text("lesson_learned").notNull().default(""),
  attachments: text("attachments").notNull().default("[]"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const dailyJournals = sqliteTable(
  "daily_journals",
  {
    id: text("id").primaryKey(),
    date: text("date").notNull(),
    htfBias: text("htf_bias").notNull().default(""),
    orm: text("orm").notNull().default(""),
    narrative: text("narrative").notNull().default(""),
    priceActionRating: real("price_action_rating").notNull().default(0),
    breakevenTrades: integer("breakeven_trades").notNull().default(0),
    tags: text("tags").notNull().default(""),
    reviewNotes: text("review_notes").notNull().default(""),
    attachments: text("attachments").notNull().default("[]"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [uniqueIndex("daily_journals_date_unique").on(table.date)],
);

export const journalTrashItems = sqliteTable("journal_trash_items", {
  id: text("id").primaryKey(),
  itemType: text("item_type", { enum: ["trade", "daily_journal", "attachment"] }).notNull(),
  sourceId: text("source_id").notNull().default(""),
  sourceDate: text("source_date").notNull().default(""),
  sourceLabel: text("source_label").notNull().default(""),
  payload: text("payload").notNull(),
  deletedAt: integer("deleted_at").notNull(),
  purgeAfter: integer("purge_after").notNull(),
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

export const deviceFolders = sqliteTable(
  "device_folders",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    shortCode: text("short_code"),
    token: text("token").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    tokenUpdatedAt: integer("token_updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("device_folders_short_code_unique").on(table.shortCode),
    uniqueIndex("device_folders_token_unique").on(table.token),
  ],
);

export const deviceFiles = sqliteTable(
  "device_files",
  {
    id: text("id").primaryKey(),
    folderId: text("folder_id")
      .notNull()
      .references(() => deviceFolders.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    content: text("content").notNull(),
    objectKey: text("object_key"),
    size: integer("size").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [uniqueIndex("device_files_folder_filename_unique").on(table.folderId, table.filename)],
);
