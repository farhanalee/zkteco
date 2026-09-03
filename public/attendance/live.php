<?php
/**
 * ZKTeco K40 Attendance System - Live Attendance Monitoring
 * Real-time polling screen with instant punch feed and audio alerts
 */

require_once __DIR__ . '/../../app/config.php';
require_once __DIR__ . '/../../app/auth.php';
require_once __DIR__ . '/../../app/connector.php';
require_once __DIR__ . '/../../app/layout.php';

use App\Auth;
use App\Config;
use function App\renderHeader;
use function App\renderFooter;

Auth::requireAuth();

$deviceConfig = Config::get('device', []);
$appConfig = Config::get('app', []);
$isConnected = ($deviceConfig['last_connection_status'] ?? '') === 'Connected';

renderHeader('Live Attendance Feed', 'attendance_live');
?>

<div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
  <div>
    <h3 class="fw-bold mb-1"><i class="bi bi-broadcast text-danger pulse-dot me-2"></i>Live Attendance Terminal</h3>
    <p class="text-muted mb-0 small">Real-time biometric punch stream directly from ZKTeco K40</p>
  </div>
  
  <div class="d-flex align-items-center gap-2">
    <div class="input-group input-group-sm" style="width: 170px;">
      <span class="input-group-text bg-white small text-muted">Polling:</span>
      <select id="pollIntervalSelect" class="form-select form-select-sm" onchange="updatePollingInterval()">
        <option value="3000">Every 3s</option>
        <option value="5000" selected>Every 5s</option>
        <option value="10000">Every 10s</option>
        <option value="30000">Every 30s</option>
      </select>
    </div>

    <button id="btnTogglePolling" class="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onclick="togglePolling()">
      <i class="bi bi-pause-fill"></i> Pause Live Stream
    </button>
    <button class="btn btn-light btn-sm" onclick="App.playBeep()" title="Test Audio Chime">
      <i class="bi bi-volume-up"></i>
    </button>
  </div>
</div>

<!-- Highlight Hero Box: Most Recent Punch -->
<div class="card border-0 shadow-sm rounded-3 mb-4 bg-primary text-white overflow-hidden">
  <div class="card-body p-4 position-relative">
    <div class="row align-items-center">
      <div class="col-12 col-md-8">
        <span class="badge bg-white text-primary fw-bold text-uppercase px-3 py-1 mb-2">Latest Biometric Punch</span>
        <div class="d-flex align-items-center gap-3">
          <div class="bg-white bg-opacity-25 rounded-circle p-3 text-center" style="width: 64px; height: 64px;">
            <i class="bi bi-person-check fs-2"></i>
          </div>
          <div>
            <h2 class="fw-bold mb-0" id="liveLatestName">Waiting for punch...</h2>
            <div class="d-flex align-items-center gap-2 mt-1 opacity-90">
              <span class="font-monospace fw-semibold" id="liveLatestEmpId">EMP-XXXX</span>
              <span>&bull;</span>
              <span id="liveLatestMethod"><i class="bi bi-fingerprint me-1"></i>Biometric Scanner</span>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-md-4 text-md-end mt-3 mt-md-0 border-top border-md-0 pt-3 pt-md-0 border-white border-opacity-25">
        <div class="display-6 fw-bold font-monospace mb-1" id="liveLatestTime">--:--:--</div>
        <span class="badge bg-success px-3 py-2 fs-6 shadow-sm" id="liveLatestStatus">Check-In</span>
      </div>
    </div>
  </div>
</div>

<!-- Stream Feed Table -->
<div class="card border-0 shadow-sm rounded-3">
  <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
    <h6 class="fw-bold mb-0 text-dark">
      <i class="bi bi-clock-history me-2 text-primary"></i>Today's Punch Stream (<span id="todayPunchCount">0</span> punches)
    </h6>
    <span class="badge bg-light text-secondary border font-monospace" id="lastPollTimestamp">Polling active</span>
  </div>
  <div class="card-body p-0">
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0 table-custom" id="liveStreamTable">
        <thead>
          <tr>
            <th class="ps-3">Punch Time</th>
            <th>Employee ID</th>
            <th>Employee Name</th>
            <th>Attendance State</th>
            <th>Verification Method</th>
            <th>Terminal Device</th>
          </tr>
        </thead>
        <tbody id="liveStreamBody">
          <tr>
            <td colspan="6" class="text-center py-5 text-muted">
              <div class="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
              <p class="small text-muted mb-0">Connecting to K40 live stream...</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

