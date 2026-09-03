<?php
/**
 * ZKTeco K40 Attendance System - Individual Employee Timesheet Report
 * With per-day detected shift for accurate overtime calculation
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

$users = [];
$attendance = [];

if ($isConnected) {
    $uRes = $connector->getUsers();
    if ($uRes['success'] ?? false) $users = $uRes['data'] ?? [];

    $aRes = $connector->getAttendance();
    if ($aRes['success'] ?? false) $attendance = $aRes['data'] ?? [];
}

$selectedEmp = $_GET['user_id'] ?? ($users[0]['user_id'] ?? '1001');
$fromDate = $_GET['from_date'] ?? date('Y-m-01');
$toDate = $_GET['to_date'] ?? date('Y-m-d');

// Use the consolidated report helper with per-day auto shift detection
$report = AttendanceHelper::getEmployeeConsolidated(
    $attendance, $users, strval($selectedEmp), $fromDate, $toDate
);
$reportRows = $report['rows'];
$empName = $report['name'];

// Calculate total work seconds for summary
$totalWorkSeconds = 0;
foreach ($reportRows as $row) {
    $totalWorkSeconds += ($row['hours'] ?? 0) * 3600;
}

// CSV Export
if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    AttendanceHelper::exportToCsv($reportRows, [
        'date'                => 'Date',
        'day'                 => 'Day',
        'first_in'            => 'First In',
        'last_out'            => 'Last Out',
        'hours'               => 'Hours Worked',
        'status'              => 'Status',
        'overtime'            => 'Overtime',
        'shift_name'          => 'Detected Shift',
        'detected_shift_id'   => 'Shift ID',
        'is_auto_detected'    => 'Auto Detected',
    ], "ZKTeco_Timesheet_{$empName}_{$fromDate}_to_{$toDate}.csv");
}

renderHeader('Employee Timesheet Report', 'report_employee');
?>

<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
  <div>
    <h3 class="fw-bold mb-1">Individual Timesheet Report</h3>
    <p class="text-muted mb-0 small">Comprehensive attendance tracking for a single employee</p>
  </div>
  <div class="d-flex align-items-center gap-2">
    <button onclick="window.print()" class="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 btn-print-hide">
      <i class="bi bi-printer"></i> Print Timesheet
    </button>
  </div>
</div>

<!-- Filter Bar -->
<div class="card border-0 shadow-sm rounded-3 mb-4 filter-section">
  <div class="card-body p-3">
    <form method="GET" action="" class="row g-3 align-items-end">
      <div class="col-12 col-sm-6 col-md-4">
        <label class="form-label small fw-semibold text-secondary">Select Employee</label>
        <select class="form-select form-select-sm" name="user_id">
          <?php foreach ($users as $u): ?>
            <?php $uid = strval($u['user_id'] ?? $u['uid']); ?>
            <option value="<?= htmlspecialchars($uid) ?>" <?= strval($selectedEmp) === $uid ? 'selected' : '' ?>>
              EMP-<?= htmlspecialchars($uid) ?> - <?= htmlspecialchars($u['name'] ?? '') ?>
            </option>
          <?php endforeach; ?>
        </select>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <label class="form-label small fw-semibold text-secondary">From Date</label>
        <input type="date" class="form-control form-control-sm" name="from_date" value="<?= htmlspecialchars($fromDate) ?>">
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <label class="form-label small fw-semibold text-secondary">To Date</label>
        <input type="date" class="form-control form-control-sm" name="to_date" value="<?= htmlspecialchars($toDate) ?>">
      </div>

      <div class="col-12 col-sm-6 col-md-2">
        <button type="submit" class="btn btn-primary btn-sm w-100 fw-semibold">
          <i class="bi bi-search me-1"></i> Generate
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Employee Header Card -->
<div class="card border-0 shadow-sm rounded-3 mb-4 bg-light-subtle">
  <div class="card-body p-4">
    <div class="row align-items-center g-3">
      <div class="col-12 col-md-6 d-flex align-items-center gap-3">
        <div class="bg-primary text-white rounded-circle p-3 text-center" style="width: 54px; height: 54px;">
          <i class="bi bi-person-badge fs-3"></i>
        </div>
        <div>
          <h4 class="fw-bold mb-0 text-dark"><?= htmlspecialchars($empName) ?></h4>
          <span class="text-muted small font-monospace">Employee ID: EMP-<?= htmlspecialchars($selectedEmp) ?></span>
        </div>
      </div>
      <div class="col-12 col-md-6 text-md-end">
        <div class="d-inline-flex gap-4">
          <div>
            <span class="text-muted extra-small text-uppercase fw-bold d-block">Days Present</span>
            <span class="fs-4 fw-bold text-success"><?= $report['total_present'] ?>/<?= $report['total_days'] ?> days</span>
          </div>
          <div>
            <span class="text-muted extra-small text-uppercase fw-bold d-block">Total Hours</span>
            <span class="fs-4 fw-bold text-primary"><?= $report['total_work_hours'] ?>h</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Shift Pattern Summary -->
<?php if (!empty($report['shift_types_used'])): ?>
<div class="card border-0 shadow-sm rounded-3 mb-4">
  <div class="card-body py-3 px-4">
    <div class="text-muted extra-small text-uppercase fw-bold mb-2">
      <i class="bi bi-clock-history me-1"></i>Shift Pattern Distribution (Per-Day Auto Detection)
    </div>
    <div class="d-flex flex-wrap gap-2">
      <?php foreach ($report['shift_types_used'] as $shiftId => $shiftName): ?>
        <span class="badge bg-info-subtle text-info border px-2 py-1 small">
          <?= htmlspecialchars($shiftName) ?>
        </span>
      <?php endforeach; ?>
    </div>
  </div>
</div>
<?php endif; ?>

<!-- Timesheet Table -->
<div class="card border-0 shadow-sm rounded-3">
  <div class="card-body p-0">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0 table-custom">
        <thead>
          <tr>
            <th class="ps-3">Date</th>
            <th>Day</th>
            <th>First In</th>
            <th>Last Out</th>
            <th>Working Duration</th>
            <th>Hours</th>
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
              <td colspan="9" class="text-center py-5 text-muted">
                No attendance punches found on the K40 terminal for this employee in the selected date range.
              </td>
            </tr>
          <?php else: ?>
            <?php foreach ($reportRows as $row):
                $isAuto = $row['is_auto_detected'] ?? false;
                $shiftBadgeClass = $isAuto ? 'bg-info-subtle text-info' : 'bg-primary-subtle text-primary';
                $autoLabel = $isAuto ? '<span class="badge bg-light text-dark border ms-1" style="font-size:8px;">Auto</span>' : '';
              ?>
              <tr class="<?= $row['status'] === 'Absent' ? 'table-danger bg-opacity-10' : '' ?>">
                <td class="ps-3 fw-bold font-monospace"><?= htmlspecialchars($row['date']) ?></td>
                <td class="text-muted"><?= htmlspecialchars($row['day']) ?></td>
                <td class="text-success fw-bold font-monospace"><?= htmlspecialchars($row['first_in']) ?></td>
                <td class="text-danger fw-bold font-monospace"><?= htmlspecialchars($row['last_out']) ?></td>
                <td class="fw-semibold text-dark"><?= htmlspecialchars($row['duration'] ?? '0h 0m') ?></td>
                <td><span class="badge bg-light text-dark border"><?= $row['hours'] ?? 0 ?>h</span></td>
                <td>
                  <span class="badge bg-<?= $row['status_badge'] ?? 'success' ?>-subtle text-<?= $row['status_badge'] ?? 'success' ?> fw-semibold">
                    <?= htmlspecialchars($row['status'] ?? 'Present') ?>
                  </span>
                </td>
                <td>
                  <?php if (($row['overtime'] ?? '--') !== '--'): ?>
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