<?php
/**
 * ZKTeco K40 Attendance System - Main Dashboard
 */

require_once __DIR__ . '/../app/config.php';
require_once __DIR__ . '/../app/auth.php';
require_once __DIR__ . '/../app/connector.php';
require_once __DIR__ . '/../app/layout.php';

use App\Auth;
use App\Config;
use App\ConnectorClient;
use function App\renderHeader;
use function App\renderFooter;

Auth::requireAuth();

$deviceConfig = Config::get('device', []);
$appConfig = Config::get('app', []);
$connector = new ConnectorClient();

// Query device info and latest punches
$deviceInfo = ['data' => []];
$users = [];
$attendance = [];
$todayAttendance = [];
$todayDate = date('Y-m-d');
$connectionStatus = $deviceConfig['last_connection_status'] ?? 'Disconnected';
$isConnected = $connectionStatus === 'Connected';

if ($isConnected) {
    $infoRes = $connector->getDeviceInfo();
    if ($infoRes['success'] ?? false) {
        $deviceInfo = $infoRes;
    }

    $usersRes = $connector->getUsers();
    if ($usersRes['success'] ?? false) {
        $users = $usersRes['data'] ?? [];
    }

    $attRes = $connector->getAttendance();
    if ($attRes['success'] ?? false) {
        $attendance = $attRes['data'] ?? [];
        foreach ($attendance as $att) {
            if (($att['date'] ?? '') === $todayDate) {
                $todayAttendance[] = $att;
            }
        }
    }
}

renderHeader('Dashboard', 'dashboard');
?>

<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
  <div>
    <h3 class="fw-bold mb-1">Terminal Dashboard</h3>
    <p class="text-muted mb-0 small">Direct communication overview with ZKTeco K40 biometric hardware</p>
  </div>
  <div class="d-flex align-items-center gap-2">
    <a href="/zkteco/public/attendance/live.php" class="btn btn-primary btn-sm d-flex align-items-center gap-2 shadow-sm">
      <i class="bi bi-broadcast"></i> Live Attendance Feed
    </a>
    <a href="/zkteco/public/device/settings.php" class="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2">
      <i class="bi bi-sliders"></i> Device Settings
    </a>
  </div>
</div>

<!-- 4 Key Metric Cards -->
<div class="row g-3 mb-4">
  <!-- Card 1: Device Status -->
  <div class="col-12 col-sm-6 col-xl-3">
    <div class="metric-card h-100">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <span class="metric-label">Device Status</span>
        <div class="metric-icon-box <?= $isConnected ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger' ?>">
          <i class="bi bi-<?= $isConnected ? 'router-fill' : 'exclamation-diamond-fill' ?>"></i>
        </div>
      </div>
      <div class="metric-value <?= $isConnected ? 'text-success' : 'text-danger' ?>">
        <?= $isConnected ? 'Connected' : 'Offline' ?>
      </div>
      <div class="small text-muted mt-2 d-flex align-items-center gap-1">
        <i class="bi bi-hdd-network"></i>
        <span><?= htmlspecialchars($deviceConfig['ip_address'] ?? '192.168.1.201') ?>:<?= htmlspecialchars($deviceConfig['port'] ?? '4370') ?></span>
      </div>
    </div>
  </div>

  <!-- Card 2: Total Employees -->
  <div class="col-12 col-sm-6 col-xl-3">
    <div class="metric-card h-100">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <span class="metric-label">Enrolled Employees</span>
        <div class="metric-icon-box bg-primary-subtle text-primary">
          <i class="bi bi-people-fill"></i>
        </div>
      </div>
      <div class="metric-value text-primary">
        <?= count($users) > 0 ? count($users) : ($deviceInfo['data']['user_count'] ?? 0) ?>
      </div>
      <div class="small text-muted mt-2 d-flex align-items-center gap-1">
        <i class="bi bi-fingerprint"></i>
        <span><?= $deviceInfo['data']['user_capacity'] ?? '1,000' ?> Capacity</span>
      </div>
    </div>
  </div>

  <!-- Card 3: Today's Punches -->
  <div class="col-12 col-sm-6 col-xl-3">
    <div class="metric-card h-100">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <span class="metric-label">Today's Attendance</span>
        <div class="metric-icon-box bg-warning-subtle text-warning">
          <i class="bi bi-clock-history"></i>
        </div>
      </div>
      <div class="metric-value text-warning">
        <?= count($todayAttendance) ?>
      </div>
      <div class="small text-muted mt-2 d-flex align-items-center gap-1">
        <i class="bi bi-calendar-event"></i>
        <span><?= date('l, d M Y') ?></span>
      </div>
    </div>
  </div>

  <!-- Card 4: Total Stored Records -->
  <div class="col-12 col-sm-6 col-xl-3">
    <div class="metric-card h-100">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <span class="metric-label">K40 Stored Logs</span>
        <div class="metric-icon-box bg-info-subtle text-info">
          <i class="bi bi-database-check"></i>
        </div>
      </div>
      <div class="metric-value text-dark">
        <?= count($attendance) > 0 ? count($attendance) : ($deviceInfo['data']['attendance_count'] ?? 0) ?>
      </div>
      <div class="small text-muted mt-2 d-flex align-items-center gap-1">
        <i class="bi bi-shield-check"></i>
        <span>Source: K40 Flash Memory</span>
      </div>
    </div>
  </div>
