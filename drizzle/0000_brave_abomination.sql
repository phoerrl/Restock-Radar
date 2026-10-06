CREATE TABLE `devices` (
	`endpoint` text PRIMARY KEY NOT NULL,
	`subscription` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_error` text
);
--> statement-breakpoint
CREATE TABLE `drops` (
	`id` text PRIMARY KEY NOT NULL,
	`monitor_id` text NOT NULL,
	`version` integer NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`retailer` text NOT NULL,
	`price` real,
	`channel` text NOT NULL,
	`location` text,
	`kind` text NOT NULL,
	`created_at` integer NOT NULL,
	`push_state` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `drops_monitor_version` ON `drops` (`monitor_id`,`version`);--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `monitors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`retailer` text NOT NULL,
	`url` text NOT NULL,
	`kind` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`max_price` real,
	`status` text DEFAULT 'unknown' NOT NULL,
	`detail` text DEFAULT 'Noch nicht geprüft' NOT NULL,
	`price` real,
	`image` text,
	`seller` text,
	`channel` text DEFAULT 'online' NOT NULL,
	`location` text,
	`checked_at` integer,
	`next_check_at` integer DEFAULT 0 NOT NULL,
	`last_stock` text,
	`version` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `monitors_url_unique` ON `monitors` (`url`);