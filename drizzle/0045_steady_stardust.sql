ALTER TABLE `apps` ADD `type` text DEFAULT 'app' NOT NULL;--> statement-breakpoint
ALTER TABLE `apps` ADD `is_default_chat_project` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `apps_default_chat_project_unique` ON `apps` (`is_default_chat_project`) WHERE "apps"."is_default_chat_project" = 1;