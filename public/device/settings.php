<?php
/**
 * ZKTeco K40 Attendance System - Device Settings & Connection Management
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
$appConfig = Config::get('app', []);
$connector = new ConnectorClient();

$saveMessage = null;
$saveError = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'save_settings') {
    $deviceName = trim($_POST['device_name'] ?? 'ZKTeco K40');
    $ip = trim($_POST['ip_address'] ?? '192.168.1.201');
    $port = intval($_POST['port'] ?? 4370);
    $commKey = intval($_POST['comm_key'] ?? 0);
    $timeout = intval($_POST['connection_timeout'] ?? 5);
    $autoRefresh = intval($_POST['auto_refresh_interval'] ?? 30);

    $deviceConfig['device_name'] = $deviceName;
    $deviceConfig['ip_address'] = $ip;
    $deviceConfig['port'] = $port;
    $deviceConfig['comm_key'] = $commKey;
    $deviceConfig['connection_timeout'] = $timeout;
    $deviceConfig['auto_refresh_interval'] = $autoRefresh;

    if (Config::set('device', $deviceConfig)) {
        $saveMessage = "Device configuration saved successfully.";
    } else {
        $saveError = "Failed to write configuration file.";
    }
}

$isConnected = ($deviceConfig['last_connection_status'] ?? '') === 'Connected';
$deviceInfo = ['data' => []];
if ($isConnected) {
    $infoRes = $connector->getDeviceInfo();
    if ($infoRes['success'] ?? false) {
        $deviceInfo = $infoRes;
    }
}

renderHeader('Device Settings', 'device_settings');
?>

<div class="d-flex align-items-center justify-content-between mb-4">
  <div>
    <h3 class="fw-bold mb-1">Device Management</h3>
    <p class="text-muted mb-0 small">Configure TCP/IP connection parameters for physical ZKTeco K40 hardware</p>
  </div>
  <div>
    <a href="/zkteco/public/device/information.php" class="btn btn-outline-primary btn-sm">
      <i class="bi bi-info-circle me-1"></i> Hardware Information
    </a>
  </div>
</div>

<?php if ($saveMessage): ?>
  <div class="alert alert-success py-2 small d-flex align-items-center gap-2 mb-3">
    <i class="bi bi-check-circle-fill"></i>
    <span><?= htmlspecialchars($saveMessage) ?></span>
  </div>
<?php endif; ?>

<?php if ($saveError): ?>
  <div class="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-3">
    <i class="bi bi-exclamation-circle-fill"></i>
    <span><?= htmlspecialchars($saveError) ?></span>
  </div>
<?php endif; ?>

<!-- Test Connection Result Box -->
<div id="connection-result-box" class="mb-3 d-none"></div>

<div class="row g-4">
  <!-- Left Column: Settings Form -->
  <div class="col-12 col-lg-7">
    <div class="card border-0 shadow-sm rounded-3">
      <div class="card-header bg-white border-bottom py-3">
        <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-sliders me-2 text-primary"></i>Connection Configuration</h6>
      </div>
      <div class="card-body p-4">
        <form method="POST" action="" id="device-settings-form">
          <input type="hidden" name="action" value="save_settings">

          <div class="mb-3">
            <label class="form-label fw-semibold small text-secondary">Device Name</label>
            <input type="text" class="form-control" name="device_name" id="device_name" value="<?= htmlspecialchars($deviceConfig['device_name'] ?? 'ZKTeco K40') ?>" required>
            <div class="form-text extra-small text-muted">Friendly identifier for your biometric terminal</div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-12 col-md-8">
              <label class="form-label fw-semibold small text-secondary">IP Address <span class="text-danger">*</span></label>
              <div class="input-group">
                <span class="input-group-text bg-light"><i class="bi bi-ethernet text-muted"></i></span>
                <input type="text" class="form-control" name="ip_address" id="ip_address" placeholder="192.168.1.201" value="<?= htmlspecialchars($deviceConfig['ip_address'] ?? '192.168.1.201') ?>" required>
              </div>
              <div class="form-text extra-small text-muted">Static IP assigned to your K40 (e.g. 192.168.1.201)</div>
            </div>

            <div class="col-12 col-md-4">
              <label class="form-label fw-semibold small text-secondary">Port <span class="text-danger">*</span></label>
              <div class="input-group">
                <span class="input-group-text bg-light"><i class="bi bi-diagram-3 text-muted"></i></span>
                <input type="number" class="form-control" name="port" id="port" value="<?= htmlspecialchars($deviceConfig['port'] ?? '4370') ?>" required>
              </div>
              <div class="form-text extra-small text-muted">Default ZKTeco: 4370</div>
            </div>
          </div>

          <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <label class="form-label fw-semibold small text-secondary mb-0">Communication Key (Comm Password)</label>
              <span class="text-muted extra-small">Default: 0</span>
            </div>
            <div class="input-group mb-2">
              <span class="input-group-text bg-light"><i class="bi bi-key text-muted"></i></span>
              <input type="text" class="form-control font-monospace" name="comm_key" id="comm_key" placeholder="0" value="<?= htmlspecialchars($deviceConfig['comm_key'] ?? '0') ?>">
            </div>
            <div class="d-flex align-items-center gap-1 flex-wrap mb-1">
              <span class="text-muted extra-small me-1">Quick Presets:</span>
              <?php foreach ([0, 123456, 1234, 111111, 888888] as $preset): ?>
                <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2 extra-small" onclick="document.getElementById('comm_key').value = '<?= $preset ?>';">
                  <?= $preset ?>
                </button>
              <?php endforeach; ?>
            </div>
            <div class="form-text extra-small text-muted">Check on physical K40 machine: <strong>Menu &rarr; Comm. &rarr; Comm Key</strong> (Set to <code>0</code> or your passcode)</div>
          </div>

          <div class="row g-3 mb-4">
            <div class="col-12 col-md-6">
              <label class="form-label fw-semibold small text-secondary">Connection Timeout (seconds)</label>
              <input type="number" class="form-control" name="connection_timeout" id="connection_timeout" min="2" max="30" value="<?= htmlspecialchars($deviceConfig['connection_timeout'] ?? '5') ?>">
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label fw-semibold small text-secondary">Auto Refresh Interval (seconds)</label>
              <input type="number" class="form-control" name="auto_refresh_interval" id="auto_refresh_interval" min="5" max="300" value="<?= htmlspecialchars($deviceConfig['auto_refresh_interval'] ?? '30') ?>">
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2 pt-2 border-top">
            <button type="button" id="btn-test-connection" class="btn btn-success fw-semibold" onclick="App.testConnection(document.getElementById('ip_address').value, document.getElementById('port').value, document.getElementById('comm_key').value, document.getElementById('connection_timeout').value)">
              <i class="bi bi-broadcast me-1"></i> Test Connection
            </button>
            <button type="submit" class="btn btn-primary fw-semibold">
              <i class="bi bi-save me-1"></i> Save Settings
            </button>
            <?php if ($isConnected): ?>
              <button type="button" class="btn btn-outline-danger ms-auto" onclick="App.apiRequest('/zkteco/public/api/device.php?action=disconnect', 'POST').then(() => window.location.reload())">
                <i class="bi bi-power me-1"></i> Disconnect
              </button>
            <?php endif; ?>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Right Column: Status & Live Diagnostic Preview -->
  <div class="col-12 col-lg-5">
    <div class="card border-0 shadow-sm rounded-3 mb-4">
      <div class="card-header bg-white border-bottom py-3">
        <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-activity me-2 text-primary"></i>Live Device Status</h6>
      </div>
      <div class="card-body p-4">
        <div class="d-flex align-items-center gap-3 p-3 rounded mb-3 <?= $isConnected ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger' ?>">
          <i class="bi bi-<?= $isConnected ? 'check-circle-fill' : 'x-circle-fill' ?> fs-2"></i>
          <div>
            <h6 class="fw-bold mb-0"><?= $isConnected ? 'ZKTeco K40 Connected' : 'Device Disconnected' ?></h6>
            <span class="small"><?= $isConnected ? 'TCP/IP Handshake Verified &bull; Active' : 'Waiting for connection test' ?></span>
          </div>
        </div>

        <ul class="list-group list-group-flush small">
          <li class="list-group-item d-flex justify-content-between px-0 py-2">
            <span class="text-muted">Target IP:Port</span>
            <span class="fw-semibold font-monospace"><?= htmlspecialchars($deviceConfig['ip_address'] ?? '192.168.1.201') ?>:<?= htmlspecialchars($deviceConfig['port'] ?? '4370') ?></span>
          </li>
          <li class="list-group-item d-flex justify-content-between px-0 py-2">
            <span class="text-muted">Comm Key Status</span>
            <span class="fw-semibold"><?= empty($deviceConfig['comm_key']) ? 'Default (0)' : 'Configured (Encrypted)' ?></span>
          </li>
          <li class="list-group-item d-flex justify-content-between px-0 py-2">
            <span class="text-muted">Serial Number</span>
            <span class="fw-semibold"><?= htmlspecialchars($deviceInfo['data']['serial_number'] ?? 'Unavailable') ?></span>
          </li>
          <li class="list-group-item d-flex justify-content-between px-0 py-2">
            <span class="text-muted">Firmware Version</span>
            <span class="fw-semibold"><?= htmlspecialchars($deviceInfo['data']['firmware_version'] ?? 'Unavailable') ?></span>
          </li>
          <li class="list-group-item d-flex justify-content-between px-0 py-2">
            <span class="text-muted">MAC Address</span>
            <span class="fw-semibold font-monospace"><?= htmlspecialchars($deviceInfo['data']['mac_address'] ?? 'Unavailable') ?></span>
          </li>
          <li class="list-group-item d-flex justify-content-between px-0 py-2">
            <span class="text-muted">Enrolled Users</span>
            <span class="fw-semibold text-primary"><?= htmlspecialchars($deviceInfo['data']['user_count'] ?? 0) ?></span>
          </li>
          <li class="list-group-item d-flex justify-content-between px-0 py-2">
            <span class="text-muted">Stored Punches</span>
            <span class="fw-semibold text-dark"><?= htmlspecialchars($deviceInfo['data']['attendance_count'] ?? 0) ?></span>
          </li>
          <li class="list-group-item d-flex justify-content-between px-0 py-2">
            <span class="text-muted">Last Successful Sync</span>
            <span class="fw-semibold"><?= htmlspecialchars($deviceConfig['last_sync_time'] ?? 'Never') ?></span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Troubleshooting helper box -->
    <div class="card border-0 bg-light-subtle shadow-sm rounded-3">
      <div class="card-body p-3">
        <h6 class="fw-bold small text-secondary mb-2"><i class="bi bi-question-circle me-1"></i> Quick Network Checklist</h6>
        <ol class="small text-muted ps-3 mb-0" style="font-size: 0.8rem; line-height: 1.6;">
          <li>Ensure K40 is connected to your local router/switch with an Ethernet cable.</li>
          <li>Check K40 IP in <strong>Menu &rarr; Comm &rarr; Ethernet</strong> (e.g. <code>192.168.1.201</code>).</li>
          <li>Verify your PC is in the same subnet (e.g. <code>192.168.1.xxx</code>).</li>
          <li>Comm Key in K40 menu must match the key entered above (default is <code>0</code>).</li>
        </ol>
      </div>
    </div>
  </div>
</div>

<?php renderFooter(); ?>
