<?php
/**
 * Migration Script for Supabase
 * Executes the SQL to create the missing table.
 */

// Include connection logic
require_once 'db_connect.php';

try {
    echo "Connecting to Supabase...\n";

    // SQL Statement for cva_expenses (Postgres Syntax)
    $sql = '
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
    ';

    $pdo->exec($sql);
    echo "Success! Table 'cva_expenses' created or already exists.\n";

}
catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
