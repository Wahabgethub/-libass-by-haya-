CREATE TABLE `saleOverrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productHandle` varchar(180) NOT NULL,
	`regularPrice` decimal(12,2) NOT NULL,
	`salePrice` decimal(12,2),
	`discountPercent` int,
	`enabled` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saleOverrides_id` PRIMARY KEY(`id`),
	CONSTRAINT `saleOverrides_productHandle_unique` UNIQUE(`productHandle`)
);
--> statement-breakpoint
ALTER TABLE `orderItems` ADD `regularPrice` decimal(12,2);--> statement-breakpoint
ALTER TABLE `orderItems` ADD `salePrice` decimal(12,2);