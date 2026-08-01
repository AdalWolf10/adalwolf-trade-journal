CREATE TABLE `device_files` (
	`id` text PRIMARY KEY NOT NULL,
	`folder_id` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`content` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`folder_id`) REFERENCES `device_folders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `device_files_folder_filename_unique` ON `device_files` (`folder_id`,`filename`);--> statement-breakpoint
CREATE TABLE `device_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`token_updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `device_folders_token_unique` ON `device_folders` (`token`);