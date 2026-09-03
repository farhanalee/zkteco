<?php
/**
 * ZKTeco K40 Attendance System - Device API Endpoint
 * Handles test_connection, connect, disconnect, set_time, restart, and device info.
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../app/config.php';
require_once __DIR__ . '/../../app/auth.php';
require_once __DIR__ . '/../../app/connector.php';
require_once __DIR__ . '/../../app/security.php';

use App\Auth;
use App\Config;
use App\ConnectorClient;
use App\Security;

// Check authentication
if (!Auth::check()) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'UNAUTHORIZED',
        'message' => 'Please log in to manage ZKTeco device.'
    ]);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

$connector = new ConnectorClient();

try {
    switch ($action) {
        case 'test_connection':
        case 'connect':
            $ip = trim($input['ip'] ?? $input['ip_address'] ?? '192.168.1.201');
            $port = intval($input['port'] ?? 4370);
            $commKey = intval($input['comm_key'] ?? 0);
            $timeout = intval($input['timeout'] ?? 5);

            $result = $connector->connectDevice($ip, $port, $commKey, $timeout);
            if (!($result['success'] ?? false)) {
                http_response_code(400);
            }
            echo json_encode($result);
            break;

        case 'disconnect':
            $result = $connector->disconnectDevice();
            echo json_encode($result);
            break;

        case 'set_time':
            $time = $input['time'] ?? null;
            $result = $connector->setDeviceTime($time);
            if (!($result['success'] ?? false)) {
                http_response_code(400);
            }
            echo json_encode($result);
            break;

        case 'get_time':
        case 'time':
            $result = $connector->getDeviceTime();
            echo json_encode($result);
            break;

        case 'info':
            $result = $connector->getDeviceInfo();
            echo json_encode($result);
            break;

        case 'restart':
            $result = $connector->restartDevice();
            echo json_encode($result);
            break;

        case 'clear_attendance':
            $result = $connector->clearAttendance();
            echo json_encode($result);
            break;

        default:
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'INVALID_ACTION',
                'message' => "Unknown device action: '{$action}'"
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
