CREATE TABLE `generatedCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`code` varchar(8) NOT NULL,
	`used` enum('true','false') NOT NULL DEFAULT 'false',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generatedCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `generatedCodes_code_unique` UNIQUE(`code`)
);
