<?php
/**
 * ZKTeco K40 Attendance System - Employee Management
 * Reads and manages employees directly on the ZKTeco K40 device
 */

require_once __DIR__ . '/../../app/config.php';
require_once __DIR__ . '/../../app/auth.php';
require_once __DIR__ . '/../../app/connector.php';
require_once __DIR__ . '/../../app/layout.php';

use App\Auth;
use App\Config;
use App\ConnectorClient;
use function App\renderHeader;
use function App\renderFooter;

Auth::requireAuth();

$connector = new ConnectorClient();
$deviceConfig = Config::get('device', []);
$isConnected = ($deviceConfig['last_connection_status'] ?? '') === 'Connected';

$users = [];
$error = null;

if ($isConnected) {
    $res = $connector->getUsers();
    if ($res['success'] ?? false) {
        $users = $res['data'] ?? [];
    } else {
        $error = $res['message'] ?? 'Unable to retrieve user records from K40 device';
    }
} else {
    $error = "Device is currently offline. Connect the ZKTeco K40 in Device Settings to view enrolled employees.";
}

// Load reference data for modals
$shifts = Config::get('shifts', []);
$departments = Config::get('departments', []);
$designations = Config::get('designations', []);

renderHeader('Employees', 'employees');
?>

<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
  <div>
    <h3 class="fw-bold mb-1">Employee Management</h3>
    <p class="text-muted mb-0 small">Enrolled biometric users retrieved directly from ZKTeco K40 terminal</p>
  </div>
  <div class="d-flex align-items-center gap-2">
    <button onclick="window.location.reload()" class="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1">
      <i class="bi bi-arrow-clockwise"></i> Refresh from K40
    </button>
    <button class="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm" data-bs-toggle="modal" data-bs-target="#addUserModal" <?= !$isConnected ? 'disabled' : '' ?>>
      <i class="bi bi-person-plus-fill"></i> Enroll New Employee
    </button>
  </div>
</div>

<?php if ($error && !$isConnected): ?>
  <div class="alert alert-warning py-3 d-flex align-items-center gap-3 shadow-sm border-0 mb-4">
    <i class="bi bi-exclamation-triangle-fill fs-4 text-warning"></i>
    <div>
      <h6 class="fw-bold mb-1">Device Not Connected</h6>
      <p class="mb-0 small"><?= htmlspecialchars($error) ?></p>
    </div>
    <a href="/zkteco/public/device/settings.php" class="btn btn-warning btn-sm ms-auto fw-semibold">Connect Device</a>
  </div>
<?php endif; ?>

<!-- Search and Statistics Row -->
<div class="row g-3 mb-4">
  <div class="col-12 col-md-6">
    <div class="input-group">
      <span class="input-group-text bg-white"><i class="bi bi-search text-muted"></i></span>
      <input type="text" id="employeeSearchInput" class="form-control" placeholder="Search by Employee ID, Name, Card, Department..." onkeyup="filterEmployees()">
    </div>
  </div>
  <div class="col-12 col-md-6 text-md-end d-flex align-items-center justify-content-md-end gap-3">
    <span class="text-muted small">Total Enrolled: <strong class="text-primary fs-6"><?= count($users) ?></strong></span>
    <span class="badge bg-light text-secondary border">Source: K40 Memory</span>
  </div>
</div>

