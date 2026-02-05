<?php
/**
 * CoastalVA Marine Construction - MySQL API Bridge
 * Hostinger Configuration
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// --- CONFIGURACIÓN DE BASE DE DATOS ---
require_once 'db_connect.php';

// $pdo está disponible aquí gracias a db_connect.php

// --- MANEJO DE PETICIONES (NO TOCAR) ---

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $data = [
            "projects" => $pdo->query("SELECT * FROM cva_projects")->fetchAll(),
            "payments" => $pdo->query("SELECT * FROM cva_payments")->fetchAll(),
            "invoices" => $pdo->query("SELECT * FROM cva_invoices")->fetchAll(),
            "users" => $pdo->query("SELECT * FROM cva_users")->fetchAll()
        ];

        foreach ($data['projects'] as &$p) {
            $p['totalAmount'] = (float) $p['totalAmount'];
            $p['balance'] = (float) $p['balance'];
            $p['paidAmount'] = (float) $p['paidAmount'];
            $p['totalExpenses'] = (float) $p['totalExpenses'];
            $p['profit'] = (float) $p['profit'];
        }
        foreach ($data['payments'] as &$pay)
            $pay['amount'] = (float) $pay['amount'];
        foreach ($data['invoices'] as &$inv)
            $inv['amount'] = (float) $inv['amount'];

        echo json_encode($data);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if ($data === null || !isset($data['users'])) {
        http_response_code(400);
        echo json_encode(["error" => "Estructura de datos inválida"]);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // $pdo->exec("SET FOREIGN_KEY_CHECKS = 0"); // Not needed/compatible with Postgres in this context
        $pdo->exec("TRUNCATE TABLE cva_projects CASCADE");
        $pdo->exec("TRUNCATE TABLE cva_payments CASCADE");
        $pdo->exec("TRUNCATE TABLE cva_invoices CASCADE");
        $pdo->exec("TRUNCATE TABLE cva_users CASCADE");
        // $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

        if (!empty($data['projects'])) {
            $stmt = $pdo->prepare("INSERT INTO cva_projects (id, name, client, totalAmount, balance, paidAmount, totalExpenses, profit, startDate, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['projects'] as $p) {
                $stmt->execute([$p['id'], $p['name'], $p['client'], $p['totalAmount'], $p['balance'], $p['paidAmount'], $p['totalExpenses'] ?? 0, $p['profit'] ?? 0, $p['startDate'], $p['status']]);
            }
        }

        if (!empty($data['payments'])) {
            $stmt = $pdo->prepare("INSERT INTO cva_payments (id, projectId, projectName, invoiceId, amount, date, method, reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['payments'] as $pay) {
                $stmt->execute([$pay['id'], $pay['projectId'], $pay['projectName'], $pay['invoiceId'] ?? null, $pay['amount'], $pay['date'], $pay['method'], $pay['reference'] ?? '']);
            }
        }

        if (!empty($data['invoices'])) {
            $stmt = $pdo->prepare("INSERT INTO cva_invoices (id, projectId, projectName, invoiceNumber, amount, date, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['invoices'] as $inv) {
                $stmt->execute([$inv['id'], $inv['projectId'], $inv['projectName'], $inv['invoiceNumber'], $inv['amount'], $inv['date'], $inv['status']]);
            }
        }

        if (!empty($data['users'])) {
            $stmt = $pdo->prepare("INSERT INTO cva_users (id, username, password, name, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)");
            foreach ($data['users'] as $u) {
                $stmt->execute([$u['id'], $u['username'], $u['password'], $u['name'], $u['role'], $u['createdAt']]);
            }
        }

        $pdo->commit();
        echo json_encode(["status" => "ok", "message" => "Sincronización exitosa"]);

    } catch (Exception $e) {
        if ($pdo->inTransaction())
            $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["error" => "Error de base de datos: " . $e->getMessage()]);
    }
}
?>
