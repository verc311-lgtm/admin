<?php
/**
 * Database Connection Config
 * Uses Supabase (PostgreSQL) credentials.
 */

// Load .env variables if available
if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && substr($line, 0, 1) !== '#') {
            list($key, $value) = explode('=', $line, 2);
            putenv(trim($key) . '=' . trim($value));
        }
    }
}

$db_config = [
    'host' => getenv('SUPABASE_HOST') ?: 'db.rgncndmcugxxucbutumr.supabase.co',
    'dbname' => getenv('SUPABASE_DB_NAME') ?: 'postgres',
    'user' => getenv('SUPABASE_USER') ?: 'postgres',
    'pass' => getenv('SUPABASE_PASSWORD') ?: '@1401Butts@',
    'port' => getenv('SUPABASE_PORT') ?: '5432',
];

try {
    $dsn = "pgsql:host={$db_config['host']};port={$db_config['port']};dbname={$db_config['dbname']}";
    $pdo = new PDO($dsn, $db_config['user'], $db_config['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error de conexión a Supabase: " . $e->getMessage()]);
    exit;
}
?>