<!-- Employee Table -->
<div class="card border-0 shadow-sm rounded-3">
  <div class="card-body p-0">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0 table-custom" id="employeeTable">
        <thead>
          <tr>
            <th class="ps-3">UID</th>
            <th>Employee ID</th>
            <th>Full Name</th>
            <th>Department</th>
            <th>Designation</th>
            <th>Shift</th>
            <th>Employment</th>
            <th>Privilege</th>
            <th>Card Number</th>
            <th>Biometrics</th>
            <th>Password</th>
            <th class="text-end pe-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php if (empty($users)): ?>
            <tr>
              <td colspan="12" class="text-center py-5 text-muted">
                <i class="bi bi-people fs-1 d-block mb-2 text-secondary"></i>
                <h6 class="fw-semibold">No Employee Records Available</h6>
                <p class="small text-muted mb-0"><?= $isConnected ? 'The connected K40 memory has 0 users, or you can enroll a new employee.' : 'Connect your ZKTeco device to retrieve employees.' ?></p>
              </td>
            </tr>
          <?php else: ?>
            <?php foreach ($users as $user): ?>
              <tr class="employee-row">
                <td class="ps-3 font-monospace text-muted small"><?= htmlspecialchars($user['uid']) ?></td>
                <td class="fw-bold text-dark font-monospace">EMP-<?= htmlspecialchars($user['user_id']) ?></td>
                <td class="fw-semibold text-primary"><?= htmlspecialchars($user['name']) ?></td>
                <td class="text-muted small">
                  <?= !empty($user['department_name']) ? htmlspecialchars($user['department_name']) : '<span class="text-muted">—</span>' ?>
                </td>
                <td class="text-muted small">
                  <?= !empty($user['designation_title']) ? htmlspecialchars($user['designation_title']) : '<span class="text-muted">—</span>' ?>
                </td>
                <td class="font-monospace text-xs">
                  <?php if (!empty($user['shift_id'])): ?>
                    <?php $shift = array_values(array_filter($shifts, fn($s) => $s['id'] === $user['shift_id'])); ?>
                    <?php if ($shift): ?>
                      <span class="badge bg-info-subtle text-info"><?= htmlspecialchars($shift[0]['name']) ?></span>
                    <?php else: ?>
                      <span class="badge bg-light text-dark border"><?= htmlspecialchars($user['shift_id']) ?></span>
                    <?php endif; ?>
                  <?php else: ?>
                    <span class="text-muted">Auto</span>
                  <?php endif; ?>
                </td>
                <td>
                  <span class="badge <?= ($user['employment_type'] ?? 'permanent') === 'permanent' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning' ?>">
                    <?= ucfirst($user['employment_type'] ?? 'permanent') ?>
                  </span>
                </td>
                <td>
                  <?php
                  $priv = $user['privilege_name'] ?? 'User';
                  $badgeClass = $priv === 'Super Admin' ? 'bg-danger' : ($priv === 'Manager' ? 'bg-warning text-dark' : 'bg-secondary');
                  ?>
                  <span class="badge <?= $badgeClass ?>"><?= htmlspecialchars($priv) ?></span>
                </td>
                <td class="font-monospace text-muted"><?= htmlspecialchars($user['card_number'] ?? 'None') ?></td>
                <td>
                  <span class="badge bg-success-subtle text-success">
                    <i class="bi bi-fingerprint me-1"></i>Enrolled
                  </span>
                </td>
                <td>
                  <?= !empty($user['has_password']) ? '<span class="badge bg-light text-dark border"><i class="bi bi-key-fill text-warning me-1"></i>Set</span>' : '<span class="text-muted small">None</span>' ?>
                </td>
                <td class="text-end pe-3">
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-light" title="Edit Employee" onclick="openEditModal('<?= htmlspecialchars(addslashes(json_encode($user))) ?>')">
                      <i class="bi bi-pencil text-primary"></i>
                    </button>
                    <button class="btn btn-light text-danger" title="Delete from K40" onclick="deleteEmployee('<?= htmlspecialchars($user['uid']) ?>', '<?= htmlspecialchars($user['user_id']) ?>', '<?= htmlspecialchars(addslashes($user['name'])) ?>')">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Modal: Enroll / Add Employee -->
