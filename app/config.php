<?php
/**
 * ZKTeco K40 Attendance System - JSON Configuration Manager
 * Handles reading and writing JSON config files with file locking
 */

namespace App;

class Config {
    private static string $configDir = __DIR__ . '/../config';
    private static string $storageDir = __DIR__ . '/../storage';

    public static function get(string $key, mixed $default = null): mixed {
        $file = self::$configDir . '/' . $key . '.json';
        if (!file_exists($file)) {
            return $default;
        }

        $content = @file_get_contents($file);
        if ($content === false) {
            return $default;
        }

        $data = json_decode($content, true);
        return $data !== null ? $data : $default;
    }

    public static function set(string $key, mixed $data): bool {
        $file = self::$configDir . '/' . $key . '.json';
        if (!is_dir(self::$configDir)) {
            @mkdir(self::$configDir, 0755, true);
        }

        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        return @file_put_contents($file, $json, LOCK_EX) !== false;
    }

    public static function log(string $type, string $message, array $context = []): void {
        $logDir = self::$storageDir . '/logs';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }

        // Sanitize sensitive values
        if (isset($context['comm_key'])) $context['comm_key'] = '******';
        if (isset($context['password'])) $context['password'] = '******';
        if (isset($context['token'])) $context['token'] = '******';

        $timestamp = date('Y-m-d H:i:s');
        $contextStr = !empty($context) ? ' ' . json_encode($context) : '';
        $line = "[$timestamp] [$type] $message$contextStr" . PHP_EOL;

        $logFile = $logDir . '/application.log';
        @file_put_contents($logFile, $line, FILE_APPEND | LOCK_EX);
    }
}
