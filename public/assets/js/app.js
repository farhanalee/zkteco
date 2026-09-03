/**
 * ZKTeco K40 Attendance Management - Client Application JS
 */

const App = {
  csrfToken: document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',

  // Dynamically resolve relative / absolute API path regardless of root or subfolder setup
  resolveApiUrl(endpoint) {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }

    // Clean endpoint
    const cleanEndpoint = endpoint.replace(/^\/?(zkteco\/public\/|public\/|\/)?/, '');
    
    // Check current browser path
    const path = window.location.pathname;
    if (path.includes('/zkteco/public/')) {
      return '/zkteco/public/' + cleanEndpoint;
    } else if (path.includes('/zkteco/')) {
      return '/zkteco/' + cleanEndpoint;
    } else if (path.includes('/public/')) {
      return '/public/' + cleanEndpoint;
    } else {
      return '/' + cleanEndpoint;
    }
  },

  async apiRequest(url, method = 'GET', data = null) {
    const targetUrl = this.resolveApiUrl(url);

    const options = {
      method: method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-Token': this.csrfToken
      }
    };
    if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
      options.body = JSON.stringify(data);
    }

    try {
      const res = await fetch(targetUrl, options);
      const text = await res.text();

      let json;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        console.error('Non-JSON response received from:', targetUrl, text.substring(0, 300));
        return {
          success: false,
          error: 'SERVER_ERROR',
          message: res.status === 404 
            ? `API Endpoint not found at '${targetUrl}'. Please verify local server is running.`
            : `Server returned non-JSON response (HTTP ${res.status}): ${text.substring(0, 120)}`
        };
      }

      return json;
    } catch (err) {
      console.error('API Error:', err);
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Could not communicate with local server: ' + err.message
      };
    }
  },

  showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      const div = document.createElement('div');
      div.id = 'toast-container';
      div.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      div.style.zIndex = '9999';
      document.body.appendChild(div);
    }

    const bgClass = type === 'success' ? 'bg-success text-white' :
                    type === 'error' || type === 'danger' ? 'bg-danger text-white' :
                    type === 'warning' ? 'bg-warning text-dark' : 'bg-primary text-white';

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center ${bgClass} border-0 show mb-2 shadow`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi bi-${type === 'success' ? 'check-circle-fill' : type === 'warning' ? 'exclamation-triangle-fill' : type === 'error' ? 'x-circle-fill' : 'info-circle-fill'}"></i>
          <span>${message}</span>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close" onclick="this.closest('.toast').remove()"></button>
      </div>
    `;

    document.getElementById('toast-container').appendChild(toastEl);
    setTimeout(() => {
      if (toastEl.parentNode) toastEl.remove();
    }, 4500);
  },

  async testConnection(ip, port, commKey, timeout = 5) {
    const btn = document.getElementById('btn-test-connection');
    const resultBox = document.getElementById('connection-result-box');
    
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Testing TCP/IP connection...';
    }

    if (resultBox) {
      resultBox.innerHTML = '<div class="alert alert-info py-2 d-flex align-items-center gap-2"><span class="spinner-border spinner-border-sm"></span> Contacting ZKTeco K40 device at ' + ip + ':' + port + '...</div>';
      resultBox.classList.remove('d-none');
    }

    const res = await this.apiRequest('api/device.php?action=test_connection', 'POST', {
      ip: ip,
      port: parseInt(port || 4370),
      comm_key: parseInt(commKey || 0),
      timeout: parseInt(timeout || 5)
    });

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-broadcast me-1"></i> Test Connection';
    }

    if (res.success) {
      this.showToast(res.message || 'ZKTeco K40 Connected Successfully!', 'success');
      if (resultBox) {
        resultBox.innerHTML = `
          <div class="alert alert-success d-flex align-items-start gap-3 shadow-sm border-0">
            <i class="bi bi-check-circle-fill fs-4 text-success"></i>
            <div>
              <h6 class="fw-bold mb-1">Device Connected Successfully</h6>
              <p class="mb-1 small">${res.message}</p>
              <span class="badge bg-success">TCP/IP Handshake Verified</span>
              <span class="badge bg-dark ms-1">Session ID: ${res.session_id || 'Active'}</span>
            </div>
          </div>
        `;
      }
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      this.showToast(res.message || 'Connection Failed', 'danger');
      if (resultBox) {
        resultBox.innerHTML = `
          <div class="alert alert-danger d-flex align-items-start gap-3 shadow-sm border-0">
            <i class="bi bi-x-circle-fill fs-4 text-danger"></i>
            <div>
              <h6 class="fw-bold mb-1">Connection Error (${res.error || 'OFFLINE'})</h6>
              <p class="mb-1 small">${res.message}</p>
              <p class="mb-0 text-muted extra-small">Check physical network cable, ensure IP is reachable (try <code>ping ${ip}</code>), and verify Comm Key.</p>
            </div>
          </div>
        `;
      }
    }
  },

  async syncDeviceTime() {
    if (!confirm("Are you sure you want to synchronize the ZKTeco K40 device clock with your current PC time?")) {
      return;
    }

    const res = await this.apiRequest('api/device.php?action=set_time', 'POST');
    if (res.success) {
      this.showToast("Device clock synchronized successfully!", "success");
      setTimeout(() => window.location.reload(), 1000);
    } else {
      this.showToast(res.message || "Failed to set device time", "danger");
    }
  },

  playBeep() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = 880; // A5 tone
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {}
  }
};

window.App = App;