<script>
let isPolling = true;
let pollTimer = null;
let lastKnownPunchesCount = 0;
let userMap = {};

async function fetchUserMap() {
  const res = await App.apiRequest('/zkteco/public/api/employees.php?action=list');
  if (res.success && res.data) {
    res.data.forEach(u => {
      userMap[String(u.user_id || u.uid)] = u.name;
    });
  }
}

async function pollLiveAttendance() {
  if (!isPolling) return;

  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await App.apiRequest('/zkteco/public/api/attendance.php?action=list&date=' + today);
    
    document.getElementById('lastPollTimestamp').innerText = 'Last polled: ' + new Date().toLocaleTimeString();

    if (res.success && res.data) {
      const punches = res.data;
      document.getElementById('todayPunchCount').innerText = punches.length;

      // Check if new punch arrived
      if (punches.length > lastKnownPunchesCount && lastKnownPunchesCount > 0) {
        App.playBeep();
        App.showToast(`New punch detected: EMP-${punches[0].user_id} (${userMap[String(punches[0].user_id)] || 'Employee'})`, 'success');
      }

      if (punches.length > 0) {
        const latest = punches[0];
        const empName = userMap[String(latest.user_id)] || ('Employee #' + latest.user_id);

        document.getElementById('liveLatestName').innerText = empName;
        document.getElementById('liveLatestEmpId').innerText = 'EMP-' + latest.user_id;
        document.getElementById('liveLatestTime').innerText = latest.time || '--:--:--';
        document.getElementById('liveLatestMethod').innerHTML = `<i class="bi bi-fingerprint me-1"></i>${latest.verification_type || 'Fingerprint'}`;
        document.getElementById('liveLatestStatus').innerText = latest.status || 'Check-In';
      }

      lastKnownPunchesCount = punches.length;

      // Render table
      const tbody = document.getElementById('liveStreamBody');
      if (punches.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-4 text-muted">
              <i class="bi bi-calendar-x d-block fs-3 mb-1"></i>
              No punches registered on K40 terminal for today yet.
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = punches.map(p => {
          const name = userMap[String(p.user_id)] || `EMP-${p.user_id}`;
          const isCheckIn = (p.status || '').includes('In');
          return `
            <tr>
              <td class="ps-3 font-monospace fw-bold text-primary">${p.time}</td>
              <td class="font-monospace text-dark">EMP-${p.user_id}</td>
              <td class="fw-semibold">${name}</td>
              <td>
                <span class="badge ${isCheckIn ? 'bg-success-subtle text-success' : 'bg-info-subtle text-info'}">
                  ${p.status || 'Check-In'}
                </span>
              </td>
              <td><i class="bi bi-fingerprint text-secondary me-1"></i>${p.verification_type || 'Fingerprint'}</td>
              <td class="text-muted small">ZKTeco K40</td>
            </tr>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Polling error:', err);
  }

  const interval = parseInt(document.getElementById('pollIntervalSelect').value) || 5000;
  pollTimer = setTimeout(pollLiveAttendance, interval);
}

function updatePollingInterval() {
  clearTimeout(pollTimer);
  pollLiveAttendance();
}

function togglePolling() {
  isPolling = !isPolling;
  const btn = document.getElementById('btnTogglePolling');
  if (isPolling) {
    btn.innerHTML = '<i class="bi bi-pause-fill"></i> Pause Live Stream';
    btn.classList.replace('btn-success', 'btn-outline-primary');
    pollLiveAttendance();
  } else {
    btn.innerHTML = '<i class="bi bi-play-fill"></i> Resume Live Stream';
    btn.classList.replace('btn-outline-primary', 'btn-success');
    clearTimeout(pollTimer);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await fetchUserMap();
  pollLiveAttendance();
});
</script>

<?php renderFooter(); ?>
