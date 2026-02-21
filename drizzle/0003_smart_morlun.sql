CREATE TABLE `scent_generations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`concept` text NOT NULL,
	`selectedTypes` json NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scent_generations_id` PRIMARY KEY(`id`)
);
