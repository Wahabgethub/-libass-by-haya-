CREATE TABLE `hiddenProducts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productHandle` varchar(180) NOT NULL,
	`hiddenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hiddenProducts_id` PRIMARY KEY(`id`),
	CONSTRAINT `hiddenProducts_productHandle_unique` UNIQUE(`productHandle`)
);
