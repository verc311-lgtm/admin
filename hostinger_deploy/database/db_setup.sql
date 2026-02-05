
-- Estructura de tablas para CoastalVA Marine Construction

CREATE TABLE IF NOT EXISTS `cva_users` (
  `id` varchar(50) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `role` varchar(20) NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cva_projects` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `client` varchar(255) NOT NULL,
  `totalAmount` decimal(15,2) NOT NULL,
  `balance` decimal(15,2) NOT NULL,
  `paidAmount` decimal(15,2) NOT NULL,
  `totalExpenses` decimal(15,2) DEFAULT 0.00,
  `profit` decimal(15,2) DEFAULT 0.00,
  `startDate` date NOT NULL,
  `status` varchar(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cva_payments` (
  `id` varchar(50) NOT NULL,
  `projectId` varchar(50) NOT NULL,
  `projectName` varchar(255) NOT NULL,
  `invoiceId` varchar(50) DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `date` date NOT NULL,
  `method` varchar(50) NOT NULL,
  `reference` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `projectId` (`projectId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cva_invoices` (
  `id` varchar(50) NOT NULL,
  `projectId` varchar(50) NOT NULL,
  `projectName` varchar(255) NOT NULL,
  `invoiceNumber` varchar(50) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `date` date NOT NULL,
  `status` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `projectId` (`projectId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertar usuario administrador por defecto (admin / 1234)
INSERT IGNORE INTO `cva_users` (`id`, `username`, `password`, `name`, `role`, `createdAt`) 
VALUES ('1', 'admin', '1234', 'Coastal Admin', 'Admin', NOW());
