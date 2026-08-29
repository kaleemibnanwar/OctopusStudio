CREATE TABLE `worker_personas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`avatar` text DEFAULT '🤖' NOT NULL,
	`role` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`model_selection` text,
	`temperature` real DEFAULT 0.3 NOT NULL,
	`system_prompt` text NOT NULL,
	`capabilities` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `worker_schedule` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`is_enabled` integer DEFAULT 1 NOT NULL,
	`start_hour` text DEFAULT '09:00' NOT NULL,
	`end_hour` text DEFAULT '17:00' NOT NULL,
	`days_of_week` text DEFAULT '[1,2,3,4,5]' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `worker_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer,
	`goal` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`chat_id` integer,
	`current_step_index` integer DEFAULT 0 NOT NULL,
	`total_steps` integer NOT NULL,
	`cancel_requested` integer DEFAULT 0 NOT NULL,
	`report` text,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `worker_run_steps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer NOT NULL,
	`step_index` integer NOT NULL,
	`persona_id` integer,
	`persona_name` text NOT NULL,
	`persona_role` text NOT NULL,
	`instructions` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`message_id` integer,
	`summary` text,
	`started_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`run_id`) REFERENCES `worker_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`persona_id`) REFERENCES `worker_personas`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE set null
);
