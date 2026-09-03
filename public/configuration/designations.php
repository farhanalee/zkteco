<?php
/**
 * ZKTeco K40 Attendance System - Designations Configuration
 * Stored locally in /config/designations.json
 */

require_once __DIR__ . '/../../app/config.php';
require_once __DIR__ . '/../../app/auth.php';
require_once __DIR__ . '/../../app/layout.php';

use App\Auth;
use App\Config;
use function App\renderHeader;
use function App\renderFooter;

Auth::requireAuth();

$designations = Config::get('designations', []);
$departments = Config::get('departments', []);
$message = null;

$deptMap = [];
foreach ($departments as $d) {
    $deptMap[$d['id']] = $d['name'];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    if ($action === 'create') {
        $title = trim($_POST['title'] ?? '');
        $deptId = $_POST['department_id'] ?? '';
        $level = trim($_POST['level'] ?? 'L2');

        if ($title) {
            $designations[] = [
                'id' => 'desig_' . uniqid(),
                'title' => $title,
                'department_id' => $deptId,
                'level' => $level
            ];
            Config::set('designations', $designations);
            $message = "Designation '$title' added.";
        }
    } elseif ($action === 'delete') {
        $id = $_POST['id'] ?? '';
        $designations = array_values(array_filter($designations, fn($d) => $d['id'] !== $id));
        Config::set('designations', $designations);
        $message = "Designation deleted.";
    }
}

renderHeader('Designation Management', 'config_designations');
?>

<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
  <div>
    <h3 class="fw-bold mb-1">Job Designations</h3>
    <p class="text-muted mb-0 small">Manage roles and designations (stored in <code>config/designations.json</code>)</p>
  </div>
  <button class="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm" data-bs-toggle="modal" data-bs-target="#addDesigModal">
    <i class="bi bi-plus-circle-fill"></i> Add Designation
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
            <th class="ps-3">Job Title</th>
            <th>Department</th>
            <th>Grade / Level</th>
            <th class="text-end pe-3">Action</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($designations)): ?>
            <tr>
              <td colspan="4" class="text-center py-4 text-muted">No designations configured yet.</td>
            </tr>
          <?php else: ?>
            <?php foreach ($designations as $desig): ?>
              <tr>
                <td class="ps-3 fw-semibold text-dark"><?= htmlspecialchars($desig['title']) ?></td>
                <td><span class="badge bg-light text-secondary border"><?= htmlspecialchars($deptMap[$desig['department_id'] ?? ''] ?? 'General') ?></span></td>
                <td><span class="badge bg-secondary-subtle text-secondary font-monospace"><?= htmlspecialchars($desig['level'] ?? 'L1') ?></span></td>
                <td class="text-end pe-3">
                  <form method="POST" action="" onsubmit="return confirm('Delete this designation?');" class="d-inline">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="id" value="<?= htmlspecialchars($desig['id']) ?>">
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

<!-- Modal: Add Designation -->
<div class="modal fade" id="addDesigModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content border-0 shadow">
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title fw-bold"><i class="bi bi-briefcase me-2"></i>Add Job Designation</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
      </div>
      <form method="POST" action="">
        <input type="hidden" name="action" value="create">
        <div class="modal-body p-4">
          <div class="mb-3">
            <label class="form-label small fw-semibold">Job Title <span class="text-danger">*</span></label>
            <input type="text" class="form-control" name="title" placeholder="e.g. Senior Software Engineer" required>
          </div>
          <div class="mb-3">
            <label class="form-label small fw-semibold">Department</label>
            <select class="form-select" name="department_id">
              <?php foreach ($departments as $d): ?>
                <option value="<?= htmlspecialchars($d['id']) ?>"><?= htmlspecialchars($d['name']) ?></option>
              <?php endforeach; ?>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label small fw-semibold">Job Level / Grade</label>
            <input type="text" class="form-control" name="level" value="L2" placeholder="L1, L2, L3, Manager">
          </div>
        </div>
        <div class="modal-footer bg-light">
          <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm fw-semibold">Save Designation</button>
        </div>
      </form>
    </div>
  </div>
</div>

<?php renderFooter(); ?>