</div>

<!-- Hardware Status & Live Activity Row -->
<div class="row g-4 mb-4">
  <!-- Left: Device Hardware Summary -->
  <div class="col-12 col-lg-5">
    <div class="card border-0 shadow-sm rounded-3 h-100">
      <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
        <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-cpu me-2 text-primary"></i>K40 Hardware Telemetry</h6>
        <button onclick="App.syncDeviceTime()" class="btn btn-outline-primary btn-sm py-0 px-2" style="font-size: 0.75rem;">
          <i class="bi bi-arrow-repeat"></i> Sync Clock
        </button>
      </div>
      <div class="card-body">
        <?php if ($isConnected): ?>
          <ul class="list-group list-group-flush small">
            <li class="list-group-item d-flex justify-content-between px-0 py-2">
              <span class="text-muted">Device Model</span>
              <span class="fw-semibold"><?= htmlspecialchars($deviceInfo['data']['device_name'] ?? 'ZKTeco K40') ?></span>
            </li>
            <li class="list-group-item d-flex justify-content-between px-0 py-2">
              <span class="text-muted">Serial Number</span>
              <span class="fw-semibold text-break"><?= htmlspecialchars($deviceInfo['data']['serial_number'] ?? 'ZKT40-LOCAL') ?></span>
            </li>
            <li class="list-group-item d-flex justify-content-between px-0 py-2">
              <span class="text-muted">Firmware Version</span>
              <span class="fw-semibold"><?= htmlspecialchars($deviceInfo['data']['firmware_version'] ?? 'Ver 6.60 (ZEM560)') ?></span>
            </li>
            <li class="list-group-item d-flex justify-content-between px-0 py-2">
              <span class="text-muted">Platform / Architecture</span>
              <span class="fw-semibold"><?= htmlspecialchars($deviceInfo['data']['platform'] ?? 'Linux Standalone') ?></span>
            </li>
            <li class="list-group-item d-flex justify-content-between px-0 py-2">
              <span class="text-muted">Device Clock</span>
              <span class="fw-semibold text-primary"><?= htmlspecialchars($deviceInfo['data']['device_time'] ?? date('Y-m-d H:i:s')) ?></span>
            </li>
            <li class="list-group-item d-flex justify-content-between px-0 py-2">
              <span class="text-muted">Last Handshake Sync</span>
              <span class="fw-semibold"><?= htmlspecialchars($deviceConfig['last_sync_time'] ?? 'Just now') ?></span>
            </li>
          </ul>
        <?php else: ?>
          <div class="text-center py-4">
            <i class="bi bi-router text-muted" style="font-size: 3rem;"></i>
            <h6 class="mt-2 fw-semibold">Device is Offline</h6>
            <p class="text-muted small mb-3">Connect to the ZKTeco K40 at <?= htmlspecialchars($deviceConfig['ip_address'] ?? '192.168.1.201') ?> over TCP/IP.</p>
            <a href="/zkteco/public/device/settings.php" class="btn btn-primary btn-sm">
              <i class="bi bi-broadcast me-1"></i> Configure & Test Connection
            </a>
          </div>
        <?php endif; ?>
      </div>
    </div>
  </div>

  <!-- Right: Recent Attendance Activity -->
  <div class="col-12 col-lg-7">
    <div class="card border-0 shadow-sm rounded-3 h-100">
      <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
        <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-activity me-2 text-primary"></i>Recent Biometric Punches</h6>
        <a href="/zkteco/public/attendance/records.php" class="small text-decoration-none fw-semibold">View All Records &rarr;</a>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0" style="font-size: 0.88rem;">
            <thead class="table-light">
              <tr>
                <th class="ps-3">Employee ID</th>
                <th>Punch Date</th>
                <th>Time</th>
                <th>State</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody>
              <?php
              $recent = array_slice($attendance, 0, 6);
              if (empty($recent)):
              ?>
                <tr>
                  <td colspan="5" class="text-center py-4 text-muted">
                    <i class="bi bi-clock-history d-block fs-3 mb-1"></i>
                    <?= $isConnected ? 'No punch records retrieved yet.' : 'Device disconnected. Connect to fetch logs.' ?>
                  </td>
                </tr>
              <?php else: ?>
                <?php foreach ($recent as $punch): ?>
                  <tr>
                    <td class="ps-3 fw-bold text-dark">EMP-<?= htmlspecialchars($punch['user_id']) ?></td>
                    <td><?= htmlspecialchars($punch['date']) ?></td>
                    <td class="text-primary fw-semibold"><?= htmlspecialchars($punch['time']) ?></td>
                    <td>
                      <span class="badge <?= ($punch['status'] ?? '') === 'Check-In' ? 'bg-success-subtle text-success' : 'bg-info-subtle text-info' ?>">
                        <?= htmlspecialchars($punch['status'] ?? 'Check-In') ?>
                      </span>
                    </td>
                    <td>
                      <span class="text-muted"><i class="bi bi-fingerprint me-1"></i><?= htmlspecialchars($punch['verification_type'] ?? 'Fingerprint') ?></span>
                    </td>
                  </tr>
                <?php endforeach; ?>
              <?php endif; ?>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>

<?php renderFooter(); ?>
