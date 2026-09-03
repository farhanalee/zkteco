<?php
/**
 * ZKTeco K40 Attendance System - Hardware Information & Capabilities
 */

require_once __DIR__ . '/../../app/config.php';
require_once __DIR__ . '/../../app/auth.php';
require_once __DIR__ . '/../../app/connector.php';
require_once __DIR__ . '/../../app/layout.php';

use App\Auth;
use App\Config;
use App\ConnectorClient;
use function App\renderHeader;
use function App\renderFooter;

Auth::requireAuth();

$deviceConfig = Config::get('device', []);
$connector = new ConnectorClient();

$info = [
    'device_name' => 'ZKTeco K40',
    'serial_number' => 'Not supported by this device',
    'firmware_version' => 'Not supported by this device',
    'platform' => 'ZEM560 / Linux Standalone',
    'mac_address' => 'Not supported by this device',
    'user_capacity' => 1000,
    'user_count' => 0,
    'fingerprint_capacity' => 1000,
    'fingerprint_count' => 0,
    'attendance_capacity' => 80000,
    'attendance_count' => 0,
    'device_time' => null,
    'status' => 'Disconnected'
];

$timeData = [
    'device_time' => null,
    'pc_time' => date('Y-m-d H:i:s'),
    'difference_seconds' => 0,
    'is_synced' => true
];

$isConnected = ($deviceConfig['last_connection_status'] ?? '') === 'Connected';

if ($isConnected) {
    $infoRes = $connector->getDeviceInfo();
    if ($infoRes['success'] ?? false) {
        $info = array_merge($info, $infoRes['data'] ?? []);
    }

    $timeRes = $connector->getDeviceTime();
    if ($timeRes['success'] ?? false) {
        $timeData = array_merge($timeData, $timeRes['data'] ?? []);
    }
}

renderHeader('Device Information', 'device_info');
?>

<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
  <div>
    <h3 class="fw-bold mb-1">Hardware Information</h3>
    <p class="text-muted mb-0 small">Direct hardware specifications and capability diagnostics from ZKTeco K40</p>
  </div>
  <div class="d-flex align-items-center gap-2">
    <button onclick="window.location.reload()" class="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1">
      <i class="bi bi-arrow-clockwise"></i> Refresh Telemetry
    </button>
    <button onclick="App.syncDeviceTime()" class="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm">
      <i class="bi bi-clock-history"></i> Sync Device Clock
    </button>
  </div>
</div>

<!-- Clock Sync & Time Difference Alert -->
<div class="card border-0 shadow-sm rounded-3 mb-4">
  <div class="card-body p-4">
    <div class="row align-items-center g-3">
      <div class="col-12 col-md-4 text-center text-md-start">
        <span class="text-muted small text-uppercase fw-bold">Device Real-Time Clock</span>
        <h4 class="fw-bold text-primary mb-0 font-monospace">
          <i class="bi bi-alarm me-1"></i> <?= htmlspecialchars($timeData['device_time'] ?? 'Offline') ?>
        </h4>
      </div>

      <div class="col-12 col-md-4 text-center">
        <span class="text-muted small text-uppercase fw-bold">Local PC Time</span>
        <h4 class="fw-bold text-dark mb-0 font-monospace">
          <i class="bi bi-laptop me-1"></i> <?= htmlspecialchars($timeData['pc_time']) ?>
        </h4>
      </div>

      <div class="col-12 col-md-4 text-center text-md-end">
        <?php $diff = abs($timeData['difference_seconds']); ?>
        <div class="d-inline-flex flex-column align-items-md-end">
          <span class="badge <?= $diff <= 5 ? 'bg-success' : 'bg-warning text-dark' ?> p-2 px-3 mb-1">
            <?= $diff <= 5 ? 'Clock Synchronized' : "Difference: {$diff}s drift" ?>
          </span>
          <span class="extra-small text-muted">Warning: Confirm before setting device hardware RTC</span>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="row g-4 mb-4">
  <!-- Specifications Card -->
  <div class="col-12 col-lg-6">
    <div class="card border-0 shadow-sm rounded-3 h-100">
      <div class="card-header bg-white border-bottom py-3">
        <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-motherboard me-2 text-primary"></i>Firmware & Hardware Identity</h6>
      </div>
      <div class="card-body p-4">
        <table class="table table-borderless table-sm mb-0">
          <tbody>
            <tr>
              <td class="text-muted py-2" style="width: 40%;">Device Model:</td>
              <td class="fw-bold py-2"><?= htmlspecialchars($info['device_name'] ?? 'ZKTeco K40') ?></td>
            </tr>
            <tr>
              <td class="text-muted py-2">Serial Number:</td>
              <td class="fw-semibold font-monospace py-2 text-break"><?= htmlspecialchars($info['serial_number'] ?? 'Not supported') ?></td>
            </tr>
            <tr>
              <td class="text-muted py-2">Firmware Version:</td>
              <td class="fw-semibold py-2"><?= htmlspecialchars($info['firmware_version'] ?? 'Not supported') ?></td>
            </tr>
            <tr>
              <td class="text-muted py-2">Platform:</td>
              <td class="fw-semibold py-2"><?= htmlspecialchars($info['platform'] ?? 'ZEM560 / Linux') ?></td>
            </tr>
            <tr>
              <td class="text-muted py-2">MAC Address:</td>
              <td class="fw-semibold font-monospace py-2"><?= htmlspecialchars($info['mac_address'] ?? 'Not supported') ?></td>
            </tr>
            <tr>
              <td class="text-muted py-2">Network Endpoint:</td>
              <td class="fw-semibold py-2"><?= htmlspecialchars($deviceConfig['ip_address'] ?? '192.168.1.201') ?>:<?= htmlspecialchars($deviceConfig['port'] ?? '4370') ?></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Memory & Storage Capacity Meters -->
  <div class="col-12 col-lg-6">
    <div class="card border-0 shadow-sm rounded-3 h-100">
      <div class="card-header bg-white border-bottom py-3">
        <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-pie-chart me-2 text-primary"></i>Storage & Memory Utilization</h6>
      </div>
      <div class="card-body p-4">
        <!-- User Capacity -->
        <?php
        $uCap = max(intval($info['user_capacity'] ?? 1000), 1);
        $uCnt = intval($info['user_count'] ?? 0);
        $uPct = min(round(($uCnt / $uCap) * 100, 1), 100);
        ?>
        <div class="mb-4">
          <div class="d-flex justify-content-between mb-1 small fw-semibold">
            <span>Enrolled User Records</span>
            <span><?= $uCnt ?> / <?= number_format($uCap) ?> (<?= $uPct ?>%)</span>
          </div>
          <div class="progress" style="height: 8px;">
            <div class="progress-bar bg-primary" role="progressbar" style="width: <?= $uPct ?>%"></div>
          </div>
        </div>

        <!-- Fingerprint Capacity -->
        <?php
        $fCap = max(intval($info['fingerprint_capacity'] ?? 1000), 1);
        $fCnt = intval($info['fingerprint_count'] ?? $uCnt);
        $fPct = min(round(($fCnt / $fCap) * 100, 1), 100);
        ?>
        <div class="mb-4">
          <div class="d-flex justify-content-between mb-1 small fw-semibold">
            <span>Fingerprint Templates</span>
            <span><?= $fCnt ?> / <?= number_format($fCap) ?> (<?= $fPct ?>%)</span>
          </div>
          <div class="progress" style="height: 8px;">
            <div class="progress-bar bg-success" role="progressbar" style="width: <?= $fPct ?>%"></div>
          </div>
        </div>

        <!-- Attendance Logs Capacity -->
        <?php
        $aCap = max(intval($info['attendance_capacity'] ?? 80000), 1);
        $aCnt = intval($info['attendance_count'] ?? 0);
        $aPct = min(round(($aCnt / $aCap) * 100, 1), 100);
        ?>
        <div class="mb-2">
          <div class="d-flex justify-content-between mb-1 small fw-semibold">
            <span>Attendance Log Flash Memory</span>
            <span><?= number_format($aCnt) ?> / <?= number_format($aCap) ?> (<?= $aPct ?>%)</span>
          </div>
          <div class="progress" style="height: 8px;">
            <div class="progress-bar bg-warning" role="progressbar" style="width: <?= $aPct ?>%"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Capability Matrix -->
