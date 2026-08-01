ALTER TABLE `device_folders` ADD `short_code` text;--> statement-breakpoint
CREATE UNIQUE INDEX `device_folders_short_code_unique` ON `device_folders` (`short_code`);