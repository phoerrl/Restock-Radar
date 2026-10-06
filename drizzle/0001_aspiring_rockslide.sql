ALTER TABLE `drops` ADD `uvp_price` real;--> statement-breakpoint
ALTER TABLE `drops` ADD `uvp_source` text;--> statement-breakpoint
ALTER TABLE `drops` ADD `branch_stock` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `monitors` ADD `uvp_price` real;--> statement-breakpoint
ALTER TABLE `monitors` ADD `uvp_source` text;--> statement-breakpoint
ALTER TABLE `monitors` ADD `branch_stock` text DEFAULT '[]' NOT NULL;