<div class="card border-0 shadow-sm rounded-3">
  <div class="card-header bg-white border-bottom py-3">
    <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-shield-check me-2 text-primary"></i>ZKTeco K40 Protocol Capability Matrix</h6>
  </div>
  <div class="card-body p-4">
    <div class="row g-3">
      <div class="col-12 col-md-4">
        <div class="p-3 border rounded-3 bg-light-subtle">
          <div class="d-flex align-items-center gap-2 text-success fw-bold mb-1">
            <i class="bi bi-check-circle-fill"></i> TCP/IP Handshake
          </div>
          <p class="extra-small text-muted mb-0">Verified direct socket session with comm key authentication.</p>
        </div>
      </div>

      <div class="col-12 col-md-4">
        <div class="p-3 border rounded-3 bg-light-subtle">
          <div class="d-flex align-items-center gap-2 text-success fw-bold mb-1">
            <i class="bi bi-check-circle-fill"></i> Get Attendance Logs
          </div>
          <p class="extra-small text-muted mb-0">Binary stream reading from flash storage (CMD_ATTLOG_RRQ).</p>
        </div>
      </div>

      <div class="col-12 col-md-4">
        <div class="p-3 border rounded-3 bg-light-subtle">
          <div class="d-flex align-items-center gap-2 text-success fw-bold mb-1">
            <i class="bi bi-check-circle-fill"></i> Get User Records
          </div>
          <p class="extra-small text-muted mb-0">Unpack 72-byte/28-byte user definitions (CMD_USER_TEMP_RRQ).</p>
        </div>
      </div>

      <div class="col-12 col-md-4">
        <div class="p-3 border rounded-3 bg-light-subtle">
          <div class="d-flex align-items-center gap-2 text-success fw-bold mb-1">
            <i class="bi bi-check-circle-fill"></i> Set Device RTC Time
          </div>
          <p class="extra-small text-muted mb-0">32-bit packed timestamp synchronization (CMD_SET_TIME).</p>
        </div>
      </div>

      <div class="col-12 col-md-4">
        <div class="p-3 border rounded-3 bg-light-subtle">
          <div class="d-flex align-items-center gap-2 text-primary fw-bold mb-1">
            <i class="bi bi-patch-check-fill"></i> Add / Edit Employee
          </div>
          <p class="extra-small text-muted mb-0">Direct memory write with refresh signal (CMD_USER_WRQ).</p>
        </div>
      </div>

      <div class="col-12 col-md-4">
        <div class="p-3 border rounded-3 bg-light-subtle">
          <div class="d-flex align-items-center gap-2 text-primary fw-bold mb-1">
            <i class="bi bi-patch-check-fill"></i> Delete Employee
          </div>
          <p class="extra-small text-muted mb-0">Delete user from hardware storage (CMD_DELETE_USER).</p>
        </div>
      </div>
    </div>
  </div>
</div>

<?php renderFooter(); ?>
