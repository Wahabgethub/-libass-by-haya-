CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productHandle` varchar(180) NOT NULL,
	`productTitle` varchar(255) NOT NULL,
	`productImageUrl` text,
	`variantTitle` varchar(160),
	`unitPrice` decimal(12,2) NOT NULL,
	`quantity` int NOT NULL,
	`lineTotal` decimal(12,2) NOT NULL,
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(32) NOT NULL,
	`customerName` varchar(160) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(40) NOT NULL,
	`addressLine1` varchar(255) NOT NULL,
	`addressLine2` varchar(255),
	`city` varchar(120) NOT NULL,
	`postalCode` varchar(24),
	`paymentMethod` enum('cod','bank_transfer') NOT NULL,
	`paymentStatus` enum('cash_due','awaiting_transfer','transfer_reference_submitted','paid') NOT NULL,
	`bankTransferReference` varchar(160),
	`fulfillmentStatus` enum('placed','processing','fulfilled','cancelled') NOT NULL DEFAULT 'placed',
	`currencyCode` varchar(3) NOT NULL,
	`subtotal` decimal(12,2) NOT NULL,
	`total` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
