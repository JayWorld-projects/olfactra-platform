CREATE TABLE `formula_ingredients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`formulaId` int NOT NULL,
	`ingredientId` int NOT NULL,
	`weight` decimal(12,3) NOT NULL,
	`dilutionPercent` decimal(6,2) DEFAULT '100',
	`note` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `formula_ingredients_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formulas_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ingredients_id` PRIMARY KEY(`id`)
);
