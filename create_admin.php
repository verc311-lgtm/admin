<?php
require_once 'db_connect.php';

try {
    $id = 'admin_' . substr(md5(uniqid()), 0, 8);
    $username = 'admin';
    $password = 'admin123'; // In a real app, hash this!
    $name = 'Local Administrator';
    $role = 'Admin';
    $createdAt = date('c');

    // Check if user exists
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM cva_users WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->fetchColumn() > 0) {
        // Delete existing to reset
        $pdo->prepare("DELETE FROM cva_users WHERE username = ?")->execute([$username]);
        echo "Existing admin user reset.\n";
    }

    $sql = "INSERT INTO cva_users (id, username, password, name, role, \"createdAt\") VALUES (?, ?, ?, ?, ?, ?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$id, $username, $password, $name, $role, $createdAt]);

    echo "User created successfully!\n";
    echo "Username: $username\n";
    echo "Password: $password\n";

}
catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
