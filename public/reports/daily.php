<?php
/**
 * ZKTeco K40 Attendance System - Daily Attendance Report
 * All employees: Date | Employee Name | Check In | Check Out | Total Hours | Status | Overtime | Detected Shift
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

$selectedDate = $_GET['date'] ?? date('Y-m-d');

$users = [];
$attendance = [];

if ($isConnected) {
    $uRes = $connector->getUsers();
    if ($uRes['success'] ?? false) $users = $uRes['data'] ?? [];

    $aRes = $connector->getAttendance(['date' => $selectedDate]);
    if ($aRes['success'] ?? false) $attendance = $aRes['data'] ?? [];
}

// Daily report uses per-day auto shift detection
$reportRows = AttendanceHelper::processDailyAttendance($attendance, $users, $selectedDate);

// CSV Export
if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    AttendanceHelper::exportToCsv($reportRows, [
        'user_id' => 'Employee ID',
        'name' => 'Employee Name',
        'date' => 'Date',
        'first_in' => 'Check In',
        'last_out' => 'Check Out',
        'duration' => 'Working Duration',
        'total_hours' => 'Total Hours (Decimal)',
        'status' => 'Status',
        'shift_name' => 'Detected Shift',
        'detected_shift_id' => 'Shift ID',
        'is_auto_detected' => 'Auto Detected',
        'overtime' => 'Overtime',
        'overtime_hours' => 'Overtime Hours'
    ], "ZKTeco_Daily_Report_{$selectedDate}.csv");
}

renderHeader('Daily Attendance Report', 'report_daily');
?>

<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
  <div>
    <h3 class="fw-bold mb-1">Daily Attendance Summary</h3>
    <p class="text-muted mb-0 small">Calculates Check In, Check Out, Work Hours and Overtime from K40 biometric punches (per-day auto shift detection)</p>
  </div>
  <div class="d-flex align-items-center gap-2">
    <a href="?date=<?= urlencode($selectedDate) ?>&export=csv" class="btn btn-outline-success btn-sm d-flex align-items-center gap-1">
      <i class="bi bi-filetype-csv"></i> Export CSV
    </a>
    <button onclick="window.print()" class="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 btn-print-hide">
      <i class="bi bi-printer"></i> Print Summary
    </button>
  </div>
</div>

<!-- Filter Bar -->
<div class="card border-0 shadow-sm rounded-3 mb-4 filter-section">
  <div class="card-body p-3">
    <form method="GET" action="" class="row g-3 align-items-end">
      <div class="col-12 col-sm-6 col-md-4">
        <label class="form-label small fw-semibold text-secondary">Attendance Date</label>
        <input type="date" class="form-control form-control-sm" name="date" value="<?= htmlspecialchars($selectedDate) ?>">
      </div>

      <div class="col-12 col-sm-6 col-md-4">
        <label class="form-label small fw-semibold text-secondary">Per-Day Auto Detection</label>
        <select class="form-select form-select-sm" disabled>
          <option value="auto" selected>Auto Detect Shift per Employee per Day</option>
        </select>
      </div>

      <div class="col-12 col-sm-12 col-md-4">
        <button type="submit" class="btn btn-primary btn-sm w-100 fw-semibold">
          <i class="bi bi-calculator me-1"></i> Calculate Daily Summary
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Report Summary Cards -->
<div class="row g-3 mb-4">
  <div class="col-6 col-md-3">
    <div class="p-3 bg-white border rounded-3 shadow-sm text-center">
      <span class="text-muted extra-small text-uppercase fw-bold">Present Today</span>
      <h3 class="fw-bold text-success mb-0"><?= count($reportRows) ?></h3>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="p-3 bg-white border rounded-3 shadow-sm text-center">
      <span class="text-muted extra-small text-uppercase fw-bold">Total Punches</span>
      <h3 class="fw-bold text-primary mb-0"><?= count($attendance) ?></h3>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="p-3 bg-white border rounded-3 shadow-sm text-center">
      <span class="text-muted extra-small text-uppercase fw-bold">Target Date</span>
      <h6 class="fw-bold text-dark mt-2 mb-0"><?= date('D, d M Y', strtotime($selectedDate)) ?></h6>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="p-3 bg-white border rounded-3 shadow-sm text-center">
      <span class="text-muted extra-small text-uppercase fw-bold">Data Source</span>
      <h6 class="fw-bold text-secondary mt-2 mb-0"><i class="bi bi-fingerprint text-primary me-1"></i>K40 Flash</h6>
    </div>
  </div>
</div>

<!-- Shift Pattern Summary for this day -->
<?php
$shiftCounts = [];
foreach ($reportRows as $row) {
    if (!empty($row['detected_shift_name']) && $row['detected_shift_name'] !== 'Standard Shift') {
        $shiftName = $row['detected_shift_name'];
        $shiftCounts[$shiftName] = ($shiftCounts[$shiftName] ?? 0) + 1;
    }
}
if (!empty($shiftCounts)):
?>
<div class="card border-0 shadow-sm rounded-3 mb-4" style="background: linear-gradient(135deg, #f5f7ff 0%, #fff 100%);">
  <div class="card-body py-3 px-4">
    <div class="text-muted extra-small text-uppercase fw-bold mb-2">
      <i class="bi bi-clock-history me-1"></i>Shift Pattern Distribution for <?= date('D, d M Y', strtotime($selectedDate)) ?>
    </div>
    <div class="d-flex flex-wrap gap-2">
      <?php foreach ($shiftCounts as $shiftName => $count): ?>
        <span class="badge bg-info-subtle text-info border px-2 py-1 small">
          <?= htmlspecialchars($shiftName) ?>: <strong><?= $count ?></strong> employees
        </span>
      <?php endforeach; ?>
    </div>
  </div>
</div>
<?php endif; ?>

<!-- Report Table -->
<div class="card border-0 shadow-sm rounded-3">
  <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
    <h6 class="fw-bold mb-0 text-dark">
      <i class="bi bi-table me-2 text-primary"></i>Daily Timesheet Record
    </h6>
    <span class="badge bg-light text-secondary border"><?= count($reportRows) ?> Employees Present</span>
  </div>
  <div class="card-body p-0">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0 table-custom">
        <thead>
          <tr>
            <th class="ps-3">Employee ID</th>
            <th>Employee Name</th>
            <th>Date</th>
            <th class="text-success">Check In</th>
            <th class="text-danger">Check Out</th>
            <th>Duration</th>
            <th>Total Hours</th>
            <th>Status</th>
            <th class="text-primary">Overtime</th>
            <th class="text-center" style="width:200px">
              <i class="bi bi-clock-history text-info me-1"></i>Detected Shift
            </th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($reportRows)): ?>
            <tr>
              <td colspan="10" class="text-center py-5 text-muted">
                <i class="bi bi-clock-history fs-1 d-block mb-2 text-secondary"></i>
                <h6 class="fw-semibold">No Attendance Records for <?= htmlspecialchars($selectedDate) ?></h6>
                <p class="small text-muted mb-0">Ensure biometric punches exist on the K40 device for this date.</p>
              </td>
            </tr>
          <?php else: ?>
            <?php foreach ($reportRows as $row):
              $isAuto = $row['is_auto_detected'] ?? false;
              $shiftBadgeClass = $isAuto ? 'bg-info-subtle text-info' : 'bg-primary-subtle text-primary';
              $autoLabel = $isAuto ? '<span class="badge bg-light text-dark border ms-1" style="font-size:8px;">Auto</span>' : '';
            ?>
              <tr>
                <td class="ps-3 fw-bold font-monospace text-dark">EMP-<?= htmlspecialchars($row['user_id']) ?></td>
                <td class="fw-semibold text-primary"><?= htmlspecialchars($row['name']) ?></td>
                <td><?= htmlspecialchars($row['date']) ?></td>
                <td class="text-success fw-bold font-monospace"><?= htmlspecialchars($row['first_in']) ?></td>
                <td class="text-danger fw-bold font-monospace"><?= htmlspecialchars($row['last_out']) ?></td>
                <td class="fw-semibold text-dark"><?= htmlspecialchars($row['duration']) ?></td>
                <td class="fw-bold text-info"><?= number_format($row['total_hours'], 1) ?>h</td>
                <td>
                  <span class="badge bg-<?= $row['status_badge'] ?>-subtle text-<?= $row['status_badge'] ?>">
                    <?= htmlspecialchars($row['status']) ?>
                  </span>
                </td>
                <td class="text-center">
                  <?php if (($row['overtime'] ?? '--') !== '--' && ($row['overtime'] ?? '0h 0m') !== '0h 0m'): ?>
                    <span class="badge bg-primary-subtle text-primary fw-bold">
                      <i class="bi bi-plus-circle me-1"></i><?= htmlspecialchars($row['overtime']) ?>
                    </span>
                  <?php else: ?>
                    <span class="text-muted small">—</span>
                  <?php endif; ?>
                </td>
                <td class="text-center">
                  <?php if (!empty($row['shift_name']) && $row['shift_name'] !== '—'): ?>
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