CREATE TABLE `journal_trash_items` (
	`id` text PRIMARY KEY NOT NULL,
	`item_type` text NOT NULL,
	`source_id` text DEFAULT '' NOT NULL,
	`source_date` text DEFAULT '' NOT NULL,
	`source_label` text DEFAULT '' NOT NULL,
	`payload` text NOT NULL,
	`deleted_at` integer NOT NULL,
	`purge_after` integer NOT NULL
);
