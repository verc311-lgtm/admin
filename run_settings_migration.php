<?php
/**
 * Run Migration to create cva_settings table
 */
require_once 'db_connect.php';

try {
    echo "Connecting to Supabase...\n";

    $sql = '
    CREATE TABLE IF NOT EXISTS "cva_settings" (
      "key" VARCHAR(100) NOT NULL PRIMARY KEY,
      "value" TEXT NOT NULL
    );
    INSERT INTO "cva_settings" ("key", "value") 
    VALUES (\'zapier_webhook_url\', \'\') 
    ON CONFLICT ("key") DO NOTHING;
    ';

    echo "Executing migration...\n";
    $pdo->exec($sql);

    echo "Success! Table 'cva_settings' created and initialized.\n";
}
catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
