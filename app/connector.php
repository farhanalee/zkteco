<?php
/**
 * ZKTeco K40 Attendance System - Python Connector Client Bridge
 * Communicates with local Python ZKTeco service over localhost HTTP
 */

namespace App;

require_once __DIR__ . '/config.php';

class ConnectorClient {
    private string $baseUrl;
    private string $token;
    private int $timeout;

    public function __construct() {
        $appConfig = Config::get('app', []);
        $this->baseUrl = rtrim($appConfig['connector_url'] ?? 'http://127.0.0.1:9000', '/');
        $this->token = $appConfig['connector_token'] ?? 'zk_sec_tok_k40_9837421894a87b1c';
        $this->timeout = 10;
    }

    private function request(string $method, string $endpoint, array $data = []): array {
        $url = $this->baseUrl . $endpoint;
        $ch = curl_init();

        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
            'X-Connector-Token: ' . $this->token
        ];

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        } elseif ($method === 'PUT') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        } elseif ($method === 'DELETE') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        }

        $raw = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($raw === false || !empty($curlErr)) {
            Config::log('CONNECTOR_ERROR', "Failed to reach Python connector at $url: $curlErr");
            return [
                'success' => false,
                'error' => 'CONNECTOR_OFFLINE',
                'message' => 'The local Python connector service is not running. Please start start_connector.bat on your local machine.'
            ];
        }

        $result = json_decode($raw, true);
        if ($result === null) {
            Config::log('CONNECTOR_ERROR', "Invalid JSON from connector: " . substr($raw, 0, 200));
            return [
                'success' => false,
                'error' => 'INVALID_CONNECTOR_RESPONSE',
                'message' => 'Invalid response received from Python connector.'
            ];
        }

        return $result;
    }

    public function checkStatus(): array {
        return $this->request('GET', '/api/status');
    }

    public function connectDevice(string $ip, int $port = 4370, int $commKey = 0, int $timeout = 5): array {
        $payload = [
            'ip' => $ip,
            'port' => $port,
            'comm_key' => $commKey,
            'timeout' => $timeout
        ];

        $res = $this->request('POST', '/api/connect', $payload);

        // Update local device config status
        $deviceConfig = Config::get('device', []);
        $deviceConfig['ip_address'] = $ip;
        $deviceConfig['port'] = $port;
        $deviceConfig['comm_key'] = $commKey;
        $deviceConfig['connection_timeout'] = $timeout;
        $deviceConfig['last_connection_status'] = ($res['success'] ?? false) ? 'Connected' : 'Disconnected';
        if ($res['success'] ?? false) {
            $deviceConfig['last_sync_time'] = date('Y-m-d H:i:s');
        }
        Config::set('device', $deviceConfig);

        Config::log('DEVICE_CONNECT', ($res['success'] ?? false) ? 'Device connected' : 'Device connection failed', [
            'ip' => $ip,
            'port' => $port,
            'success' => $res['success'] ?? false,
            'error' => $res['error'] ?? null
        ]);

        return $res;
    }

    public function disconnectDevice(): array {
        $res = $this->request('POST', '/api/disconnect');
        $deviceConfig = Config::get('device', []);
        $deviceConfig['last_connection_status'] = 'Disconnected';
        Config::set('device', $deviceConfig);
        return $res;
    }

    public function getDeviceInfo(): array {
        return $this->request('GET', '/api/device-info');
    }

    public function getDeviceTime(): array {
        return $this->request('GET', '/api/device-time');
    }

    public function setDeviceTime(?string $time = null): array {
        return $this->request('POST', '/api/device-time', ['time' => $time]);
    }

    public function getUsers(): array {
        return $this->request('GET', '/api/users');
    }

    public function saveUser(array $userData): array {
        return $this->request('POST', '/api/users', $userData);
    }

    public function deleteUser(string $userId): array {
        return $this->request('DELETE', '/api/users/' . urlencode($userId));
    }

    public function getAttendance(array $filters = []): array {
        $query = !empty($filters) ? '?' . http_build_query($filters) : '';
        return $this->request('GET', '/api/attendance' . $query);
    }

    public function clearAttendance(): array {
        return $this->request('POST', '/api/clear-attendance');
    }

    public function restartDevice(): array {
        return $this->request('POST', '/api/restart-device');
    }
}
