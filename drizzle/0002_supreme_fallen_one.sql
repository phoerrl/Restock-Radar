CREATE TABLE `community_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`status` text DEFAULT 'unchecked' NOT NULL,
	`detail` text DEFAULT 'Noch nicht geprüft' NOT NULL,
	`checked_at` integer,
	`next_check_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_sources_url_unique` ON `community_sources` (`url`);--> statement-breakpoint
CREATE TABLE `observations` (
	`id` text PRIMARY KEY NOT NULL,
	`retailer` text NOT NULL,
	`address` text,
	`product` text NOT NULL,
	`kind` text NOT NULL,
	`source` text NOT NULL,
	`observed_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`expected_at` integer,
	`time_precision` text DEFAULT 'day' NOT NULL,
	`source_url` text,
	`note` text NOT NULL,
	`price` real,
	`uvp_price` real,
	`uvp_source` text,
	`reviewed` integer DEFAULT 0 NOT NULL,
	`push_state` text DEFAULT 'pending' NOT NULL
);
