<?php
/**
 * ZKTeco K40 Attendance System - Employee Consolidated Monthly Report
 * Single employee: Date | Day | Status | First In | Last Out | Hours | Overtime | Detected Shift
 * + Summary: Total Present, Absent, Late, Work Hours, Overtime Hours
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

$connector    = new ConnectorClient();
$shifts       = Config::get('shifts', []);
$deviceConfig = Config::get('device', []);
$isConnected  = ($deviceConfig['last_connection_status'] ?? '') === 'Connected';

$users      = [];
$attendance = [];

if ($isConnected) {
    $uRes = $connector->getUsers();
    if ($uRes['success'] ?? false) $users = $uRes['data'] ?? [];

    $aRes = $connector->getAttendance();
    if ($aRes['success'] ?? false) $attendance = $aRes['data'] ?? [];
}

$selectedEmp   = $_GET['user_id']   ?? ($users[0]['user_id'] ?? '');
$fromDate      = $_GET['from_date'] ?? date('Y-m-01');
$toDate        = $_GET['to_date']   ?? date('Y-m-t');

// Use consolidated report helper with per-day auto shift detection (no fixed shift needed)
$report = AttendanceHelper::getEmployeeConsolidated(
    $attendance, $users, strval($selectedEmp), $fromDate, $toDate
);

// CSV Export
if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    AttendanceHelper::exportToCsv($report['rows'], [
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
    ], "ZKTeco_Consolidated_{$report['name']}_{$fromDate}_to_{$toDate}.csv");
}

renderHeader('Consolidated Employee Report', 'report_consolidated');
?>

<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
  <div>
    <h3 class="fw-bold mb-1">Consolidated Employee Report</h3>
    <p class="text-muted mb-0 small">Complete daily attendance breakdown with monthly totals for a single employee</p>
  </div>
  <div class="d-flex align-items-center gap-2">
    <a href="?user_id=<?= urlencode($selectedEmp) ?>&from_date=<?= urlencode($fromDate) ?>&to_date=<?= urlencode($toDate) ?>&export=csv"
       class="btn btn-outline-success btn-sm d-flex align-items-center gap-1">
      <i class="bi bi-filetype-csv"></i> Export CSV
    </a>
    <button onclick="window.print()" class="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 btn-print-hide">
      <i class="bi bi-printer"></i> Print Report
    </button>
  </div>
</div>

<!-- Filter Bar -->
<div class="card border-0 shadow-sm rounded-3 mb-4 filter-section">
  <div class="card-body p-3">
    <form method="GET" action="" class="row g-3 align-items-end">
      <div class="col-12 col-sm-6 col-md-3">
        <label class="form-label small fw-semibold text-secondary">Select Employee</label>
        <select class="form-select form-select-sm" name="user_id">
          <?php foreach ($users as $u): ?>
            <?php $uid = strval($u['user_id'] ?? $u['uid']); ?>
            <option value="<?= htmlspecialchars($uid) ?>" <?= strval($selectedEmp) === $uid ? 'selected' : '' ?>>
              EMP-<?= htmlspecialchars($uid) ?> – <?= htmlspecialchars($u['name'] ?? '') ?>
            </option>
          <?php endforeach; ?>
        </select>
      </div>
      <div class="col-12 col-sm-6 col-md-2">
        <label class="form-label small fw-semibold text-secondary">From Date</label>
        <input type="date" class="form-control form-control-sm" name="from_date" value="<?= htmlspecialchars($fromDate) ?>">
      </div>
      <div class="col-12 col-sm-6 col-md-2">
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

<!-- Employee Identity Card -->
<div class="card border-0 shadow-sm rounded-3 mb-4" style="background: linear-gradient(135deg, #f0f4ff 0%, #fff 100%);">
  <div class="card-body p-4">
    <div class="row align-items-center g-3">
      <div class="col-12 col-md-5 d-flex align-items-center gap-3">
        <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
             style="width: 58px; height: 58px; flex-shrink: 0;">
          <i class="bi bi-person-badge fs-2"></i>
        </div>
        <div>
          <h4 class="fw-bold mb-0 text-dark"><?= htmlspecialchars($report['name']) ?></h4>
          <span class="text-muted small font-monospace">EMP-<?= htmlspecialchars($report['uid']) ?></span>
          <span class="d-block text-muted small mt-1">
            <i class="bi bi-calendar3 me-1"></i>
            <?= date('d M Y', strtotime($fromDate)) ?> – <?= date('d M Y', strtotime($toDate)) ?>
            <span class="text-muted small ms-2">|</span>
            <span class="ms-2"><?= $report['total_days'] ?> days</span>
          </span>
        </div>
      </div>
      <div class="col-12 col-md-7">
        <div class="row g-3 text-center">
          <div class="col-4">
            <span class="text-muted extra-small text-uppercase fw-bold d-block">Work Hours</span>
            <span class="fs-4 fw-bold text-dark"><?= $report['total_work_hours'] ?><small class="fs-6">h</small></span>
          </div>
          <div class="col-4">
            <span class="text-muted extra-small text-uppercase fw-bold d-block">Overtime</span>
            <span class="fs-4 fw-bold text-primary"><?= htmlspecialchars($report['total_ot_str']) ?></span>
          </div>
          <div class="col-4">
            <span class="text-muted extra-small text-uppercase fw-bold d-block">Attendance</span>
            <span class="fs-4 fw-bold text-success"><?= $report['total_present'] ?>/<?= $report['total_days'] ?></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Summary Stat Cards -->
<div class="row g-3 mb-4">
  <div class="col-6 col-md-3">
    <div class="p-3 rounded-3 shadow-sm text-center border-start border-4 border-success bg-white">
      <i class="bi bi-check-circle-fill text-success fs-4 mb-1"></i>
      <div class="text-muted extra-small text-uppercase fw-bold">Days Present</div>
      <div class="fs-2 fw-bold text-success"><?= $report['total_present'] ?></div>
      <div class="text-muted small">out of <?= $report['total_days'] ?></div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="p-3 rounded-3 shadow-sm text-center border-start border-4 border-danger bg-white">
      <i class="bi bi-x-circle-fill text-danger fs-4 mb-1"></i>
      <div class="text-muted extra-small text-uppercase fw-bold">Days Absent</div>
      <div class="fs-2 fw-bold text-danger"><?= $report['total_absent'] ?></div>
      <div class="text-muted small">
        <?= $report['total_days'] > 0 ? round(($report['total_absent'] / $report['total_days']) * 100, 1) : 0 ?>% absent rate
      </div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="p-3 rounded-3 shadow-sm text-center border-start border-4 border-warning bg-white">
      <i class="bi bi-alarm-fill text-warning fs-4 mb-1"></i>
      <div class="text-muted extra-small text-uppercase fw-bold">Late Arrivals</div>
      <div class="fs-2 fw-bold text-warning"><?= $report['total_late'] ?></div>
      <div class="text-muted small">of <?= $report['total_present'] ?> present days</div>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="p-3 rounded-3 shadow-sm text-center border-start border-4 border-primary bg-white">
      <i class="bi bi-hourglass-split text-primary fs-4 mb-1"></i>
      <div class="text-muted extra-small text-uppercase fw-bold">Total Overtime</div>
      <div class="fs-2 fw-bold text-primary"><?= $report['total_ot_hours'] ?><small class="fs-6">h</small></div>
      <div class="text-muted small"><?= htmlspecialchars($report['total_ot_str']) ?> this period</div>
    </div>
  </div>
</div>

<!-- Attendance % Progress -->
<?php
$attPct   = $report['total_days'] > 0 ? round(($report['total_present'] / $report['total_days']) * 100, 1) : 0;
$pctClass = $attPct >= 90 ? 'success' : ($attPct >= 75 ? 'warning' : 'danger');
?>
<div class="card border-0 shadow-sm rounded-3 mb-4">
  <div class="card-body py-3 px-4">
    <div class="d-flex justify-content-between align-items-center mb-1">
      <span class="fw-semibold small text-dark">Attendance Rate</span>
      <span class="fw-bold text-<?= $pctClass ?>"><?= $attPct ?>%</span>
    </div>
    <div class="progress" style="height: 10px; border-radius: 8px;">
      <div class="progress-bar bg-<?= $pctClass ?> rounded-pill" style="width: <?= $attPct ?>%"></div>
    </div>
    <div class="d-flex justify-content-between mt-1">
      <span class="text-muted small"><?= $report['total_present'] ?> present</span>
      <span class="text-muted small"><?= $report['total_absent'] ?> absent</span>
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

<!-- Daily Breakdown Table -->
<div class="card border-0 shadow-sm rounded-3">
  <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
    <h6 class="fw-bold mb-0 text-dark">
      <i class="bi bi-calendar3 me-2 text-primary"></i>Daily Attendance Breakdown
    </h6>
    <span class="badge bg-light text-secondary border"><?= count($report['rows']) ?> Days</span>
  </div>
  <div class="card-body p-0">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0 table-custom">
        <thead>
          <tr>
            <th class="ps-3">Date</th>
            <th>Day</th>
            <th class="text-success">First In</th>
            <th class="text-danger">Last Out</th>
            <th>Work Hours</th>
            <th>Status</th>
            <th class="text-primary">Overtime</th>
            <th class="text-center" style="width:200px">
              <i class="bi bi-clock-history text-info me-1"></i>Detected Shift
            </th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($report['rows'])): ?>
            <tr>
              <td colspan="8" class="text-center py-5 text-muted">
                No attendance data found for this employee and date range.
              </td>
            </tr>
          <?php else: ?>
            <?php foreach ($report['rows'] as $row):
                $isAuto = $row['is_auto_detected'] ?? false;
                $shiftBadgeClass = $isAuto ? 'bg-info-subtle text-info' : 'bg-primary-subtle text-primary';
                $autoLabel = $isAuto ? '<span class="badge bg-light text-dark border ms-1" style="font-size:8px;">Auto</span>' : '';
              ?>
              <tr class="<?= $row['status'] === 'Absent' ? 'table-danger bg-opacity-10' : '' ?>">
                <td class="ps-3 fw-bold font-monospace text-dark"><?= htmlspecialchars($row['date']) ?></td>
                <td class="text-muted"><?= htmlspecialchars($row['day']) ?></td>
                <td class="fw-bold font-monospace text-success"><?= htmlspecialchars($row['first_in']) ?></td>
                <td class="fw-bold font-monospace text-danger"><?= htmlspecialchars($row['last_out']) ?></td>
                <td class="fw-semibold">
                  <?php if ($row['hours'] > 0): ?>
                    <span class="text-dark"><?= $row['hours'] ?>h</span>
                  <?php else: ?>
                    <span class="text-muted">—</span>
                  <?php endif; ?>
                </td>
                <td>
                  <span class="badge bg-<?= $row['status_badge'] ?>-subtle text-<?= $row['status_badge'] ?> fw-semibold">
                    <?= htmlspecialchars($row['status']) ?>
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
        <!-- Footer Summary Row -->
        <?php if (!empty($report['rows'])): ?>
        <tfoot class="table-light fw-bold border-top">
          <tr>
            <td class="ps-3 text-muted" colspan="2">Monthly Totals</td>
            <td colspan="2" class="text-muted small">—</td>
            <td class="text-dark fw-bold"><?= $report['total_work_hours'] ?>h total</td>
            <td>
              <span class="badge bg-success-subtle text-success"><?= $report['total_present'] ?> P</span>
              <span class="badge bg-danger-subtle text-danger ms-1"><?= $report['total_absent'] ?> A</span>
              <span class="badge bg-warning-subtle text-warning ms-1"><?= $report['total_late'] ?> L</span>
            </td>
            <td class="text-primary fw-bold"><?= htmlspecialchars($report['total_ot_str']) ?></td>
            <td class="text-center">—</td>
          </tr>
        </tfoot>
        <?php endif; ?>
      </table>
    </div>
  </div>
</div>

<!-- Back Button -->
<div class="mt-3 btn-print-hide">
  <a href="monthly_summary.php?from_date=<?= urlencode($fromDate) ?>&to_date=<?= urlencode($toDate) ?>"
     class="btn btn-outline-secondary btn-sm">
    <i class="bi bi-arrow-left me-1"></i> Back to Monthly Summary
  </a>
</div>

<?php renderFooter(); ?>