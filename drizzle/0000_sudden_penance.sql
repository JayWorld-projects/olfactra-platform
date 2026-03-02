CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ingredientId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `formula_ingredients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`formulaId` int NOT NULL,
	`ingredientId` int NOT NULL,
	`weight` decimal(12,3) NOT NULL,
	`dilutionPercent` decimal(6,2) DEFAULT '100',
	`note` varchar(255),
	`originalName` varchar(255),
	`matchType` varchar(20),
	`matchConfidence` varchar(10),
	`substitutionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `formula_ingredients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `formula_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`formulaId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`label` varchar(255),
	`snapshot` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `formula_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `formulas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`solvent` varchar(100) DEFAULT 'Ethanol',
	`solventWeight` decimal(12,3) DEFAULT '0',
	`totalWeight` decimal(12,3) DEFAULT '0',
	`status` enum('draft','final') NOT NULL DEFAULT 'draft',
	`aiNotesLastGeneratedAt` timestamp,
	`sourceType` varchar(20),
	`importedAt` timestamp,
	`originalData` text,
	`parentFormulaId` int,
	`productType` varchar(50),
	`fragranceLoadPercent` decimal(6,2),
	`batchSize` decimal(12,3),
	`batchSizeUnit` varchar(10),
	`mixingProcedure` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formulas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ingredient_dilutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ingredientId` int NOT NULL,
	`userId` int NOT NULL,
	`percentage` decimal(8,4) NOT NULL,
	`solvent` varchar(255) DEFAULT 'Ethanol',
	`notes` text,
	`dateCreated` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ingredient_dilutions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ingredients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`casNumber` varchar(255),
	`supplier` varchar(255),
	`category` varchar(100),
	`inventoryAmount` varchar(100),
	`costPerGram` decimal(10,4),
	`ifraLimit` decimal(10,4),
	`longevity` int,
	`description` text,
	`manualNotes` text,
	`aiNotes` text,
	`manualNotesUpdatedAt` timestamp,
	`aiNotesUpdatedAt` timestamp,
	`lastEditedAt` timestamp,
	`lastEditedBySource` varchar(20) DEFAULT 'user',
	`pyramidPosition` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ingredients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scent_generations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`concept` text NOT NULL,
	`selectedTypes` json NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scent_generations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `workspace_ingredients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`ingredientId` int NOT NULL,
	CONSTRAINT `workspace_ingredients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`)
);
