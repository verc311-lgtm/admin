<?php
/**
 * Run Migration for Schedule Feature
 */
require_once 'db_connect.php';

try {
    echo "Connecting to Supabase...\n";

    // Check if column exists first to avoid error
    // Postgres doesn't have "IF NOT EXISTS" for ADD COLUMN in older versions, 
    // but we can catch the exception or just try it.
    // The simplest way is to try to add it.

    $sql = 'ALTER TABLE "cva_projects" ADD COLUMN IF NOT EXISTS "estimatedEndDate" DATE;';

    echo "Executing: $sql\n";
    $pdo->exec($sql);

    echo "Success! Column 'estimatedEndDate' added to 'cva_projects'.\n";

}
catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
