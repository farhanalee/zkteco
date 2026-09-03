<?php
/**
 * ZKTeco K40 Attendance System - Monthly Attendance Summary Report
 * All employees: Date Range | Employee Name | Present | Absent | Late | Overtime | Primary Shift Used
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

$connector   = new ConnectorClient();
$shifts      = Config::get('shifts', []);
$deviceConfig = Config::get('device', []);
$isConnected = ($deviceConfig['last_connection_status'] ?? '') === 'Connected';

$fromDate      = $_GET['from_date']  ?? date('Y-m-01');
$toDate        = $_GET['to_date']    ?? date('Y-m-t');

$users      = [];
$attendance = [];

if ($isConnected) {
    $uRes = $connector->getUsers();
    if ($uRes['success'] ?? false) $users = $uRes['data'] ?? [];

    $aRes = $connector->getAttendance();
    if ($aRes['success'] ?? false) $attendance = $aRes['data'] ?? [];
}

// Monthly summary now uses per-day auto shift detection internally
$reportRows = AttendanceHelper::getMonthlyEmployeeSummary($attendance, $users, $fromDate, $toDate);

// Summary totals
$grandPresent = array_sum(array_column($reportRows, 'present'));
$grandAbsent  = array_sum(array_column($reportRows, 'absent'));
$grandLate    = array_sum(array_column($reportRows, 'late'));
$grandOTHrs   = array_sum(array_column($reportRows, 'overtime_hrs'));

// CSV Export
if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    AttendanceHelper::exportToCsv($reportRows, [
        'user_id'      => 'Employee ID',
        'name'         => 'Employee Name',
        'total_days'   => 'Working Days',
        'present'      => 'Days Present',
        'absent'       => 'Days Absent',
        'late'         => 'Late Arrivals',
        'overtime_hrs' => 'Overtime (Hours)',
        'shift_name'   => 'Primary Shift Used',
    ], "ZKTeco_Monthly_Summary_{$fromDate}_to_{$toDate}.csv");
}

renderHeader('Monthly Attendance Summary', 'report_monthly_summary');
?>

<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
  <div>
    <h3 class="fw-bold mb-1">Monthly Attendance Summary</h3>
    <p class="text-muted mb-0 small">All employees — Present, Absent, Late & Overtime totals for the selected period (per-day auto shift detection)</p>
  </div>
  <div class="d-flex align-items-center gap-2">
    <a href="?from_date=<?= urlencode($fromDate) ?>&to_date=<?= urlencode($toDate) ?>&export=csv"
       class="btn btn-outline-success btn-sm d-flex align-items-center gap-1">
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
          <i class="bi bi-bar-chart-line me-1"></i> Generate
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Grand Totals Cards -->
<div class="row g-3 mb-4">
  <div class="col-6 col-md-3">
    <div class="p-3 bg-white border rounded-3 shadow-sm text-center">
      <span class="text-muted extra-small text-uppercase fw-bold">Employees</span>
      <h3 class="fw-bold text-dark mb-0"><?= count($reportRows) ?></h3>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="p-3 bg-white border rounded-3 shadow-sm text-center">
      <span class="text-muted extra-small text-uppercase fw-bold">Total Present Days</span>
      <h3 class="fw-bold text-success mb-0"><?= $grandPresent ?></h3>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="p-3 bg-white border rounded-3 shadow-sm text-center">
      <span class="text-muted extra-small text-uppercase fw-bold">Total Absent Days</span>
      <h3 class="fw-bold text-danger mb-0"><?= $grandAbsent ?></h3>
    </div>
  </div>
  <div class="col-6 col-md-3">
    <div class="p-3 bg-white border rounded-3 shadow-sm text-center">
      <span class="text-muted extra-small text-uppercase fw-bold">Total Overtime</span>
      <h3 class="fw-bold text-primary mb-0"><?= $grandOTHrs ?>h</h3>
    </div>
  </div>
</div>

<!-- Period label -->
<div class="mb-3">
  <span class="badge bg-light text-dark border fs-6 fw-semibold px-3 py-2">
    <i class="bi bi-calendar-range me-1 text-primary"></i>
    Period: <?= date('d M Y', strtotime($fromDate)) ?> &nbsp;→&nbsp; <?= date('d M Y', strtotime($toDate)) ?>
    &nbsp;|&nbsp; <?= count(array_filter(iterator_to_array((function() use ($fromDate, $toDate) {
        $d = new DateTime($fromDate); $e = new DateTime($toDate);
        while($d<=$e){yield $d->format('Y-m-d');$d->modify('+1 day');}
    })()), fn($d)=>true)) ?> Days
  </span>
</div>

<!-- Main Table -->
<div class="card border-0 shadow-sm rounded-3">
  <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
    <h6 class="fw-bold mb-0 text-dark">
      <i class="bi bi-table me-2 text-primary"></i>Employee Attendance Overview
    </h6>
    <span class="badge bg-light text-secondary border"><?= count($reportRows) ?> Employees</span>
  </div>
  <div class="card-body p-0">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0 table-custom" id="summaryTable">
        <thead>
          <tr>
            <th class="ps-3">Employee ID</th>
            <th>Employee Name</th>
            <th class="text-center">Working Days</th>
            <th class="text-center text-success">Present</th>
            <th class="text-center text-danger">Absent</th>
            <th class="text-center text-warning">Late</th>
            <th class="text-center text-primary">Overtime</th>
            <th class="text-center">Primary Shift Used</th>
            <th class="text-center">Attendance %</th>
            <th class="text-center btn-print-hide">Action</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($reportRows)): ?>
            <tr>
              <td colspan="10" class="text-center py-5 text-muted">
                <i class="bi bi-people fs-1 d-block mb-2 text-secondary"></i>
                <h6 class="fw-semibold">No Data Available</h6>
                <p class="small mb-0">Make sure the K40 device is connected and employees are enrolled.</p>
              </td>
            </tr>
          <?php else: ?>
            <?php foreach ($reportRows as $row):
              $attPct = $row['total_days'] > 0 ? round(($row['present'] / $row['total_days']) * 100, 1) : 0;
              $pctClass = $attPct >= 90 ? 'success' : ($attPct >= 75 ? 'warning' : 'danger');
            ?>
              <tr>
                <td class="ps-3 fw-bold font-monospace text-dark">EMP-<?= htmlspecialchars($row['user_id']) ?></td>
                <td class="fw-semibold text-primary"><?= htmlspecialchars($row['name']) ?></td>
                <td class="text-center"><span class="badge bg-light text-dark border"><?= $row['total_days'] ?></span></td>
                <td class="text-center">
                  <span class="badge bg-success-subtle text-success fw-bold fs-6 px-2"><?= $row['present'] ?></span>
                </td>
                <td class="text-center">
                  <?php if ($row['absent'] > 0): ?>
                    <span class="badge bg-danger-subtle text-danger fw-bold fs-6 px-2"><?= $row['absent'] ?></span>
                  <?php else: ?>
                    <span class="badge bg-light text-muted">0</span>
                  <?php endif; ?>
                </td>
                <td class="text-center">
                  <?php if ($row['late'] > 0): ?>
                    <span class="badge bg-warning-subtle text-warning fw-bold fs-6 px-2"><?= $row['late'] ?></span>
                  <?php else: ?>
                    <span class="badge bg-light text-muted">0</span>
                  <?php endif; ?>
                </td>
                <td class="text-center">
                  <?php if ($row['overtime_sec'] > 0): ?>
                    <span class="badge bg-primary-subtle text-primary fw-bold"><?= htmlspecialchars($row['overtime']) ?></span>
                  <?php else: ?>
                    <span class="text-muted small">—</span>
                  <?php endif; ?>
                </td>
                <td class="text-center">
                  <span class="badge bg-info-subtle text-info small"><?= htmlspecialchars($row['shift_name']) ?></span>
                </td>
                <td class="text-center">
                  <div class="d-flex align-items-center justify-content-center gap-2">
                    <div class="progress" style="width: 60px; height: 6px;" title="<?= $attPct ?>%">
                      <div class="progress-bar bg-<?= $pctClass ?>" style="width: <?= $attPct ?>%"></div>
                    </div>
                    <span class="small fw-bold text-<?= $pctClass ?>"><?= $attPct ?>%</span>
                  </div>
                </td>
                <td class="text-center btn-print-hide">
                  <a href="consolidated.php?user_id=<?= urlencode($row['user_id']) ?>&from_date=<?= urlencode($fromDate) ?>&to_date=<?= urlencode($toDate) ?>"
                     class="btn btn-outline-primary btn-sm" title="View Consolidated Report">
                    <i class="bi bi-person-lines-fill me-1"></i> Detail
                  </a>
                </td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
        <?php if (!empty($reportRows)): ?>
        <tfoot class="table-light fw-bold">
          <tr>
            <td class="ps-3" colspan="2">Grand Total</td>
            <td class="text-center">—</td>
            <td class="text-center text-success"><?= $grandPresent ?></td>
            <td class="text-center text-danger"><?= $grandAbsent ?></td>
            <td class="text-center text-warning"><?= $grandLate ?></td>
            <td class="text-center text-primary"><?= $grandOTHrs ?>h</td>
            <td class="text-center">—</td>
            <td class="text-center" colspan="2">—</td>
          </tr>
        </tfoot>
        <?php endif; ?>
      </table>
    </div>
  </div>
</div>

<?php renderFooter(); ?>