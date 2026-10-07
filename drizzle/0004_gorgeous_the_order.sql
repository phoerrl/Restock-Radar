CREATE TABLE `push_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `devices` ADD `last_test_at` integer DEFAULT 0 NOT NULL;