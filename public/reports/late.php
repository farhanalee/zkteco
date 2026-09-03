<?php
/**
 * ZKTeco K40 Attendance System - Late Arrivals Report
 * With per-day detected shift for accurate late calculation
 * Uses per-day auto shift detection
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
$shifts = Config::get('shifts', []);
$deviceConfig = Config::get('device', []);
$isConnected = ($deviceConfig['last_connection_status'] ?? '') === 'Connected';

$fromDate = $_GET['from_date'] ?? date('Y-m-01');
$toDate = $_GET['to_date'] ?? date('Y-m-d');

$users = [];
$attendance = [];

if ($isConnected) {
    $uRes = $connector->getUsers();
    if ($uRes['success'] ?? false) $users = $uRes['data'] ?? [];

    $aRes = $connector->getAttendance();
    if ($aRes['success'] ?? false) $attendance = $aRes['data'] ?? [];
}

// Late report uses per-day auto shift detection internally
$lateRecords = AttendanceHelper::getLateReport($attendance, $users, $fromDate, $toDate);

// CSV Export
if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    AttendanceHelper::exportToCsv($lateRecords, [
        'user_id' => 'Employee ID',
        'name' => 'Employee Name',
        'date' => 'Punch Date',
        'punch_time' => 'Arrival Time',
        'shift_start' => 'Shift Start Time',
        'late_minutes' => 'Late (Minutes)',
        'shift_name' => 'Detected Shift',
        'detected_shift_id' => 'Shift ID',
        'is_auto_detected' => 'Auto Detected'
    ], "ZKTeco_Late_Report_{$fromDate}_to_{$toDate}.csv");
}

renderHeader('Late Arrivals Report', 'report_late');
?>

<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
  <div>
    <h3 class="fw-bold mb-1">Late Arrivals Report</h3>
    <p class="text-muted mb-0 small">Identifies punches registered past shift start time and grace period threshold (per-day auto shift detection)</p>
  </div>
  <div class="d-flex align-items-center gap-2">
    <a href="?from_date=<?= urlencode($fromDate) ?>&to_date=<?= urlencode($toDate) ?>&export=csv" class="btn btn-outline-success btn-sm d-flex align-items-center gap-1">
      <i class="bi bi-filetype-csv"></i> Export CSV
    </a>
    <button onclick="window.print()" class="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 btn-print-hide">
      <i class="bi bi-printer"></i> Print
    </button>
  </div>
</div>

<!-- Filter Bar -->
<div class="card border-0 shadow-sm rounded-3 mb-4 filter-section">
  <div class="card-body p-3">
    <form method="GET" action="" class="row g-3 align-items-end">
      <div class="col-12 col-sm-6 col-md-4">
        <label class="form-label small fw-semibold text-secondary">From Date</label>
        <input type="date" class="form-control form-control-sm" name="from_date" value="<?= htmlspecialchars($fromDate) ?>">
      </div>

      <div class="col-12 col-sm-6 col-md-4">
        <label class="form-label small fw-semibold text-secondary">To Date</label>
        <input type="date" class="form-control form-control-sm" name="to_date" value="<?= htmlspecialchars($toDate) ?>">
      </div>

      <div class="col-12 col-sm-6 col-md-4">
        <button type="submit" class="btn btn-primary btn-sm w-100 fw-semibold">
          <i class="bi bi-funnel me-1"></i> Filter Late Logs
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Summary Cards -->
<div class="row g-3 mb-4">
  <div class="col-6 col-md-3">
    <div class="p-3 bg-white border rounded-3 shadow-sm text-center">
      <span class="text-muted extra-small text-uppercase fw-bold">Total Late Incidents</span>
      <h3 class="fw-bold text-warning mb-0"><?= count($lateRecords) ?></h3>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="p-3 bg-white border rounded-3 shadow-sm text-center">
      <span class="text-muted extra-small text-uppercase fw-bold">Unique Employees Late</span>
      <h3 class="fw-bold text-danger mb-0">
        <?= count(array_unique(array_column($lateRecords, 'user_id'))) ?>
      </h3>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="p-3 bg-white border rounded-3 shadow-sm text-center">
      <span class="text-muted extra-small text-uppercase fw-bold">Avg Late (Minutes)</span>
      <h3 class="fw-bold text-info mb-0">
        <?php
        $avgLate = count($lateRecords) > 0 ? round(array_sum(array_column($lateRecords, 'late_minutes')) / count($lateRecords), 1) : 0;
        echo $avgLate;
        ?>
      </h3>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="p-3 bg-white border rounded-3 shadow-sm text-center">
      <span class="text-muted extra-small text-uppercase fw-bold">Max Late (Minutes)</span>
      <h3 class="fw-bold text-danger mb-0">
        <?php
        $maxLate = count($lateRecords) > 0 ? max(array_column($lateRecords, 'late_minutes')) : 0;
        echo $maxLate;
        ?>
      </h3>
    </div>
  </div>
</div>

<!-- Late Table -->
<div class="card border-0 shadow-sm rounded-3">
  <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
    <h6 class="fw-bold mb-0 text-dark">
      <i class="bi bi-alarm me-2 text-warning"></i>Late Punch Incidents (<span class="text-warning fw-bold"><?= count($lateRecords) ?></span>)
    </h6>
  </div>
  <div class="card-body p-0">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0 table-custom">
        <thead>
          <tr>
            <th class="ps-3">Employee ID</th>
            <th>Employee Name</th>
            <th>Date</th>
            <th>Actual In Time</th>
            <th>Shift Scheduled</th>
            <th>Late Duration</th>
            <th class="text-center" style="width:200px">
              <i class="bi bi-clock-history text-info me-1"></i>Detected Shift
            </th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($lateRecords)): ?>
            <tr>
              <td colspan="7" class="text-center py-5 text-muted">
                <i class="bi bi-emoji-smile fs-1 d-block mb-2 text-success"></i>
                <h6 class="fw-semibold text-success">No Late Arrivals Recorded</h6>
                <p class="small text-muted mb-0">All employee check-ins were within scheduled shift grace limits.</p>
              </td>
            </tr>
          <?php else: ?>
            <?php foreach ($lateRecords as $row):
                $isAuto = $row['is_auto_detected'] ?? false;
                $shiftBadgeClass = $isAuto ? 'bg-info-subtle text-info' : 'bg-primary-subtle text-primary';
                $autoLabel = $isAuto ? '<span class="badge bg-light text-dark border ms-1" style="font-size:8px;">Auto</span>' : '';
              ?>
              <tr>
                <td class="ps-3 fw-bold font-monospace text-dark">EMP-<?= htmlspecialchars($row['user_id']) ?></td>
                <td class="fw-semibold text-primary"><?= htmlspecialchars($row['name']) ?></td>
                <td><?= htmlspecialchars($row['date']) ?></td>
                <td class="text-danger fw-bold font-monospace"><?= htmlspecialchars($row['punch_time']) ?></td>
                <td class="text-muted font-monospace"><?= htmlspecialchars($row['shift_start']) ?></td>
                <td>
                  <span class="badge bg-warning-subtle text-warning fw-bold">
                    +<?= $row['late_minutes'] ?> minutes late
                  </span>
                </td>
                <td class="text-center">
                  <?php if (!empty($row['shift_name'])): ?>
                    <span class="badge <?= $shiftBadgeClass ?> fw-semibold px-2 py-1">
                      <i class="bi bi-clock me-1"></i><?= htmlspecialchars($row['shift_name']) ?>
                    </span>
                    <?= $autoLabel ?>
                  <?php else: ?>
                    <span class="text-muted">—</span>
                  <?php endif; ?>
                </td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<?php renderFooter(); ?>