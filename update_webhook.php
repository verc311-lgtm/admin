<?php
/**
 * Script to update the webhook URL in Supabase database
 */
require_once 'db_connect.php';

try {
    echo "Connecting to Supabase...\n";

    $sql = '
    UPDATE "cva_settings"
    SET "value" = :val
    WHERE "key" = \'zapier_webhook_url\';
    ';

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':val' => 'https://hook.us2.make.com/okn4zyfheui85ridi34byrx0e5dwasoy']);

    echo "Success! Webhook URL updated in Supabase to: https://hook.us2.make.com/okn4zyfheui85ridi34byrx0e5dwasoy\n";
}
catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
