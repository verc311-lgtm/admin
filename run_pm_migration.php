<?php
/**
 * Run Migration for PM System Fields
 */
require_once 'db_connect.php';

try {
    echo "Connecting to Supabase (PostgreSQL)...\n";

    // Add columns to cva_projects in Supabase
    $sql1 = 'ALTER TABLE "cva_projects" ADD COLUMN IF NOT EXISTS "pipelineStage" VARCHAR(50) DEFAULT \'NEW LEAD\';';
    $sql2 = 'ALTER TABLE "cva_projects" ADD COLUMN IF NOT EXISTS "pm_data" TEXT DEFAULT NULL;';

    echo "Executing PostgreSQL Migration...\n";
    $pdo->exec($sql1);
    $pdo->exec($sql2);

    echo "Success! Columns 'pipelineStage' and 'pm_data' added to 'cva_projects' in Supabase.\n";

} catch (PDOException $e) {
    echo "PostgreSQL Migration Error: " . $e->getMessage() . "\n";
}
?>
