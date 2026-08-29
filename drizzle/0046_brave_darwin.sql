CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`prompt` text NOT NULL,
	`schedule_minutes` integer,
	`enabled` integer DEFAULT 1 NOT NULL,
	`project_id` integer,
	`mcp_server_ids` text,
	`last_run_at` integer,
	`last_chat_id` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE set null
);
