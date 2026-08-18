<?php
/**
 * Run Migration to correct existing projects stage based on status
 */
require_once 'db_connect.php';

try {
    echo "Connecting to Supabase (PostgreSQL)...\n";

    // Update finished projects to PAID / CLOSED stage
    $sql1 = "UPDATE \"cva_projects\" SET \"pipelineStage\" = 'PAID / CLOSED' WHERE \"status\" = 'Finished';";
    // Update in progress projects to IN PROGRESS stage
    $sql2 = "UPDATE \"cva_projects\" SET \"pipelineStage\" = 'IN PROGRESS' WHERE \"status\" = 'In Progress';";

    echo "Running Stage Migrations...\n";
    $count1 = $pdo->exec($sql1);
    $count2 = $pdo->exec($sql2);

    echo "Success!\n";
    echo "- Updated $count1 finished projects to 'PAID / CLOSED'.\n";
    echo "- Updated $count2 active projects to 'IN PROGRESS'.\n";

} catch (PDOException $e) {
    echo "Migration Error: " . $e->getMessage() . "\n";
}
?>
