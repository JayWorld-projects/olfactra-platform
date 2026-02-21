CREATE TABLE `formula_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`formulaId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formula_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `formula_tag_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`formulaId` int NOT NULL,
	`tagId` int NOT NULL,
	CONSTRAINT `formula_tag_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `formula_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(20) DEFAULT '#006778',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `formula_tags_id` PRIMARY KEY(`id`)
);
