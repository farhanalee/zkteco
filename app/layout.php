<?php
/**
 * ZKTeco K40 Attendance System - Shared Layout Component
 */

namespace App;

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/security.php';

function renderHeader(string $pageTitle, string $activeNav = 'dashboard'): void {
    $device = Config::get('device', []);
    $app = Config::get('app', []);
    $user = Auth::user();
    $csrfToken = Security::getCsrfToken();
    $isConnected = ($device['last_connection_status'] ?? '') === 'Connected';
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="csrf-token" content="<?= htmlspecialchars($csrfToken) ?>">
  <title><?= htmlspecialchars($pageTitle) ?> - ZKTeco K40 System</title>
  
  <!-- Bootstrap 5 CSS & Icons -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
  <link href="/zkteco/public/assets/css/style.css" rel="stylesheet">
</head>
<body>
  <!-- Sidebar -->
  <nav class="sidebar" id="sidebar">
    <div class="brand">
      <div class="bg-primary text-white rounded p-2 d-flex align-items-center justify-content-center" style="width: 38px; height: 38px;">
        <i class="bi bi-fingerprint fs-5"></i>
      </div>
      <div>
        <h1 class="brand-title">ZKTeco K40</h1>
        <p class="brand-subtitle">Attendance System</p>
      </div>
    </div>

    <ul class="sidebar-nav">
      <li class="nav-item">
        <a class="nav-link <?= $activeNav === 'dashboard' ? 'active' : '' ?>" href="/zkteco/public/dashboard.php">
          <i class="bi bi-grid-1x2-fill"></i>
          <span>Dashboard</span>
        </a>
      </li>

      <li class="nav-header">Device</li>
      <li class="nav-item">
        <a class="nav-link <?= $activeNav === 'device_settings' ? 'active' : '' ?>" href="/zkteco/public/device/settings.php">
          <i class="bi bi-router"></i>
          <span>Device Settings</span>
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link <?= $activeNav === 'device_info' ? 'active' : '' ?>" href="/zkteco/public/device/information.php">
          <i class="bi bi-info-circle"></i>
          <span>Device Information</span>
        </a>
      </li>

      <li class="nav-header">Employees</li>
      <li class="nav-item">
        <a class="nav-link <?= $activeNav === 'employees' ? 'active' : '' ?>" href="/zkteco/public/employees/index.php">
          <i class="bi bi-people-fill"></i>
          <span>Employees</span>
        </a>
      </li>

      <li class="nav-header">Attendance</li>
      <li class="nav-item">
        <a class="nav-link <?= $activeNav === 'attendance_live' ? 'active' : '' ?>" href="/zkteco/public/attendance/live.php">
          <i class="bi bi-broadcast"></i>
          <span>Live Attendance</span>
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link <?= $activeNav === 'attendance_records' ? 'active' : '' ?>" href="/zkteco/public/attendance/records.php">
          <i class="bi bi-calendar-check-fill"></i>
          <span>Attendance Records</span>
        </a>
      </li>

      <li class="nav-header">Reports</li>
      <li class="nav-item">
        <a class="nav-link <?= $activeNav === 'report_daily' ? 'active' : '' ?>" href="/zkteco/public/reports/daily.php">
          <i class="bi bi-file-earmark-text"></i>
          <span>Daily Report</span>
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link <?= $activeNav === 'report_employee' ? 'active' : '' ?>" href="/zkteco/public/reports/employee.php">
          <i class="bi bi-person-lines-fill"></i>
          <span>Employee Report</span>
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link <?= $activeNav === 'report_monthly_summary' ? 'active' : '' ?>" href="/zkteco/public/reports/monthly_summary.php">
          <i class="bi bi-calendar3-range"></i>
          <span>Monthly Summary</span>
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link <?= $activeNav === 'report_datewise' ? 'active' : '' ?>" href="/zkteco/public/reports/datewise_attendance.php">
          <i class="bi bi-calendar2-week"></i>
          <span>Date-wise Attendance</span>
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link <?= $activeNav === 'report_consolidated' ? 'active' : '' ?>" href="/zkteco/public/reports/consolidated.php">
          <i class="bi bi-person-vcard"></i>
          <span>Consolidated Report</span>
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link <?= $activeNav === 'report_late' ? 'active' : '' ?>" href="/zkteco/public/reports/late.php">
          <i class="bi bi-alarm"></i>
          <span>Late Report</span>
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link <?= $activeNav === 'report_absent' ? 'active' : '' ?>" href="/zkteco/public/reports/absent.php">
          <i class="bi bi-person-x"></i>
          <span>Absent Report</span>
        </a>
      </li>

      <li class="nav-header">Configuration</li>
      <li class="nav-item">
        <a class="nav-link <?= $activeNav === 'config_shifts' ? 'active' : '' ?>" href="/zkteco/public/configuration/shifts.php">
          <i class="bi bi-clock-history"></i>
          <span>Shifts</span>
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link <?= $activeNav === 'config_departments' ? 'active' : '' ?>" href="/zkteco/public/configuration/departments.php">
          <i class="bi bi-building"></i>
          <span>Departments</span>
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link <?= $activeNav === 'config_designations' ? 'active' : '' ?>" href="/zkteco/public/configuration/designations.php">
          <i class="bi bi-briefcase"></i>
          <span>Designations</span>
        </a>
      </li>

      <li class="nav-header">System</li>
      <li class="nav-item">
        <a class="nav-link <?= $activeNav === 'system_logs' ? 'active' : '' ?>" href="/zkteco/public/api/logs.php?view=html">
          <i class="bi bi-journal-code"></i>
          <span>Connection Logs</span>
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link text-danger" href="/zkteco/public/login.php?action=logout">
          <i class="bi bi-box-arrow-right"></i>
          <span>Logout</span>
        </a>
      </li>
    </ul>
  </nav>

  <!-- Main Wrapper -->
  <div class="main-wrapper">
    <!-- Topbar -->
    <header class="topbar">
      <div class="d-flex align-items-center gap-3">
        <button class="btn btn-sm btn-light d-lg-none" id="sidebarToggle" onclick="document.getElementById('sidebar').classList.toggle('show')">
          <i class="bi bi-list fs-5"></i>
        </button>
        <span class="fw-semibold text-secondary d-none d-sm-inline">
          <i class="bi bi-pc-display me-1"></i> <?= htmlspecialchars($app['company_name'] ?? 'ZKTeco System') ?>
        </span>
      </div>

      <div class="d-flex align-items-center gap-3">
        <!-- Device Connection Pill -->
        <a href="/zkteco/public/device/settings.php" class="text-decoration-none">
          <div class="topbar-device-badge <?= $isConnected ? 'connected' : 'disconnected' ?>">
            <span class="pulse-dot"></span>
            <span><?= $isConnected ? 'K40 Connected (' . htmlspecialchars($device['ip_address'] ?? '') . ')' : 'K40 Disconnected' ?></span>
          </div>
        </a>

        <!-- Admin user profile dropdown -->
        <div class="dropdown">
          <button class="btn btn-light btn-sm dropdown-toggle d-flex align-items-center gap-2" data-bs-toggle="dropdown">
            <i class="bi bi-person-circle text-primary"></i>
            <span class="small fw-medium"><?= htmlspecialchars($user['name'] ?? 'Admin') ?></span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
            <li><h6 class="dropdown-header"><?= htmlspecialchars($user['email'] ?? 'admin@local') ?></h6></li>
            <li><a class="dropdown-item" href="/zkteco/public/device/settings.php"><i class="bi bi-gear me-2"></i>Device Settings</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger" href="/zkteco/public/login.php?action=logout"><i class="bi bi-box-arrow-right me-2"></i>Sign Out</a></li>
          </ul>
        </div>
      </div>
    </header>

    <!-- Page Body -->
    <main class="content-body">
<?php
}

function renderFooter(): void {
?>
    </main>
  </div>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="/zkteco/public/assets/js/app.js"></script>
</body>
</html>
<?php
}
