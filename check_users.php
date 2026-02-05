<?php
require_once 'db_connect.php';

try {
    $stmt = $pdo->query("SELECT username, role FROM cva_users");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Users found: " . count($users) . "\n";
    foreach ($users as $user) {
        echo "- " . $user['username'] . " (" . $user['role'] . ")\n";
    }
}
catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
