ALTER TABLE `exit_trades` ADD `instrument` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `exit_trades` ADD `direction` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `exit_trades` ADD `session` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `exit_trades` ADD `setup_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `exit_trades` ADD `exit_type` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `exit_trades` ADD `tags` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `exit_trades` ADD `mistake_category` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `exit_trades` ADD `mistake_notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `exit_trades` ADD `lesson_learned` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `exit_trades` ADD `attachments` text DEFAULT '[]' NOT NULL;