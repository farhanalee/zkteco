<?php
/**
 * ZKTeco K40 Attendance System - Absenteeism Report
 * Cross-references enrolled K40 users against punches on a selected date
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

$selectedDate = $_GET['date'] ?? date('Y-m-d');

$users = [];
$attendance = [];

if ($isConnected) {
    $uRes = $connector->getUsers();
    if ($uRes['success'] ?? false) $users = $uRes['data'] ?? [];

    $aRes = $connector->getAttendance(['date' => $selectedDate]);
    if ($aRes['success'] ?? false) $attendance = $aRes['data'] ?? [];
}

$absentList = AttendanceHelper::getAbsentReport($attendance, $users, $selectedDate);

// CSV Export
if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    AttendanceHelper::exportToCsv($absentList, [
        'user_id' => 'Employee ID',
        'name' => 'Employee Name',
        'date' => 'Date',
        'privilege' => 'Privilege',
        'card_number' => 'Card Number',
        'status' => 'Status'
    ], "ZKTeco_Absent_Report_{$selectedDate}.csv");
}

renderHeader('Absent Employees Report', 'report_absent');
?>

<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
  <div>
    <h3 class="fw-bold mb-1">Absenteeism Report</h3>
    <p class="text-muted mb-0 small">Cross-references all active users on K40 hardware against punches recorded for the date</p>
  </div>
  <div class="d-flex align-items-center gap-2">
    <a href="?date=<?= urlencode($selectedDate) ?>&export=csv" class="btn btn-outline-success btn-sm d-flex align-items-center gap-1">
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
      <div class="col-12 col-sm-8 col-md-4">
        <label class="form-label small fw-semibold text-secondary">Target Evaluation Date</label>
        <input type="date" class="form-control form-control-sm" name="date" value="<?= htmlspecialchars($selectedDate) ?>">
      </div>

      <div class="col-12 col-sm-4 col-md-3">
        <button type="submit" class="btn btn-primary btn-sm w-100 fw-semibold">
          <i class="bi bi-person-x me-1"></i> Check Absent Employees
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Absent Summary Cards -->
<div class="row g-3 mb-4">
  <div class="col-6 col-md-4">
    <div class="p-3 bg-white border rounded-3 shadow-sm text-center">
      <span class="text-muted extra-small text-uppercase fw-bold">Enrolled on Device</span>
      <h3 class="fw-bold text-dark mb-0"><?= count($users) ?></h3>
    </div>
  </div>
  <div class="col-6 col-md-4">
    <div class="p-3 bg-white border rounded-3 shadow-sm text-center">
      <span class="text-muted extra-small text-uppercase fw-bold">Absent on <?= $selectedDate ?></span>
      <h3 class="fw-bold text-danger mb-0"><?= count($absentList) ?></h3>
    </div>
  </div>
  <div class="col-12 col-md-4">
    <div class="p-3 bg-white border rounded-3 shadow-sm text-center">
      <span class="text-muted extra-small text-uppercase fw-bold">Attendance Rate</span>
      <?php
      $tot = max(count($users), 1);
      $presentCount = count($users) - count($absentList);
      $rate = round(($presentCount / $tot) * 100, 1);
      ?>
      <h3 class="fw-bold text-success mb-0"><?= $rate ?>%</h3>
    </div>
  </div>
</div>

<!-- Table -->
<div class="card border-0 shadow-sm rounded-3">
  <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
    <h6 class="fw-bold mb-0 text-dark">
      <i class="bi bi-person-x me-2 text-danger"></i>Absent Employee Roster (<span class="text-danger"><?= count($absentList) ?></span>)
    </h6>
  </div>
  <div class="card-body p-0">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0 table-custom">
        <thead>
          <tr>
            <th class="ps-3">Employee ID</th>
            <th>Employee Name</th>
            <th>Evaluation Date</th>
            <th>Privilege</th>
            <th>Card Number</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($absentList)): ?>
            <tr>
              <td colspan="6" class="text-center py-5 text-muted">
                <i class="bi bi-check-circle fs-1 d-block mb-2 text-success"></i>
                <h6 class="fw-semibold text-success">100% Attendance on <?= htmlspecialchars($selectedDate) ?></h6>
                <p class="small text-muted mb-0">All enrolled biometric users recorded at least one punch on the K40 device.</p>
              </td>
            </tr>
          <?php else: ?>
            <?php foreach ($absentList as $row): ?>
              <tr>
                <td class="ps-3 fw-bold font-monospace text-dark">EMP-<?= htmlspecialchars($row['user_id']) ?></td>
                <td class="fw-semibold text-primary"><?= htmlspecialchars($row['name']) ?></td>
                <td><?= htmlspecialchars($row['date']) ?></td>
                <td><span class="badge bg-secondary"><?= htmlspecialchars($row['privilege']) ?></span></td>
                <td class="font-monospace text-muted"><?= htmlspecialchars($row['card_number']) ?></td>
                <td><span class="badge bg-danger-subtle text-danger fw-bold">Absent (0 Punches)</span></td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<?php renderFooter(); ?>
