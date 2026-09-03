<?php
/**
 * ZKTeco K40 Attendance System - Shift Configuration
 * Managed locally in /config/shifts.json - No SQL Database Required
 */

require_once __DIR__ . '/../../app/config.php';
require_once __DIR__ . '/../../app/auth.php';
require_once __DIR__ . '/../../app/layout.php';

use App\Auth;
use App\Config;
use function App\renderHeader;
use function App\renderFooter;

Auth::requireAuth();

$shifts = Config::get('shifts', []);
$message = null;
$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'create_shift') {
        $name = trim($_POST['name'] ?? '');
        $startTime = $_POST['start_time'] ?? '08:00';
        $endTime = $_POST['end_time'] ?? '17:00';
        $grace = intval($_POST['grace_period_minutes'] ?? 15);
        $lateThreshold = intval($_POST['late_threshold_minutes'] ?? 30);
        $isNight = isset($_POST['is_night_shift']) ? true : false;
        $shiftType = $_POST['shift_type'] ?? '8h';

        // Set standard hours based on shift type
        $fullDayMinutes = 480;
        $halfDayMinutes = 240;
        if ($shiftType === '12h') {
            $fullDayMinutes = 720;
            $halfDayMinutes = 360;
        } elseif ($shiftType === 'office') {
            $fullDayMinutes = 480;
            $halfDayMinutes = 240;
        }

        $newShift = [
            'id' => 'shift_' . uniqid(),
            'name' => $name,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'grace_period_minutes' => $grace,
            'late_threshold_minutes' => $lateThreshold,
            'half_day_minutes' => $halfDayMinutes,
            'full_day_minutes' => $fullDayMinutes,
            'is_night_shift' => $isNight,
            'working_days' => ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            'is_default' => empty($shifts),
            'shift_type' => $shiftType
        ];

        $shifts[] = $newShift;
        Config::set('shifts', $shifts);
        $message = "Shift '$name' created successfully.";
    } elseif ($action === 'delete_shift') {
        $id = $_POST['id'] ?? '';
        $shifts = array_values(array_filter($shifts, fn($s) => $s['id'] !== $id));
        Config::set('shifts', $shifts);
        $message = "Shift deleted successfully.";
    }
}

renderHeader('Shift Management', 'config_shifts');
?>

<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
  <div>
    <h3 class="fw-bold mb-1">Shift Configuration</h3>
    <p class="text-muted mb-0 small">Define operating shifts, grace periods, and late arrival rules (stored in <code>config/shifts.json</code>)</p>
  </div>
  <button class="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm" data-bs-toggle="modal" data-bs-target="#addShiftModal">
    <i class="bi bi-plus-circle-fill"></i> Add New Shift
  </button>
</div>

<?php if ($message): ?>
  <div class="alert alert-success py-2 small d-flex align-items-center gap-2 mb-3">
    <i class="bi bi-check-circle-fill"></i>
    <span><?= htmlspecialchars($message) ?></span>
  </div>
<?php endif; ?>

