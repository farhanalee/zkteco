<?php
/**
 * ZKTeco K40 Attendance System - Date-wise All Employees Attendance Report
 * All employees: Date | Day | Employee | Check In | Check Out | Total Hours | Status | Overtime | Detected Shift
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

// Inputs
$selectedMonth = $_GET['month'] ?? date('Y-m');
$fromDate = $selectedMonth . '-01';
$toDate   = date('Y-m-t', strtotime($fromDate));

// Build report using new datewise helper with per-day auto shift detection
$reportRows = AttendanceHelper::getDatewiseReport(
    $attendance, $users, $fromDate, $toDate
);

// Compute summary statistics
$totalDays = 0;
$totalPresent = 0;
$totalAbsent = 0;
$totalLate = 0;
$totalWorkHours = 0;
$totalOtHours = 0;
$totalOtStr = '0h 0m';
$shiftCounts = [];

// Count unique dates
$uniqueDates = [];
foreach ($reportRows as $row) {
    $uniqueDates[$row['date']] = true;
}
$totalDays = count($uniqueDates);

foreach ($reportRows as $row) {
    if ($row['status'] === 'Absent') {
        $totalAbsent++;
    } else {
        $totalPresent++;
        $totalWorkHours += $row['hours'] ?? 0;
        if (($row['overtime'] ?? '0h 0m') !== '0h 0m') {
            $totalOtHours += $row['overtime_hours'] ?? 0;
            $otParts = explode('h', $row['overtime']);
            $otH = (int)$otParts[0];
            $otM = isset($otParts[1]) ? (int)str_replace('m', '', $otParts[1]) : 0;
            // Accumulate OT minutes
            $totalOtMinutes = ($totalOtHours * 60) + ($otH * 60) + $otM;
        }
        if (str_contains($row['status'] ?? '', 'Late')) {
            $totalLate++;
        }
    }

    // Track shift types used
    if (!empty($row['detected_shift_name']) && $row['detected_shift_name'] !== '—') {
        $shiftName = $row['detected_shift_name'];
        $shiftCounts[$shiftName] = ($shiftCounts[$shiftName] ?? 0) + 1;
    }
}

$totalOtH = floor($totalOtHours);
$totalOtM = round(($totalOtHours - $totalOtH) * 60);
$totalOtStr = "{$totalOtH}h {$totalOtM}m";

// CSV Export
if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    $csvData = [];
    foreach ($reportRows as $row) {
        $csvData[] = [
            'date'                => $row['date'],
            'day'                 => $row['day'],
            'user_id'             => $row['user_id'],
            'name'                => $row['name'],
            'first_in'            => $row['first_in'],
            'last_out'            => $row['last_out'],
            'duration'            => $row['duration'] ?? '0h 0m',
            'hours'               => $row['hours'] ?? 0,
            'status'              => $row['status'],
            'overtime'            => $row['overtime'] ?? '0h 0m',
            'shift_name'          => $row['shift_name'] ?? '—',
            'detected_shift_id'   => $row['detected_shift_id'] ?? '',
            'is_auto_detected'    => ($row['is_auto_detected'] ?? false) ? 'Yes' : 'No',
        ];
    }
    AttendanceHelper::exportToCsv($csvData, [
        'date'                => 'Date',
        'day'                 => 'Day',
        'user_id'             => 'Employee ID',
        'name'                => 'Employee Name',
        'first_in'            => 'Check In',
        'last_out'            => 'Check Out',
        'duration'            => 'Total Hours',
        'hours'               => 'Total Hours (Decimal)',
        'status'              => 'Status',
        'overtime'            => 'Overtime',
        'shift_name'          => 'Detected Shift',
        'detected_shift_id'   => 'Shift ID',
        'is_auto_detected'    => 'Auto Detected',
    ], "Datewise_AllEmployees_{$selectedMonth}.csv");
}

renderHeader('Date-wise All Employees Attendance', 'report_datewise');
?>

<!-- Print-only Header -->
<div class="d-none d-print-block text-center mb-3 border-bottom pb-2">
  <h4 class="fw-bold mb-0">Date-wise All Employees Attendance Report</h4>
  <p class="mb-0 small">
    Month: <strong><?= date('F Y', strtotime($fromDate)) ?></strong> &nbsp;|&nbsp;
    Employees: <strong><?= count($users) ?></strong> &nbsp;|&nbsp;
    Days: <strong><?= $totalDays ?></strong>
  </p>
</div>

<!-- Page Header -->
<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 btn-print-hide">
  <div>
    <h3 class="fw-bold mb-1"><i class="bi bi-calendar2-week text-primary me-2"></i>Date-wise Attendance — All Employees</h3>
    <p class="text-muted mb-0 small">Poora month — har employee ka Check In, Check Out, Total Hours, Status, Overtime aur Detected Shift ek jagah</p>
  </div>
  <div class="d-flex gap-2 flex-wrap">
    <a href="?month=<?= urlencode($selectedMonth) ?>&export=csv"
       class="btn btn-outline-success btn-sm">
      <i class="bi bi-filetype-csv me-1"></i>Export CSV
    </a>
    <button onclick="window.print()" class="btn btn-outline-secondary btn-sm">
      <i class="bi bi-printer me-1"></i>Print
    </button>
  </div>
</div>

<!-- ─── Filter Bar ─────────────────────────────────────────── -->
<div class="card border-0 shadow-sm rounded-3 mb-4 btn-print-hide">
  <div class="card-body p-3">
    <form method="GET" class="row g-3 align-items-end">
      <!-- Month -->
      <div class="col-12 col-sm-6 col-lg-4">
        <label class="form-label small fw-semibold text-secondary mb-1">
          <i class="bi bi-calendar3 me-1"></i>Month
        </label>
        <input type="month" class="form-control form-control-sm" name="month"
               value="<?= htmlspecialchars($selectedMonth) ?>">
      </div>
      <div class="col-12 col-sm-6 col-lg-2">
        <button type="submit" class="btn btn-primary btn-sm w-100 fw-semibold">
          <i class="bi bi-search me-1"></i>Generate
        </button>
      </div>
    </form>
  </div>
</div>

<!-- ─── Month Summary Stats ──────────────────────────────── -->
<div class="card border-0 shadow-sm rounded-3 mb-4" style="background:linear-gradient(135deg,#f5f7ff,#fff);">
  <div class="card-body p-4">
    <div class="row g-3 text-center">
      <div class="col-4 col-md">
        <div class="p-2 rounded-3 bg-success-subtle">
          <div class="fs-2 fw-bold text-success"><?= $totalPresent ?></div>
          <div class="extra-small text-uppercase text-success fw-bold">Present</div>
          <div class="text-muted" style="font-size:10px;">days</div>
        </div>
      </div>
      <div class="col-4 col-md">
        <div class="p-2 rounded-3 bg-danger-subtle">
          <div class="fs-2 fw-bold text-danger"><?= $totalAbsent ?></div>
          <div class="extra-small text-uppercase text-danger fw-bold">Absent</div>
          <div class="text-muted" style="font-size:10px;">days</div>
        </div>
      </div>
      <div class="col-4 col-md">
        <div class="p-2 rounded-3 bg-warning-subtle">
          <div class="fs-2 fw-bold text-warning"><?= $totalLate ?></div>
          <div class="extra-small text-uppercase text-warning fw-bold">Late</div>
          <div class="text-muted" style="font-size:10px;">days</div>
        </div>
      </div>
      <div class="col-4 col-md">
        <div class="p-2 rounded-3 bg-info-subtle">
          <div class="fs-2 fw-bold text-info"><?= number_format($totalWorkHours, 1) ?><small class="fs-6">h</small></div>
          <div class="extra-small text-uppercase text-info fw-bold">Total Hours</div>
          <div class="text-muted" style="font-size:10px;">&nbsp;</div>
        </div>
      </div>
      <div class="col-4 col-md">
        <div class="p-2 rounded-3 bg-primary-subtle">
          <div class="fs-2 fw-bold text-primary"><?= $totalOtHours ?><small class="fs-6">h</small></div>
          <div class="extra-small text-uppercase text-primary fw-bold">Overtime</div>
          <div class="text-muted" style="font-size:10px;"><?= htmlspecialchars($totalOtStr) ?></div>
        </div>
      </div>
      <div class="col-4 col-md">
        <div class="p-2 rounded-3 bg-purple-subtle">
          <div class="fs-2 fw-bold text-purple"><?= $totalDays ?></div>
          <div class="extra-small text-uppercase text-purple fw-bold">Days in Month</div>
          <div class="text-muted" style="font-size:10px;">&nbsp;</div>
        </div>
      </div>
    </div>

    <!-- Shift Pattern Summary -->
    <?php if (!empty($shiftCounts)): ?>
    <div class="mt-3 pt-3 border-top">
      <div class="text-muted extra-small text-uppercase fw-bold mb-2">Shift Pattern Distribution</div>
      <div class="d-flex flex-wrap gap-2">
        <?php foreach ($shiftCounts as $shiftName => $count): ?>
          <span class="badge bg-info-subtle text-info border px-2 py-1 small">
            <?= htmlspecialchars($shiftName) ?>: <strong><?= $count ?></strong> days
          </span>
        <?php endforeach; ?>
      </div>
    </div>
    <?php endif; ?>
  </div>
</div>

<!-- ─── Main Date-wise Table ──────────────────────────────── -->
<div class="card border-0 shadow-sm rounded-3">
  <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
    <h6 class="fw-bold mb-0 text-dark">
      <i class="bi bi-table me-2 text-primary"></i>
      Daily Attendance — All Employees
      <span class="fw-normal text-muted small ms-2"><?= date('F Y', strtotime($fromDate)) ?></span>
    </h6>
    <span class="badge bg-light text-secondary border btn-print-hide"><?= count($reportRows) ?> Records</span>
  </div>

  <div class="card-body p-0">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0" id="datewiseTable">
        <thead class="table-light">
          <tr>
            <th class="ps-3" style="width:110px">Date</th>
            <th style="width:70px">Day</th>
            <th style="width:180px">Employee</th>
            <th class="text-center" style="width:100px">
              <i class="bi bi-box-arrow-in-right text-success me-1"></i>Check In
            </th>
            <th class="text-center" style="width:100px">
              <i class="bi bi-box-arrow-right text-danger me-1"></i>Check Out
            </th>
            <th class="text-center" style="width:100px">
              <i class="bi bi-hourglass-split text-info me-1"></i>Total Hours
            </th>
            <th class="text-center" style="width:130px">Status</th>
            <th class="text-center">
              <i class="bi bi-plus-circle text-primary me-1"></i>Overtime
            </th>
            <th class="text-center" style="width:200px">
              <i class="bi bi-clock-history text-info me-1"></i>Detected Shift
            </th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($reportRows)): ?>
          <tr>
            <td colspan="9" class="text-center py-5 text-muted">
              <i class="bi bi-calendar-x fs-1 d-block mb-2 opacity-30"></i>
              <span class="fw-semibold d-block">No attendance records found</span>
              <span class="small">Device connect karo ya month change karo</span>
            </td>
          </tr>
          <?php else: ?>
          <?php foreach ($reportRows as $row):
            $isAbsent  = $row['status'] === 'Absent';
            $isLate    = str_contains($row['status'] ?? '', 'Late');
            $isWeekend = in_array(date('N', strtotime($row['date'])), [6, 7]); // Sat=6, Sun=7
            $rowClass  = $isAbsent ? 'table-danger bg-opacity-25'
                        : ($isWeekend ? 'table-secondary bg-opacity-10'
                        : ($isLate   ? 'table-warning bg-opacity-10' : ''));
            $isAuto = $row['is_auto_detected'] ?? false;
            $shiftBadgeClass = $isAuto ? 'bg-info-subtle text-info' : 'bg-primary-subtle text-primary';
            $autoLabel = $isAuto ? '<span class="badge bg-light text-dark border ms-1" style="font-size:8px;">Auto</span>' : '';
          ?>
          <tr class="<?= $rowClass ?>">

            <!-- Date -->
            <td class="ps-3">
              <span class="fw-bold text-dark font-monospace small"><?= htmlspecialchars($row['date']) ?></span>
              <?php if ($isWeekend): ?>
                <span class="badge bg-secondary-subtle text-secondary ms-1" style="font-size:9px;">OFF</span>
              <?php endif; ?>
            </td>

            <!-- Day -->
            <td>
              <span class="fw-semibold text-<?= $isWeekend ? 'secondary' : 'dark' ?>">
                <?= htmlspecialchars($row['day']) ?>
              </span>
            </td>

            <!-- Employee -->
            <td>
              <span class="fw-semibold text-dark">EMP-<?= htmlspecialchars($row['user_id']) ?></span>
              <div class="text-muted small"><?= htmlspecialchars($row['name']) ?></div>
            </td>

            <!-- Check In -->
            <td class="text-center">
              <?php if ($row['first_in'] !== '--:--'): ?>
                <span class="badge bg-success-subtle text-success fw-bold px-2 py-1 font-monospace">
                  <i class="bi bi-arrow-right-circle me-1"></i><?= htmlspecialchars($row['first_in']) ?>
                </span>
              <?php else: ?>
                <span class="text-muted">—</span>
              <?php endif; ?>
            </td>

            <!-- Check Out -->
            <td class="text-center">
              <?php if ($row['last_out'] !== '--:--' && $row['last_out'] !== $row['first_in']): ?>
                <span class="badge bg-danger-subtle text-danger fw-bold px-2 py-1 font-monospace">
                  <i class="bi bi-arrow-left-circle me-1"></i><?= htmlspecialchars($row['last_out']) ?>
                </span>
              <?php elseif ($row['first_in'] !== '--:--'): ?>
                <span class="text-warning small fw-semibold" title="Only one punch recorded">
                  <i class="bi bi-exclamation-triangle me-1"></i>Missing
                </span>
              <?php else: ?>
                <span class="text-muted">—</span>
              <?php endif; ?>
            </td>

            <!-- Total Hours -->
            <td class="text-center">
              <?php if (($row['hours'] ?? 0) > 0): ?>
                <?php
                  $hClass = ($row['hours'] ?? 0) >= 8 ? 'success'
                          : (($row['hours'] ?? 0) >= 5 ? 'warning' : 'danger');
                ?>
                <span class="fw-bold text-<?= $hClass ?>">
                  <?= number_format($row['hours'], 1) ?><small class="fw-normal text-muted">h</small>
                </span>
              <?php else: ?>
                <span class="text-muted">—</span>
              <?php endif; ?>
            </td>

            <!-- Status -->
            <td class="text-center">
              <?php
                $badge = match(true) {
                  $isAbsent        => ['bg-danger',   'bi-x-circle-fill',       'Absent'],
                  $isLate          => ['bg-warning',  'bi-alarm-fill',           $row['status']],
                  default          => ['bg-success',  'bi-check-circle-fill',    'Present'],
                };
              ?>
              <span class="badge <?= $badge[0] ?> fw-semibold px-2 py-1">
                <i class="bi <?= $badge[1] ?> me-1"></i><?= htmlspecialchars($badge[2]) ?>
              </span>
            </td>

            <!-- Overtime -->
            <td class="text-center">
              <?php if (($row['overtime'] ?? '--') !== '--' && ($row['overtime'] ?? '0h 0m') !== '0h 0m'): ?>
                <span class="badge bg-primary-subtle text-primary fw-bold px-2 py-1">
                  <i class="bi bi-plus-lg me-1"></i><?= htmlspecialchars($row['overtime']) ?>
                </span>
              <?php elseif (!$isAbsent): ?>
                <span class="text-muted small">No OT</span>
              <?php else: ?>
                <span class="text-muted">—</span>
              <?php endif; ?>
            </td>

            <!-- Detected Shift -->
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

        <!-- Footer Totals Row -->
        <?php if (!empty($reportRows)): ?>
        <tfoot>
          <tr class="fw-bold border-top-2 bg-light">
            <td class="ps-3 text-muted" colspan="3">
              <span class="text-dark">Monthly Totals</span>
            </td>
            <td class="text-center text-muted small">—</td>
            <td class="text-center text-muted small">—</td>
            <td class="text-center text-info fw-bold">
              <?= number_format($totalWorkHours, 1) ?>h
            </td>
            <td class="text-center">
              <span class="badge bg-success me-1"><?= $totalPresent ?> P</span>
              <span class="badge bg-danger me-1"><?= $totalAbsent ?> A</span>
              <span class="badge bg-warning"><?= $totalLate ?> L</span>
            </td>
            <td class="text-center text-primary fw-bold">
              <?= htmlspecialchars($totalOtStr) ?>
              <span class="text-muted fw-normal small">(<?= $totalOtHours ?>h)</span>
            </td>
            <td class="text-center">—</td>
          </tr>
        </tfoot>
        <?php endif; ?>
      </table>
    </div>
  </div>
</div>

<!-- Legend -->
<div class="d-flex flex-wrap gap-3 mt-3 btn-print-hide">
  <span class="small text-muted fw-semibold">Legend:</span>
  <span class="small"><span class="badge bg-success-subtle text-success border me-1">✔ Present</span> Normal attendance</span>
  <span class="small"><span class="badge bg-warning-subtle text-warning border me-1">⏰ Late</span> After grace period</span>
  <span class="small"><span class="badge bg-danger-subtle text-danger border me-1">✘ Absent</span> No punch found</span>
  <span class="small"><span class="badge bg-primary-subtle text-primary border me-1">+ OT</span> Beyond shift end time</span>
  <span class="small"><span class="badge bg-secondary-subtle text-secondary border me-1">OFF</span> Weekend day</span>
  <span class="small"><span class="badge bg-info-subtle text-info border me-1">Auto</span> Per-day auto detected</span>
</div>

<?php renderFooter(); ?>