ALTER TABLE `formulas` ADD `parentFormulaId` int;--> statement-breakpoint
ALTER TABLE `formulas` ADD `productType` varchar(50);--> statement-breakpoint
ALTER TABLE `formulas` ADD `fragranceLoadPercent` decimal(6,2);--> statement-breakpoint
ALTER TABLE `formulas` ADD `batchSize` decimal(12,3);--> statement-breakpoint
ALTER TABLE `formulas` ADD `batchSizeUnit` varchar(10);--> statement-breakpoint
ALTER TABLE `formulas` ADD `mixingProcedure` text;