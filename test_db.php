<?php
require_once 'db_connect.php';

try {
    $stmt = $pdo->query("SELECT count(*) as count FROM cva_users");
    $result = $stmt->fetch();
    echo "Connection Successful! Found " . $result['count'] . " users.\n";
} catch (Exception $e) {
    echo "Connection Failed: " . $e->getMessage() . "\n";
}
?>