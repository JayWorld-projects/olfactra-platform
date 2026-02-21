CREATE TABLE `formula_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`formulaId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`label` varchar(255),
	`snapshot` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `formula_versions_id` PRIMARY KEY(`id`)
);