<div class="modal fade" id="addUserModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-lg">
    <div class="modal-content border-0 shadow">
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title fw-bold"><i class="bi bi-person-plus-fill me-2"></i>Enroll Employee to K40</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
      </div>
      <form id="addUserForm" onsubmit="submitAddUser(event)">
        <input type="hidden" name="action" value="create">
        <div class="modal-body p-4">
          <div class="row g-3 mb-3">
            <div class="col-12 col-md-6">
              <label class="form-label small fw-semibold">Employee ID <span class="text-danger">*</span></label>
              <input type="text" class="form-control" name="user_id" id="add_user_id" placeholder="1001" required>
              <div class="form-text extra-small">Numeric or alphanumeric ID recognized on terminal</div>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label small fw-semibold">Full Name <span class="text-danger">*</span></label>
              <input type="text" class="form-control" name="name" id="add_name" placeholder="e.g. Ali Ahmed" maxlength="24" required>
              <div class="form-text extra-small">Max 24 characters stored in K40 hardware</div>
            </div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-12 col-md-6">
              <label class="form-label small fw-semibold">Privilege</label>
              <select class="form-select" name="privilege" id="add_privilege">
                <option value="0" selected>Normal User</option>
                <option value="2">Enroller</option>
                <option value="6">Manager</option>
                <option value="14">Super Admin</option>
              </select>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label small fw-semibold">RFID / Card Number</label>
              <input type="number" class="form-control" name="card" id="add_card" placeholder="0">
            </div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-12 col-md-6">
              <label class="form-label small fw-semibold">Department</label>
              <select class="form-select form-select-sm" name="department_id" id="add_department_id">
                <option value="">— Select Department —</option>
                <?php foreach ($departments as $dept): ?>
                  <option value="<?= htmlspecialchars($dept['id']) ?>"><?= htmlspecialchars($dept['name']) ?> (<?= htmlspecialchars($dept['code']) ?>)</option>
                <?php endforeach; ?>
              </select>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label small fw-semibold">Designation</label>
              <select class="form-select form-select-sm" name="designation_id" id="add_designation_id">
                <option value="">— Select Designation —</option>
                <?php foreach ($designations as $desig): ?>
                  <option value="<?= htmlspecialchars($desig['id']) ?>"><?= htmlspecialchars($desig['title']) ?></option>
                <?php endforeach; ?>
              </select>
            </div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-12 col-md-6">
              <label class="form-label small fw-semibold">Permanent Shift Assignment</label>
              <select class="form-select form-select-sm" name="shift_id" id="add_shift_id">
                <option value="">— Auto Detect —</option>
                <?php foreach ($shifts as $s): ?>
                  <option value="<?= htmlspecialchars($s['id']) ?>">
                    <?= htmlspecialchars($s['name']) ?> (<?= htmlspecialchars($s['start_time']) ?>–<?= htmlspecialchars($s['end_time']) ?>)
                  </option>
                <?php endforeach; ?>
              </select>
              <div class="form-text extra-small">Leave blank for auto-detection based on punch time</div>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label small fw-semibold">Employment Type</label>
              <select class="form-select form-select-sm" name="employment_type" id="add_employment_type">
                <option value="permanent" selected>Permanent</option>
                <option value="temporary">Temporary/Contract</option>
              </select>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label small fw-semibold">PIN Password (Optional)</label>
            <input type="password" class="form-control" name="password" id="add_password" placeholder="Max 8 digits" maxlength="8">
          </div>

          <div class="alert alert-info py-2 extra-small mb-0">
            <i class="bi bi-info-circle me-1"></i> Once saved to the device, the employee can place their finger on the K40 scanner to register biometric fingerprints. Shift, department, and designation are stored locally for reporting.
          </div>
        </div>
        <div class="modal-footer bg-light">
          <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm fw-semibold" id="btnAddUserSubmit">
            <i class="bi bi-save me-1"></i> Save to K40 Terminal
          </button>
        </div>
      </form>
    </div>
  </div>
</div>

<script>
function filterEmployees() {
  const query = document.getElementById('employeeSearchInput').value.toLowerCase();
  const rows = document.querySelectorAll('.employee-row');
  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(query) ? '' : 'none';
  });
}

async function submitAddUser(e) {
  e.preventDefault();
  const btn = document.getElementById('btnAddUserSubmit');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Writing to K40...';

  const data = {
    user_id: document.getElementById('add_user_id').value,
    uid: parseInt(document.getElementById('add_user_id').value) || 1,
    name: document.getElementById('add_name').value,
    privilege: parseInt(document.getElementById('add_privilege').value),
    card: parseInt(document.getElementById('add_card').value) || 0,
    password: document.getElementById('add_password').value,
    department_id: document.getElementById('add_department_id').value || null,
    designation_id: document.getElementById('add_designation_id').value || null,
    shift_id: document.getElementById('add_shift_id').value || null,
    employment_type: document.getElementById('add_employment_type').value
  };

  const res = await App.apiRequest('/zkteco/public/api/employees.php?action=create', 'POST', data);
  btn.disabled = false;
  btn.innerHTML = '<i class="bi bi-save me-1"></i> Save to K40 Terminal';

  if (res.success) {
    App.showToast(res.message || 'Employee enrolled on device successfully!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
    setTimeout(() => window.location.reload(), 1000);
  } else {
    App.showToast(res.message || 'Failed to save employee to device', 'danger');
  }
}

async function deleteEmployee(uid, userId, name) {
  if (!confirm(`Are you sure you want to permanently delete ${name} (ID: ${userId}) from the ZKTeco K40 device memory?`)) {
    return;
  }

  const res = await App.apiRequest('/zkteco/public/api/employees.php?action=delete&user_id=' + encodeURIComponent(userId) + '&uid=' + uid, 'POST');
  if (res.success) {
    App.showToast(res.message || 'Employee removed from K40', 'success');
    setTimeout(() => window.location.reload(), 1000);
  } else {
    App.showToast(res.message || 'Failed to delete user', 'danger');
  }
}
</script>

<?php renderFooter(); ?>
