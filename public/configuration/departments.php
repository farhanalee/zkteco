<?php
/**
 * ZKTeco K40 Attendance System - Departments Configuration
 * Stored locally in /config/departments.json
 */

require_once __DIR__ . '/../../app/config.php';
require_once __DIR__ . '/../../app/auth.php';
require_once __DIR__ . '/../../app/layout.php';

use App\Auth;
use App\Config;
use function App\renderHeader;
use function App\renderFooter;

Auth::requireAuth();

$departments = Config::get('departments', []);
$message = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    if ($action === 'create') {
        $name = trim($_POST['name'] ?? '');
        $code = strtoupper(trim($_POST['code'] ?? ''));
        $manager = trim($_POST['manager'] ?? 'EMP-1001');
        $defaultShiftId = trim($_POST['default_shift_id'] ?? '');

        if ($name && $code) {
            $departments[] = [
                'id' => 'dept_' . strtolower($code) . '_' . uniqid(),
                'name' => $name,
                'code' => $code,
                'manager' => $manager,
                'default_shift_id' => $defaultShiftId
            ];
            Config::set('departments', $departments);
            $message = "Department '$name' added successfully.";
        }
    } elseif ($action === 'delete') {
        $id = $_POST['id'] ?? '';
        $departments = array_values(array_filter($departments, fn($d) => $d['id'] !== $id));
        Config::set('departments', $departments);
        $message = "Department removed successfully.";
    }
}

renderHeader('Department Management', 'config_departments');
?>

<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
  <div>
    <h3 class="fw-bold mb-1">Department Structure</h3>
    <p class="text-muted mb-0 small">Manage organizational units and department codes (stored in <code>config/departments.json</code>)</p>
  </div>
  <button class="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm" data-bs-toggle="modal" data-bs-target="#addDeptModal">
    <i class="bi bi-plus-circle-fill"></i> Add Department
  </button>
</div>

<?php if ($message): ?>
  <div class="alert alert-success py-2 small d-flex align-items-center gap-2 mb-3">
    <i class="bi bi-check-circle-fill"></i>
    <span><?= htmlspecialchars($message) ?></span>
  </div>
<?php endif; ?>

<div class="card border-0 shadow-sm rounded-3">
  <div class="card-body p-0">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0 table-custom">
        <thead>
          <tr>
            <th class="ps-3">Department Code</th>
            <th>Department Name</th>
            <th>Department Lead</th>
            <th>Default Shift</th>
            <th class="text-end pe-3">Action</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($departments)): ?>
            <tr>
              <td colspan="5" class="text-center py-4 text-muted">No departments configured yet.</td>
            </tr>
          <?php else: ?>
            <?php foreach ($departments as $dept): ?>
              <tr>
                <td class="ps-3"><span class="badge bg-primary-subtle text-primary fw-bold font-monospace"><?= htmlspecialchars($dept['code']) ?></span></td>
                <td class="fw-semibold text-dark"><?= htmlspecialchars($dept['name']) ?></td>
                <td class="text-muted font-monospace"><?= htmlspecialchars($dept['manager']) ?></td>
                <td>
                  <?php if (!empty($dept['default_shift_id'])): ?>
                    <span class="badge bg-light text-dark border px-2 py-0.5 font-mono text-xs"><?= htmlspecialchars($dept['default_shift_id']) ?></span>
                  <?php else: ?>
                    <span class="text-muted">—</span>
                  <?php endif; ?>
                </td>
                <td class="text-end pe-3">
                  <form method="POST" action="" onsubmit="return confirm('Delete this department?');" class="d-inline">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="id" value="<?= htmlspecialchars($dept['id']) ?>">
                    <button type="submit" class="btn btn-light btn-sm text-danger"><i class="bi bi-trash"></i></button>
                  </form>
                </td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Modal: Add Department -->
<div class="modal fade" id="addDeptModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content border-0 shadow">
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title fw-bold"><i class="bi bi-building me-2"></i>Add Department</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
      </div>
      <form method="POST" action="">
        <input type="hidden" name="action" value="create">
        <div class="modal-body p-4">
          <div class="mb-3">
            <label class="form-label small fw-semibold">Department Name <span class="text-danger">*</span></label>
            <input type="text" class="form-control" name="name" placeholder="e.g. Quality Assurance" required>
          </div>
          <div class="mb-3">
            <label class="form-label small fw-semibold">Department Code (Short) <span class="text-danger">*</span></label>
            <input type="text" class="form-control text-uppercase" name="code" placeholder="QA" maxlength="6" required>
          </div>
          <div class="mb-3">
            <label class="form-label small fw-semibold">Department Manager ID</label>
            <input type="text" class="form-control" name="manager" value="EMP-1001" placeholder="EMP-1001">
          </div>
          <div class="mb-3">
            <label class="form-label small fw-semibold">Default Shift (Optional)</label>
            <select class="form-select form-select-sm" name="default_shift_id">
              <option value="">— No default shift —</option>
              <?php
              $shifts = Config::get('shifts', []);
              foreach ($shifts as $s):
              ?>
                <option value="<?= htmlspecialchars($s['id']) ?>">
                  <?= htmlspecialchars($s['name']) ?> (<?= htmlspecialchars($s['start_time']) ?>–<?= htmlspecialchars($s['end_time']) ?>)
                </option>
              <?php endforeach; ?>
            </select>
          </div>
        </div>
        <div class="modal-footer bg-light">
          <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm fw-semibold">Save Department</button>
        </div>
      </form>
    </div>
  </div>
</div>

<?php renderFooter(); ?>
