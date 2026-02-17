<?php
/**
 * Run Migration for Dynamic Schedule (Crews & Assignments)
 */
require_once 'db_connect.php';

try {
    echo "Connecting to Supabase...\n";

    // 1. Create cva_crews table
    $sqlCrews = '
    CREATE TABLE IF NOT EXISTS "cva_crews" (
      "id" varchar(50) NOT NULL,
      "name" varchar(100) NOT NULL,
      "color" varchar(20) DEFAULT \'bg-blue-500\',
      PRIMARY KEY ("id")
    );
    ';
    echo "Executing Crew Table Creation...\n";
    $pdo->exec($sqlCrews);
    echo "Success! Table 'cva_crews' created.\n";

    // 2. Create cva_assignments table
    $sqlAssignments = '
    CREATE TABLE IF NOT EXISTS "cva_assignments" (
      "id" varchar(50) NOT NULL,
      "crewId" varchar(50) NOT NULL,
      "projectId" varchar(50) NOT NULL,
      "date" date NOT NULL,
      "activity" text,
      "workers" text,
      "status" varchar(20) DEFAULT \'Pending\',
      PRIMARY KEY ("id")
    );
     CREATE INDEX IF NOT EXISTS "idx_assignments_crewId" ON "cva_assignments" ("crewId");
     CREATE INDEX IF NOT EXISTS "idx_assignments_date" ON "cva_assignments" ("date");
    ';
    echo "Executing Assignment Table Creation...\n";
    $pdo->exec($sqlAssignments);
    echo "Success! Table 'cva_assignments' created.\n";

}
catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
