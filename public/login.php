<?php
/**
 * ZKTeco K40 Attendance System - Admin Authentication
 */

require_once __DIR__ . '/../app/config.php';
require_once __DIR__ . '/../app/security.php';
require_once __DIR__ . '/../app/auth.php';

use App\Auth;
use App\Security;
use App\Config;

Security::initSession();

// Handle Logout
if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    Auth::logout();
    header('Location: /zkteco/public/login.php?logged_out=1');
    exit;
}

// Redirect if already logged in
if (Auth::check()) {
    header('Location: /zkteco/public/dashboard.php');
    exit;
}

$error = null;
$success = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = $_POST['csrf_token'] ?? '';
    if (!Security::validateCsrfToken($csrf)) {
        $error = 'Security session validation failed (CSRF mismatch). Please try again.';
    } else {
        $username = trim($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';

        $loginRes = Auth::login($username, $password);
        if ($loginRes['success']) {
            header('Location: /zkteco/public/dashboard.php');
            exit;
        } else {
            $error = $loginRes['message'];
        }
    }
}

$csrfToken = Security::getCsrfToken();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - ZKTeco K40 Attendance System</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
  <style>
    body {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    }
    .login-card {
      background: #ffffff;
      border-radius: 16px;
      padding: 40px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.25);
    }
    .brand-icon {
      width: 56px;
      height: 56px;
      background: #1e3a8a;
      color: #fff;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
      margin: 0 auto 16px;
    }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="text-center mb-4">
      <div class="brand-icon">
        <i class="bi bi-fingerprint"></i>
      </div>
      <h3 class="fw-bold mb-1 text-dark">ZKTeco K40</h3>
      <p class="text-muted small">Biometric Attendance Terminal Portal</p>
    </div>

    <?php if ($error): ?>
      <div class="alert alert-danger py-2 small d-flex align-items-center gap-2">
        <i class="bi bi-exclamation-circle-fill"></i>
        <span><?= htmlspecialchars($error) ?></span>
      </div>
    <?php endif; ?>

    <?php if (isset($_GET['logged_out'])): ?>
      <div class="alert alert-info py-2 small d-flex align-items-center gap-2">
        <i class="bi bi-info-circle-fill"></i>
        <span>You have been safely signed out.</span>
      </div>
    <?php endif; ?>

    <form method="POST" action="">
      <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken) ?>">
      
      <div class="mb-3">
        <label class="form-label small fw-semibold text-secondary">Username</label>
        <div class="input-group">
          <span class="input-group-text bg-light text-muted"><i class="bi bi-person"></i></span>
          <input type="text" name="username" class="form-control" placeholder="admin" value="admin" required autofocus>
        </div>
      </div>

      <div class="mb-4">
        <label class="form-label small fw-semibold text-secondary">Password</label>
        <div class="input-group">
          <span class="input-group-text bg-light text-muted"><i class="bi bi-lock"></i></span>
          <input type="password" name="password" class="form-control" placeholder="••••••••" value="admin123" required>
        </div>
        <div class="form-text extra-small text-muted mt-1">Default credentials: <code>admin</code> / <code>admin123</code></div>
      </div>

      <button type="submit" class="btn btn-primary w-100 py-2 fw-semibold shadow-sm">
        <i class="bi bi-box-arrow-in-right me-1"></i> Sign In to Portal
      </button>
    </form>

    <div class="mt-4 pt-3 border-top text-center text-muted" style="font-size: 0.75rem;">
      <span>Direct TCP/IP Connection to ZKTeco K40 &bull; No MySQL</span>
    </div>
  </div>
</body>
</html>
