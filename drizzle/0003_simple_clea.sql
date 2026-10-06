CREATE TABLE `community_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`excerpt` text NOT NULL,
	`url` text NOT NULL,
	`published_at` integer NOT NULL,
	`fetched_at` integer NOT NULL,
	`retailers` text NOT NULL
);
