CREATE TABLE `exit_trades` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`be_hit` text NOT NULL,
	`first_tp_r` real NOT NULL,
	`max_r` real NOT NULL,
	`actual_r` real NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
