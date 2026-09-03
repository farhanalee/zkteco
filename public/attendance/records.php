<?php
/**
 * ZKTeco K40 Attendance System - All Attendance Records
 * Reads punch logs directly from ZKTeco K40 flash memory
 */

require_once __DIR__ . '/../../app/config.php';
require_once __DIR__ . '/../../app/auth.php';
require_once __DIR__ . '/../../app/connector.php';
require_once __DIR__ . '/../../app/helpers.php';
require_once __DIR__ . '/../../app/layout.php';

use App\Auth;
use App\Config;
use App\ConnectorClient;
use App\AttendanceHelper;
use function App\renderHeader;
use function App\renderFooter;

Auth::requireAuth();

$connector = new ConnectorClient();
$deviceConfig = Config::get('device', []);
$isConnected = ($deviceConfig['last_connection_status'] ?? '') === 'Connected';

$users = [];
$attendance = [];
$error = null;

// Date filters
$fromDate = $_GET['from_date'] ?? date('Y-m-01');
$toDate = $_GET['to_date'] ?? date('Y-m-d');
$selectedEmp = $_GET['user_id'] ?? '';

if ($isConnected) {
    $uRes = $connector->getUsers();
    if ($uRes['success'] ?? false) {
        $users = $uRes['data'] ?? [];
    }

    $attRes = $connector->getAttendance();
    if ($attRes['success'] ?? false) {
        $attendance = $attRes['data'] ?? [];
    } else {
        $error = $attRes['message'] ?? 'Failed to read logs from K40 flash memory';
    }
} else {
    $error = "Device is offline. Connect ZKTeco K40 in Device Settings to read attendance records.";
}

// Build employee lookup
$userMap = [];
foreach ($users as $u) {
    $userMap[strval($u['user_id'] ?? $u['uid'])] = $u['name'] ?? ('Employee #' . ($u['user_id'] ?? ''));
}

// Filter records
$filtered = [];
foreach ($attendance as $punch) {
    $d = $punch['date'] ?? '';
    $uid = strval($punch['user_id'] ?? '');

    if ($d >= $fromDate && $d <= $toDate) {
        if (empty($selectedEmp) || $uid === $selectedEmp) {
            $filtered[] = $punch;
        }
    }
}

// Handle CSV Export
if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    $exportData = [];
    foreach ($filtered as $row) {
        $uid = strval($row['user_id']);
        $exportData[] = [
            'user_id' => "EMP-$uid",
            'name' => $userMap[$uid] ?? "EMP-$uid",
            'date' => $row['date'],
            'time' => $row['time'],
            'status' => $row['status'] ?? 'Check-In',
            'verification' => $row['verification_type'] ?? 'Fingerprint',
            'device' => 'ZKTeco K40'
        ];
    }
    AttendanceHelper::exportToCsv($exportData, [
        'user_id' => 'Employee ID',
        'name' => 'Employee Name',
        'date' => 'Punch Date',
        'time' => 'Punch Time',
        'status' => 'Status',
        'verification' => 'Verification Type',
        'device' => 'Terminal'
    ], "ZKTeco_K40_Attendance_{$fromDate}_to_{$toDate}.csv");
}

renderHeader('Attendance Records', 'attendance_records');
?>

<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
  <div>
    <h3 class="fw-bold mb-1">Attendance Records</h3>
    <p class="text-muted mb-0 small">Direct flash memory log queries from ZKTeco K40</p>
  </div>
  <div class="d-flex align-items-center gap-2">
    <a href="?from_date=<?= urlencode($fromDate) ?>&to_date=<?= urlencode($toDate) ?>&user_id=<?= urlencode($selectedEmp) ?>&export=csv" class="btn btn-outline-success btn-sm d-flex align-items-center gap-1">
      <i class="bi bi-filetype-csv"></i> Export CSV
    </a>
    <button onclick="window.print()" class="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 btn-print-hide">
      <i class="bi bi-printer"></i> Print
    </button>
    <button onclick="window.location.reload()" class="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm btn-print-hide">
      <i class="bi bi-arrow-clockwise"></i> Fetch from Device
    </button>
  </div>
</div>

<?php if ($error && !$isConnected): ?>
  <div class="alert alert-warning py-3 d-flex align-items-center gap-3 shadow-sm border-0 mb-4">
    <i class="bi bi-exclamation-triangle-fill fs-4 text-warning"></i>
    <div>
      <h6 class="fw-bold mb-1">Device Disconnected</h6>
      <p class="mb-0 small"><?= htmlspecialchars($error) ?></p>
    </div>
    <a href="/zkteco/public/device/settings.php" class="btn btn-warning btn-sm ms-auto fw-semibold">Connect K40</a>
  </div>
