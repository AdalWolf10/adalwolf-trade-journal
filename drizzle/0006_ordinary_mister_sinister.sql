CREATE TABLE `daily_journals` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`htf_bias` text DEFAULT '' NOT NULL,
	`orm` text DEFAULT '' NOT NULL,
	`narrative` text DEFAULT '' NOT NULL,
	`price_action_rating` real DEFAULT 0 NOT NULL,
	`breakeven_trades` integer DEFAULT 0 NOT NULL,
	`tags` text DEFAULT '' NOT NULL,
	`review_notes` text DEFAULT '' NOT NULL,
	`attachments` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_journals_date_unique` ON `daily_journals` (`date`);