CREATE TABLE `afx_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`first_seen_job_id` text,
	`type` text NOT NULL,
	`value` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`last_seen_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `afx_programs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`first_seen_job_id`) REFERENCES `afx_jobs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_assets_program_type_value` ON `afx_assets` (`program_id`,`type`,`value`);--> statement-breakpoint
CREATE INDEX `idx_assets_program_last_seen` ON `afx_assets` (`program_id`,`last_seen_at`);--> statement-breakpoint
CREATE TABLE `afx_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`finding_id` text NOT NULL,
	`job_id` text,
	`kind` text NOT NULL,
	`content` text NOT NULL,
	`sha256` text NOT NULL,
	`redacted` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`finding_id`) REFERENCES `afx_findings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`job_id`) REFERENCES `afx_jobs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_evidence_finding_created` ON `afx_evidence` (`finding_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `afx_finding_validations` (
	`id` text PRIMARY KEY NOT NULL,
	`finding_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`decision` text NOT NULL,
	`rationale` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`finding_id`) REFERENCES `afx_findings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_validations_finding_created` ON `afx_finding_validations` (`finding_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `afx_findings` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`asset_id` text,
	`source_job_id` text,
	`title` text NOT NULL,
	`vulnerability_class` text NOT NULL,
	`severity` text NOT NULL,
	`status` text DEFAULT 'candidate' NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`summary` text NOT NULL,
	`impact` text,
	`remediation` text,
	`validator_id` text,
	`validated_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `afx_programs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `afx_assets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`source_job_id`) REFERENCES `afx_jobs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_findings_program_status_severity` ON `afx_findings` (`program_id`,`status`,`severity`);--> statement-breakpoint
CREATE TABLE `afx_job_results` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`program_id` text NOT NULL,
	`result_type` text NOT NULL,
	`value` text NOT NULL,
	`normalized_json` text DEFAULT '{}' NOT NULL,
	`searchable_text` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `afx_jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`program_id`) REFERENCES `afx_programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_job_results_job_type_value` ON `afx_job_results` (`job_id`,`result_type`,`value`);--> statement-breakpoint
CREATE INDEX `idx_job_results_program_type` ON `afx_job_results` (`program_id`,`result_type`);--> statement-breakpoint
CREATE INDEX `idx_job_results_job` ON `afx_job_results` (`job_id`);--> statement-breakpoint
CREATE TABLE `afx_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`tool` text NOT NULL,
	`target` text NOT NULL,
	`parameters_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`exit_code` integer,
	`error` text,
	`started_at` integer,
	`finished_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `afx_programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_jobs_program_status_created` ON `afx_jobs` (`program_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `afx_programs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`platform` text NOT NULL,
	`authorization_ref` text NOT NULL,
	`rate_limit` integer DEFAULT 5 NOT NULL,
	`concurrency` integer DEFAULT 2 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_programs_owner_status` ON `afx_programs` (`owner_id`,`status`);--> statement-breakpoint
CREATE TABLE `afx_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`finding_id` text NOT NULL,
	`platform` text NOT NULL,
	`format_version` integer DEFAULT 1 NOT NULL,
	`content` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`finding_id`) REFERENCES `afx_findings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_reports_finding_platform` ON `afx_reports` (`finding_id`,`platform`);--> statement-breakpoint
CREATE TABLE `afx_scopes` (
	`id` text PRIMARY KEY NOT NULL,
	`program_id` text NOT NULL,
	`kind` text NOT NULL,
	`value` text NOT NULL,
	`decision` text NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `afx_programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_scopes_program_value_decision` ON `afx_scopes` (`program_id`,`value`,`decision`);--> statement-breakpoint
CREATE INDEX `idx_scopes_program_decision` ON `afx_scopes` (`program_id`,`decision`);
--> statement-breakpoint
PRAGMA optimize;