<?php endif; ?>

<!-- Filter Bar -->
<div class="card border-0 shadow-sm rounded-3 mb-4 filter-section">
  <div class="card-body p-3">
    <form method="GET" action="" class="row g-3 align-items-end">
      <div class="col-12 col-sm-6 col-md-3">
        <label class="form-label small fw-semibold text-secondary">From Date</label>
        <input type="date" class="form-control form-control-sm" name="from_date" value="<?= htmlspecialchars($fromDate) ?>">
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <label class="form-label small fw-semibold text-secondary">To Date</label>
        <input type="date" class="form-control form-control-sm" name="to_date" value="<?= htmlspecialchars($toDate) ?>">
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <label class="form-label small fw-semibold text-secondary">Employee</label>
        <select class="form-select form-select-sm" name="user_id">
          <option value="">All Employees</option>
          <?php foreach ($users as $u): ?>
            <?php $uid = strval($u['user_id'] ?? $u['uid']); ?>
            <option value="<?= htmlspecialchars($uid) ?>" <?= $selectedEmp === $uid ? 'selected' : '' ?>>
              EMP-<?= htmlspecialchars($uid) ?> - <?= htmlspecialchars($u['name'] ?? '') ?>
            </option>
          <?php endforeach; ?>
        </select>
      </div>

      <div class="col-12 col-sm-6 col-md-3 d-flex gap-2">
        <button type="submit" class="btn btn-primary btn-sm w-100 fw-semibold">
          <i class="bi bi-funnel me-1"></i> Apply Filter
        </button>
        <a href="/zkteco/public/attendance/records.php" class="btn btn-light btn-sm" title="Reset">
          <i class="bi bi-arrow-counterclockwise"></i>
        </a>
      </div>
    </form>
  </div>
</div>

<!-- Table Card -->
<div class="card border-0 shadow-sm rounded-3">
  <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
    <h6 class="fw-bold mb-0 text-dark">
      <i class="bi bi-list-check me-2 text-primary"></i>Biometric Attendance Logs (<span class="text-primary"><?= count($filtered) ?></span> records)
    </h6>
    <span class="badge bg-light text-secondary border">Source of Truth: ZKTeco K40</span>
  </div>
  <div class="card-body p-0">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0 table-custom">
        <thead>
          <tr>
            <th class="ps-3">Employee ID</th>
            <th>Employee Name</th>
            <th>Punch Date</th>
            <th>Punch Time</th>
            <th>State</th>
            <th>Verification</th>
            <th>Hardware Terminal</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($filtered)): ?>
            <tr>
              <td colspan="7" class="text-center py-5 text-muted">
                <i class="bi bi-calendar2-x fs-1 d-block mb-2 text-secondary"></i>
                <h6 class="fw-semibold">No Attendance Records Found</h6>
                <p class="small text-muted mb-0"><?= $isConnected ? 'No punch entries match the selected date range.' : 'Connect device to read attendance logs from flash memory.' ?></p>
              </td>
            </tr>
          <?php else: ?>
            <?php foreach ($filtered as $punch): ?>
              <?php
              $uid = strval($punch['user_id']);
              $empName = $userMap[$uid] ?? "EMP-$uid";
              $isCheckIn = ($punch['status'] ?? '') === 'Check-In';
              ?>
              <tr>
                <td class="ps-3 fw-bold font-monospace text-dark">EMP-<?= htmlspecialchars($uid) ?></td>
                <td class="fw-semibold text-primary"><?= htmlspecialchars($empName) ?></td>
                <td><?= htmlspecialchars($punch['date']) ?></td>
                <td class="fw-bold font-monospace text-dark"><?= htmlspecialchars($punch['time']) ?></td>
                <td>
                  <span class="badge <?= $isCheckIn ? 'bg-success-subtle text-success' : 'bg-info-subtle text-info' ?>">
                    <?= htmlspecialchars($punch['status'] ?? 'Check-In') ?>
                  </span>
                </td>
                <td>
                  <span class="text-muted small"><i class="bi bi-fingerprint me-1"></i><?= htmlspecialchars($punch['verification_type'] ?? 'Fingerprint') ?></span>
                </td>
                <td class="text-muted small">ZKTeco K40 (<?= htmlspecialchars($deviceConfig['ip_address'] ?? '192.168.1.201') ?>)</td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<?php renderFooter(); ?>
