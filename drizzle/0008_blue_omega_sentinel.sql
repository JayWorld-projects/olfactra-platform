ALTER TABLE `formula_ingredients` ADD `originalName` varchar(255);--> statement-breakpoint
ALTER TABLE `formula_ingredients` ADD `matchType` varchar(20);--> statement-breakpoint
ALTER TABLE `formula_ingredients` ADD `matchConfidence` varchar(10);--> statement-breakpoint
ALTER TABLE `formula_ingredients` ADD `substitutionReason` text;--> statement-breakpoint
ALTER TABLE `formulas` ADD `sourceType` varchar(20);--> statement-breakpoint
ALTER TABLE `formulas` ADD `importedAt` timestamp;--> statement-breakpoint
ALTER TABLE `formulas` ADD `originalData` text;