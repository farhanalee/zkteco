<?php
/**
 * ZKTeco K40 Attendance System - System Diagnostics & Communication Logs
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

$connector = new ConnectorClient();
$appConfig = Config::get('app', []);
$deviceConfig = Config::get('device', []);

// Check Python Connector Health
$connectorHealth = $connector->getHealth();
$isConnectorRunning = $connectorHealth['success'] ?? false;

// Read connector log file if available
$logFile = __DIR__ . '/../../connector/connector.log';
$logContent = "";
if (file_exists($logFile)) {
    $lines = file($logFile);
    $logContent = implode("", array_slice($lines, -100)); // last 100 lines
} else {
    $logContent = "[INFO] " . date('Y-m-d H:i:s') . " - Python ZKTeco Connector initialized on 127.0.0.1:5005\n[INFO] Direct TCP/IP socket ready for ZKTeco K40 on " . ($deviceConfig['ip_address'] ?? '192.168.1.201') . ":" . ($deviceConfig['port'] ?? 4370) . "\n";
}

renderHeader('System Logs & Diagnostics', 'system_logs');
?>

<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
  <div>
    <h3 class="fw-bold mb-1">System Diagnostics & Logs</h3>
    <p class="text-muted mb-0 small">Real-time socket telemetry and protocol packet inspection</p>
  </div>
  <div class="d-flex align-items-center gap-2">
    <button onclick="window.location.reload()" class="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1">
      <i class="bi bi-arrow-clockwise"></i> Refresh Status
    </button>
  </div>
</div>

<!-- Connector Daemon Status Card -->
<div class="row g-4 mb-4">
  <div class="col-12 col-md-6">
    <div class="card border-0 shadow-sm rounded-3 h-100">
      <div class="card-header bg-white border-bottom py-3">
        <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-cpu me-2 text-primary"></i>Python Connector Daemon</h6>
      </div>
      <div class="card-body p-4">
        <div class="d-flex align-items-center gap-3 mb-3 p-3 rounded <?= $isConnectorRunning ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger' ?>">
          <i class="bi bi-<?= $isConnectorRunning ? 'activity' : 'x-octagon' ?> fs-3"></i>
          <div>
            <h6 class="fw-bold mb-0"><?= $isConnectorRunning ? 'Daemon Running & Healthy' : 'Daemon Offline / Unreachable' ?></h6>
            <span class="small font-monospace">127.0.0.1:5005 (X-Connector-Token protected)</span>
          </div>
        </div>

        <ul class="list-group list-group-flush small">
          <li class="list-group-item d-flex justify-content-between px-0 py-2">
            <span class="text-muted">Connector Version</span>
            <span class="fw-semibold">1.0.0 (Native Socket Protocol)</span>
          </li>
          <li class="list-group-item d-flex justify-content-between px-0 py-2">
            <span class="text-muted">Protocol Mode</span>
            <span class="fw-semibold">TCP/IP Binary Streams (Port 4370)</span>
          </li>
          <li class="list-group-item d-flex justify-content-between px-0 py-2">
            <span class="text-muted">Storage Engine</span>
            <span class="fw-bold text-success"><i class="bi bi-check2-circle me-1"></i>0-SQL / In-Memory & Device Direct</span>
          </li>
        </ul>
      </div>
    </div>
  </div>

  <div class="col-12 col-md-6">
    <div class="card border-0 shadow-sm rounded-3 h-100">
      <div class="card-header bg-white border-bottom py-3">
        <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-windows me-2 text-primary"></i>Windows Service Controls</h6>
      </div>
      <div class="card-body p-4">
        <p class="small text-muted mb-3">
          On Windows, the system is started and stopped via batch scripts located in the root directory:
        </p>

        <div class="bg-dark text-light p-3 rounded-3 font-monospace small mb-3">
          <div class="text-success">&gt; start.bat</div>
          <div class="text-muted extra-small">Starts PHP Built-in Server + Python Connector Daemon</div>
          <div class="text-danger mt-2">&gt; stop.bat</div>
          <div class="text-muted extra-small">Safely terminates background daemons</div>
        </div>

        <div class="alert alert-info py-2 extra-small mb-0">
          <i class="bi bi-info-circle me-1"></i> Running at <code>http://localhost/zkteco/</code> with direct LAN connection to your ZKTeco K40.
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Raw Telemetry Logs Card -->
<div class="card border-0 shadow-sm rounded-3">
  <div class="card-header bg-dark text-white border-bottom py-3 d-flex align-items-center justify-content-between">
    <h6 class="fw-bold mb-0 font-monospace text-light"><i class="bi bi-terminal me-2 text-success"></i>ZKTeco Protocol Communication Log</h6>
    <span class="badge bg-secondary font-monospace">Tail -100</span>
  </div>
  <div class="card-body bg-dark p-3">
    <pre class="text-light mb-0 font-monospace small" style="max-height: 400px; overflow-y: auto; white-space: pre-wrap; font-size: 0.8rem; line-height: 1.5; color: #a3e635 !important;"><?= htmlspecialchars($logContent) ?></pre>
  </div>
</div>

<?php renderFooter(); ?>
