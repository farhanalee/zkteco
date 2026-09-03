<?php
/**
 * ZKTeco K40 Attendance System - System Status API Endpoint
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../app/config.php';
require_once __DIR__ . '/../../app/auth.php';
require_once __DIR__ . '/../../app/connector.php';

use App\Auth;
use App\Config;
use App\ConnectorClient;

$connector = new ConnectorClient();
$deviceConfig = Config::get('device', []);
$status = $connector->checkStatus();

echo json_encode([
    'success' => true,
    'connector_status' => $status,
    'device_config' => [
        'ip_address' => $deviceConfig['ip_address'] ?? '192.168.1.201',
        'port' => $deviceConfig['port'] ?? 4370,
        'last_status' => $deviceConfig['last_connection_status'] ?? 'Disconnected',
        'last_sync_time' => $deviceConfig['last_sync_time'] ?? null
    ],
    'server_time' => date('Y-m-d H:i:s')
]);
