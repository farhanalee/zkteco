<?php
/**
 * ZKTeco K40 Attendance System - Attendance API Endpoint
 * Handles reading attendance logs and clearing logs from physical K40 hardware.
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../app/config.php';
require_once __DIR__ . '/../../app/auth.php';
require_once __DIR__ . '/../../app/connector.php';
require_once __DIR__ . '/../../app/security.php';

use App\Auth;
use App\ConnectorClient;

if (!Auth::check()) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'UNAUTHORIZED',
        'message' => 'Please log in to query attendance logs.'
    ]);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';
$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

$connector = new ConnectorClient();

try {
    switch ($action) {
        case 'list':
        case 'get':
            $filters = [];
            if (!empty($_GET['user_id'])) {
                $filters['user_id'] = $_GET['user_id'];
            }
            if (!empty($_GET['date'])) {
                $filters['date'] = $_GET['date'];
            }

            $result = $connector->getAttendance($filters);
            if (!($result['success'] ?? false)) {
                http_response_code(400);
            }
            echo json_encode($result);
            break;

        case 'clear':
            $result = $connector->clearAttendance();
            if (!($result['success'] ?? false)) {
                http_response_code(400);
            }
            echo json_encode($result);
            break;

        default:
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'INVALID_ACTION',
                'message' => "Unknown attendance action: '{$action}'"
            ]);
            break;
    }
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'SERVER_EXCEPTION',
        'message' => $e->getMessage()
    ]);
}