<div class="row g-4">
  <?php foreach ($shifts as $shift): ?>
    <div class="col-12 col-md-6 col-xl-4">
      <div class="card border-0 shadow-sm rounded-3 h-100">
        <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-<?= !empty($shift['is_night_shift']) ? 'moon-stars text-indigo' : 'sun-fill text-warning' ?> fs-5"></i>
            <h6 class="fw-bold mb-0 text-dark"><?= htmlspecialchars($shift['name']) ?></h6>
          </div>
          <?php if (!empty($shift['is_default'])): ?>
            <span class="badge bg-primary-subtle text-primary">Default</span>
          <?php endif; ?>
        </div>
        <div class="card-body p-3">
          <div class="row g-2 mb-3">
            <div class="col-6">
              <span class="text-muted extra-small text-uppercase fw-bold d-block">Start Time</span>
              <span class="fs-5 fw-bold text-success font-monospace"><?= htmlspecialchars($shift['start_time']) ?></span>
            </div>
            <div class="col-6">
              <span class="text-muted extra-small text-uppercase fw-bold d-block">End Time</span>
              <span class="fs-5 fw-bold text-danger font-monospace"><?= htmlspecialchars($shift['end_time']) ?></span>
            </div>
          </div>

          <ul class="list-group list-group-flush small mb-3">
            <li class="list-group-item d-flex justify-content-between px-0 py-2">
              <span class="text-muted">Grace Period</span>
              <span class="fw-semibold text-dark"><?= $shift['grace_period_minutes'] ?? 15 ?> minutes</span>
            </li>
            <li class="list-group-item d-flex justify-content-between px-0 py-2">
              <span class="text-muted">Late Threshold</span>
              <span class="fw-semibold text-dark"><?= $shift['late_threshold_minutes'] ?? 30 ?> minutes</span>
            </li>
            <li class="list-group-item d-flex justify-content-between px-0 py-2">
              <span class="text-muted">Shift Type</span>
              <span class="fw-semibold"><?= !empty($shift['is_night_shift']) ? 'Overnight Shift' : 'Day Shift' ?></span>
            </li>
            <li class="list-group-item d-flex justify-content-between px-0 py-2">
              <span class="text-muted">Shift Pattern</span>
              <span class="badge bg-light text-dark border px-2 py-0.5">
                <?= $shift['shift_type'] ?? '8h' ?>
              </span>
            </li>
          </ul>

          <div class="text-end">
            <form method="POST" action="" onsubmit="return confirm('Are you sure you want to delete this shift?');" class="d-inline">
              <input type="hidden" name="action" value="delete_shift">
              <input type="hidden" name="id" value="<?= htmlspecialchars($shift['id']) ?>">
              <button type="submit" class="btn btn-outline-danger btn-sm">
                <i class="bi bi-trash me-1"></i> Delete
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  <?php endforeach; ?>
</div>

<!-- Modal: Add Shift -->
<div class="modal fade" id="addShiftModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content border-0 shadow">
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title fw-bold"><i class="bi bi-clock-history me-2"></i>Create Shift Schedule</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
      </div>
      <form method="POST" action="">
        <input type="hidden" name="action" value="create_shift">
        <div class="modal-body p-4">
          <div class="mb-3">
            <label class="form-label small fw-semibold">Shift Name <span class="text-danger">*</span></label>
            <input type="text" class="form-control" name="name" placeholder="e.g. Evening Shift" required>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-6">
              <label class="form-label small fw-semibold">Start Time (24h) <span class="text-danger">*</span></label>
              <input type="time" class="form-control" name="start_time" value="08:00" required>
            </div>
            <div class="col-6">
              <label class="form-label small fw-semibold">End Time (24h) <span class="text-danger">*</span></label>
              <input type="time" class="form-control" name="end_time" value="17:00" required>
            </div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-6">
              <label class="form-label small fw-semibold">Grace Period (Minutes)</label>
              <input type="number" class="form-control" name="grace_period_minutes" value="15" min="0" max="60">
            </div>
            <div class="col-6">
              <label class="form-label small fw-semibold">Late Threshold (Minutes)</label>
              <input type="number" class="form-control" name="late_threshold_minutes" value="30" min="0" max="120">
            </div>
          </div>

          <div class="form-check">
            <input class="form-check-input" type="checkbox" name="is_night_shift" id="is_night_shift">
            <label class="form-check-label small" for="is_night_shift">
              Night Shift (Crosses midnight, e.g. 8:00 PM to 5:00 AM)
            </label>
          </div>

          <div class="mb-3 mt-3">
            <label class="form-label small fw-semibold">Shift Type</label>
            <select class="form-select form-select-sm" name="shift_type">
              <option value="8h">8-Hour Shift (Standard 8h workday)</option>
              <option value="12h">12-Hour Shift (12h rotation)</option>
              <option value="office">Office Shift (8h fixed)</option>
            </select>
          </div>
        </div>
        <div class="modal-footer bg-light">
          <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm fw-semibold">
            <i class="bi bi-save me-1"></i> Save Shift Definition
          </button>
        </div>
      </form>
    </div>
  </div>
</div>

<?php renderFooter(); ?>
