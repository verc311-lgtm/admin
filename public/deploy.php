<?php
/**
 * Simple Git Deployment Script
 * Upload this to your Hostinger public_html folder.
 * Access it via https://yourdomain.com/deploy.php
 */

// Security: Optional simple token protection
// $token = 'SECRET_TOKEN';
// if (!isset($_GET['token']) || $_GET['token'] !== $token) {
//     die('Access Denied');
// }

echo "<h1>Deployment Status</h1>";
echo "<pre>";

// Check if git is available
$gitVersion = shell_exec('git --version 2>&1');
echo "<strong>Git Version:</strong> " . ($gitVersion ? $gitVersion : "Not found") . "\n";

if ($gitVersion) {
    echo "<strong>Executing 'git pull origin main'...</strong>\n\n";
    $output = shell_exec('git pull origin main 2>&1');
    echo htmlspecialchars($output);
} else {
    echo "Error: Git is not installed or not accessible in this environment.";
}

echo "</pre>";
echo "<p><em>Note: This requires the folder to be a connected Git repository.</em></p>";
?>