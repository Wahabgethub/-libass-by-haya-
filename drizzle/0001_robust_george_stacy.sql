CREATE TABLE `categoryImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`imageUrl` text NOT NULL,
	`cloudinaryPublicId` varchar(255) NOT NULL,
	`altText` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categoryImages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `storeCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(120) NOT NULL,
	`slug` varchar(140) NOT NULL,
	`description` text,
	`heroImageUrl` text,
	`cloudinaryPublicId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storeCategories_id` PRIMARY KEY(`id`),
	CONSTRAINT `storeCategories_slug_unique` UNIQUE(`slug`)
);
