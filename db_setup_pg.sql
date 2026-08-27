-- Database Setup for CoastalVA Marine Construction (PostgreSQL / Supabase)

CREATE TABLE IF NOT EXISTS "cva_users" (
  "id" varchar(50) NOT NULL,
  "username" varchar(50) NOT NULL,
  "password" varchar(255) NOT NULL,
  "name" varchar(100) NOT NULL,
  "role" varchar(20) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  UNIQUE ("username")
);

CREATE TABLE IF NOT EXISTS "cva_projects" (
  "id" varchar(50) NOT NULL,
  "name" varchar(255) NOT NULL,
  "client" varchar(255) NOT NULL,
  "totalAmount" decimal(15,2) NOT NULL,
  "balance" decimal(15,2) NOT NULL,
  "paidAmount" decimal(15,2) NOT NULL,
  "totalExpenses" decimal(15,2) DEFAULT 0.00,
  "profit" decimal(15,2) DEFAULT 0.00,
  "startDate" date NOT NULL,
  "status" varchar(20) NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "cva_payments" (
  "id" varchar(50) NOT NULL,
  "projectId" varchar(50) NOT NULL,
  "projectName" varchar(255) NOT NULL,
  "invoiceId" varchar(50) DEFAULT NULL,
  "amount" decimal(15,2) NOT NULL,
  "date" date NOT NULL,
  "method" varchar(50) NOT NULL,
  "reference" varchar(100) DEFAULT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_payments_projectId" ON "cva_payments" ("projectId");

CREATE TABLE IF NOT EXISTS "cva_invoices" (
  "id" varchar(50) NOT NULL,
  "projectId" varchar(50) NOT NULL,
  "projectName" varchar(255) NOT NULL,
  "invoiceNumber" varchar(50) NOT NULL,
  "amount" decimal(15,2) NOT NULL,
  "date" date NOT NULL,
  "status" varchar(20) NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_invoices_projectId" ON "cva_invoices" ("projectId");

CREATE TABLE IF NOT EXISTS "cva_expenses" (
  "id" varchar(50) NOT NULL,
  "projectId" varchar(50) NOT NULL,
  "category" varchar(50) NOT NULL,
  "note" varchar(255) DEFAULT NULL,
  "amount" decimal(15,2) NOT NULL,
  "date" date NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_expenses_projectId" ON "cva_expenses" ("projectId");

CREATE TABLE IF NOT EXISTS "cva_settings" (
  "key" varchar(100) NOT NULL PRIMARY KEY,
  "value" text NOT NULL
);

INSERT INTO "cva_settings" ("key", "value") VALUES ('zapier_webhook_url', 'https://hook.us2.make.com/okn4zyfheui85ridi34byrx0e5dwasoy') ON CONFLICT ("key") DO NOTHING;

-- Insert default admin user
INSERT INTO "cva_users" ("id", "username", "password", "name", "role", "createdAt") 
VALUES ('1', 'admin', '1234', 'Coastal Admin', 'Admin', NOW())
ON CONFLICT ("username") DO NOTHING;
