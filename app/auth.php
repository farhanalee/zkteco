<?php
/**
 * ZKTeco K40 Attendance System - Authentication Service
 */

namespace App;

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/security.php';

class Auth {
    public static function check(): bool {
        Security::initSession();
        if (!isset($_SESSION['user_id']) || empty($_SESSION['user_id'])) {
            return false;
        }

        $appConfig = Config::get('app');
        $lifetime = ($appConfig['session_lifetime_minutes'] ?? 120) * 60;

        if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $lifetime)) {
            self::logout();
            return false;
        }

        $_SESSION['last_activity'] = time();
        return true;
    }

    public static function user(): ?array {
        if (!self::check()) {
            return null;
        }
        return [
            'username' => $_SESSION['username'] ?? 'admin',
            'name' => $_SESSION['user_name'] ?? 'System Administrator',
            'email' => $_SESSION['user_email'] ?? 'admin@local.zkteco',
            'role' => 'Administrator'
        ];
    }

    public static function login(string $username, string $password): array {
        Security::initSession();
        $appConfig = Config::get('app');
        $adminUser = $appConfig['admin_user'] ?? [];

        if (empty($adminUser)) {
            return ['success' => false, 'message' => 'Admin user configuration is missing'];
        }

        if ($username !== ($adminUser['username'] ?? 'admin')) {
            Config::log('AUTH_FAIL', "Invalid login attempt for username: $username");
            return ['success' => false, 'message' => 'Invalid username or password'];
        }

        $hash = $adminUser['password_hash'] ?? '';
        // Fallback for initial default admin123
        $valid = Security::verifyPassword($password, $hash) || ($password === 'admin123' && (empty($hash) || str_starts_with($hash, '$2y$10$92IX')));

        if (!$valid) {
            Config::log('AUTH_FAIL', "Invalid password for user: $username");
            return ['success' => false, 'message' => 'Invalid username or password'];
        }

        $_SESSION['user_id'] = 1;
        $_SESSION['username'] = $username;
        $_SESSION['user_name'] = $adminUser['name'] ?? 'System Administrator';
        $_SESSION['user_email'] = $adminUser['email'] ?? 'admin@local.zkteco';
        $_SESSION['last_activity'] = time();

        Config::log('AUTH_SUCCESS', "Admin logged in successfully from " . ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'));
        return ['success' => true, 'message' => 'Login successful'];
    }

    public static function logout(): void {
        Security::initSession();
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();
    }

    public static function requireAuth(): void {
        if (!self::check()) {
            if (isset($_SERVER['HTTP_ACCEPT']) && str_contains($_SERVER['HTTP_ACCEPT'], 'application/json')) {
                header('Content-Type: application/json', true, 401);
                echo json_encode(['success' => false, 'error' => 'UNAUTHORIZED', 'message' => 'Session expired. Please log in again.']);
                exit;
            }
            header('Location: /zkteco/public/login.php');
            exit;
        }
    }
}
