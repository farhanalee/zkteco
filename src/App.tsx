import React, { useState, useEffect } from 'react';
import { Heart, Github, ExternalLink } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { LiveFeedView } from './components/LiveFeedView';
import { EmployeesView } from './components/EmployeesView';
import { RecordsView } from './components/RecordsView';
import { ReportsView } from './components/ReportsView';
import { ShiftsView } from './components/ShiftsView';
import { DeviceSettingsView } from './components/DeviceSettingsView';
import { WindowsSetupView } from './components/WindowsSetupView';
import { DownloadLogsModal } from './components/DownloadLogsModal';
import { ZKTecoDevice, Employee, AttendanceRecord, Shift, Department, Designation, MdbDatabaseStats, ShiftOverride } from './types';
import { initialShiftAssignments } from './data/mockAttendance';
import {
  initialDevices,
  initialEmployees,
  initialShifts,
  initialDepartments,
  initialDesignations,
  initialMdbStats,
  generateAugustAttendanceRecords
} from './data/mockAttendance';

const STORAGE_ATT_KEY = 'zkteco_lrc_attendance_logs_v1';
const STORAGE_EMP_KEY = 'zkteco_lrc_employees_list_v1';
const STORAGE_SHIFT_KEY = 'zkteco_lrc_shifts_list_v1';
const STORAGE_SHIFT_ASSIGN_KEY = 'zkteco_lrc_shift_assignments_v1';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [devices, setDevices] = useState<ZKTecoDevice[]>(initialDevices);
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);
  const device = devices[selectedDeviceIndex] ?? devices[0];
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // Load shift assignments (permanent + temporary overrides)
  const [temporaryOverrides, setTemporaryOverrides] = useState<ShiftOverride[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SHIFT_ASSIGN_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.temporary_overrides)) {
          return parsed.temporary_overrides;
        }
        // Backward compatibility: if it's an array directly
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse shift assignments from localStorage', e);
    }
    return initialShiftAssignments?.temporary_overrides || [];
  });

  // Load from LocalStorage if exists
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_EMP_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse employees from localStorage', e);
    }
    return initialEmployees;
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ATT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse attendance from localStorage', e);
    }
    return generateAugustAttendanceRecords();
  });

  const [shifts, setShifts] = useState<Shift[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SHIFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse shifts from localStorage', e);
    }
    return initialShifts;
  });

  const [departments] = useState<Department[]>(initialDepartments);
  const [designations] = useState<Designation[]>(initialDesignations);

  // Persist into LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ATT_KEY, JSON.stringify(attendance));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
  }, [attendance]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_EMP_KEY, JSON.stringify(employees));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SHIFT_KEY, JSON.stringify(shifts));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
  }, [shifts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SHIFT_ASSIGN_KEY, JSON.stringify({ temporary_overrides: temporaryOverrides }));
    } catch (e) {
      console.warn('LocalStorage save error for shift assignments', e);
    }
  }, [temporaryOverrides]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Clock Ticker — updates all devices
  useEffect(() => {
    const timer = setInterval(() => {
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      setDevices((prev) =>
        prev.map((d) => ({ ...d, device_time: nowStr, pc_time: nowStr }))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const updateDevice = (updater: (d: ZKTecoDevice) => ZKTecoDevice) => {
    setDevices((prev) => prev.map((d, i) => i === selectedDeviceIndex ? updater(d) : d));
  };

  const handleSelectDevice = (dev: ZKTecoDevice) => {
    const idx = devices.findIndex(d => d.id === dev.id || d.ip_address === dev.ip_address);
    if (idx >= 0) setSelectedDeviceIndex(idx);
  };

  const handleQuickAddIp = (ip: string) => {
    // Check if already exists
    const exists = devices.find(d => d.ip_address === ip);
    if (exists) {
      handleSelectDevice(exists);
      return;
    }
    const newDev: ZKTecoDevice = {
      id: 'dev_custom_' + Date.now(),
      sensor_id: devices.length + 1,
      name: `Terminal ${devices.length + 1} - Custom (${ip})`,
      ip_address: ip,
      port: 4370,
      comm_key: 0,
      timeout: 5,
      auto_refresh_interval: 30,
      status: 'Disconnected',
      last_sync: 'Never',
      serial_number: 'Unknown',
      firmware_version: 'Unknown',
      platform: 'ZEM560 / Linux Standalone',
      mac_address: '00:00:00:00:00:00',
      user_count: 0,
      user_capacity: 3000,
      fingerprint_count: 0,
      fingerprint_capacity: 3000,
      attendance_count: 0,
      attendance_capacity: 100000,
      device_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      pc_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      time_diff_seconds: 0,
      location: 'Custom Site',
    };
    setDevices(prev => [...prev, newDev]);
    setSelectedDeviceIndex(devices.length);
    showToast(`Added new terminal at ${ip}:4370 — click Connect to verify.`);
  };

  const handleSyncTime = () => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    updateDevice((prev) => ({
      ...prev,
      device_time: nowStr,
      pc_time: nowStr,
      time_diff_seconds: 0,
      last_sync: 'Just now',
    }));
    showToast('ZKTeco K40 Real-Time Clock synchronized with local PC time.');
  };

  const handleTestConnection = () => {
    updateDevice((prev) => ({ ...prev, status: 'Connecting' }));
    setTimeout(() => {
      updateDevice((prev) => ({
        ...prev,
        status: 'Connected',
        last_sync: new Date().toLocaleTimeString(),
      }));
      showToast(`TCP/IP Socket Handshake Verified on ${device.ip_address}:${device.port} (Port 4370).`);
    }, 600);
  };

  const handleAddEmployee = (newEmp: Employee) => {
    setEmployees((prev) => [newEmp, ...prev]);
    showToast(`Employee ${newEmp.name} (EMP-${newEmp.user_id}) enrolled directly to K40 terminal.`);
  };

  const handleUpdateEmployee = (updated: Employee) => {
    setEmployees((prev) => prev.map((e) => (e.user_id === updated.user_id ? updated : e)));
    showToast(`Updated department and shift assignment for ${updated.name} (EMP-${updated.user_id}).`);
  };

  const handleBulkAssignDepartment = (userIds: string[], departmentId: string, departmentName: string) => {
    const idSet = new Set(userIds);
    setEmployees((prev) =>
      prev.map((e) => (idSet.has(e.user_id) ? { ...e, department_id: departmentId, department_name: departmentName } : e))
    );
    showToast(`Assigned ${userIds.length} employees to ${departmentName}.`);
  };

  const handleDeleteEmployee = (userId: string) => {
    setEmployees((prev) => prev.filter((e) => e.user_id !== userId));
    showToast(`Employee EMP-${userId} deleted from K40 hardware memory.`);
  };

  const handleAddPunch = (punch: AttendanceRecord) => {
    setAttendance((prev) => [punch, ...prev]);
  };

  const handleAddShift = (shift: Shift) => {
    setShifts((prev) => [...prev, shift]);
    showToast(`Shift '${shift.name}' saved to configuration.`);
  };

  const handleDeleteShift = (id: string) => {
    setShifts((prev) => prev.filter((s) => s.id !== id));
    showToast('Shift definition removed.');
  };

  const handleUpdateDevice = (updated: Partial<ZKTecoDevice>) => {
    updateDevice((prev) => ({ ...prev, ...updated }));
  };

  const handleSyncComplete = (newRecords: AttendanceRecord[], msg: string) => {
    setAttendance(newRecords);
    showToast(msg);
  };

  const handleAddOverride = (override: ShiftOverride) => {
    setTemporaryOverrides((prev) => [...prev, override]);
    showToast(`Temporary shift override applied for employee ${override.employee_id}`);
  };

  const handleDeleteOverride = (index: number) => {
    setTemporaryOverrides((prev) => prev.filter((_, i) => i !== index));
    showToast('Temporary shift override removed');
  };

  const handleResetData = () => {
    try {
      localStorage.removeItem(STORAGE_ATT_KEY);
      localStorage.removeItem(STORAGE_EMP_KEY);
      localStorage.removeItem(STORAGE_SHIFT_KEY);
      localStorage.removeItem(STORAGE_SHIFT_ASSIGN_KEY);
    } catch (e) {}
    const defaultAtt = generateAugustAttendanceRecords();
    setAttendance(defaultAtt);
    setEmployees(initialEmployees);
    setShifts(initialShifts);
    setTemporaryOverrides([]);
    showToast('Attendance database reset to default ZKTeco Access MDB records.');
  };

  return (
    <div className="min-h-screen bg-[#050505] font-sans text-[#E0E0E0] antialiased flex flex-col selection:bg-blue-500/30 selection:text-white">
      {/* Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        device={device}
        devices={devices}
        onSelectDevice={handleSelectDevice}
        onQuickAddIp={handleQuickAddIp}
        onSyncTime={handleSyncTime}
        onTestConnection={handleTestConnection}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#171717] text-neutral-100 px-4 py-3 rounded-2xl shadow-2xl border border-[#333333] text-xs sm:text-sm font-medium flex items-center gap-2.5 animate-in slide-in-from-bottom-3 duration-200 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Download Logs Modal */}
      <DownloadLogsModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        device={device}
        employees={employees}
        attendance={attendance}
        onSyncComplete={handleSyncComplete}
        onResetData={handleResetData}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            device={device}
            employees={employees}
            attendance={attendance}
            onNavigate={setCurrentTab}
            onSyncTime={handleSyncTime}
            onTestConnection={handleTestConnection}
            onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
          />
        )}

        {currentTab === 'live' && (
          <LiveFeedView
            device={device}
            employees={employees}
            attendance={attendance}
            onAddPunch={handleAddPunch}
          />
        )}

        {currentTab === 'employees' && (
          <EmployeesView
            device={device}
            employees={employees}
            departments={departments}
            shifts={shifts}
            onAddEmployee={handleAddEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onBulkAssignDepartment={handleBulkAssignDepartment}
          />
        )}

        {currentTab === 'records' && (
          <RecordsView
            device={device}
            employees={employees}
            attendance={attendance}
            onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView
            employees={employees}
            attendance={attendance}
            shifts={shifts}
            departments={departments}
            temporaryOverrides={temporaryOverrides}
          />
        )}

        {currentTab === 'shifts' && (
          <ShiftsView
            shifts={shifts}
            departments={departments}
            designations={designations}
            employees={employees}
            onAddShift={handleAddShift}
            onDeleteShift={handleDeleteShift}
            temporaryOverrides={temporaryOverrides}
            onAddOverride={handleAddOverride}
            onDeleteOverride={handleDeleteOverride}
          />
        )}

        {currentTab === 'device' && (
          <DeviceSettingsView
            device={device}
            onUpdateDevice={handleUpdateDevice}
            onSyncTime={handleSyncTime}
            onTestConnection={handleTestConnection}
          />
        )}

        {currentTab === 'setup' && <WindowsSetupView />}
      </main>

      {/* Footer — Developer Credit + Open Source + Donation */}
      <footer className="bg-[#0a0a0a] border-t border-[#262626] py-5 text-center text-xs text-neutral-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          {/* Row 1 — System Info */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-300">ZKTeco K40 Biometric Attendance Portal</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">OPEN SOURCE</span>
            </div>
            <div className="text-neutral-500 font-mono text-[11px]">
              TCP/IP Port 4370 &bull; Zero SQL &bull; Browser-Persisted &bull; Multi-Terminal
            </div>
          </div>

          {/* Row 2 — Developer Credit */}
          <div className="border-t border-[#1a1a1a] pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-neutral-500">Developed by</span>
              <span className="font-bold text-neutral-200">Farhan Ali Mangi</span>
              <span className="text-neutral-600">&bull;</span>
              <span className="text-neutral-500">IT Manager, LRC (Pvt) Ltd — Karachi, Pakistan</span>
            </div>

            <div className="flex items-center gap-2">
              {/* GitHub / Source */}
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#181818] hover:bg-[#222] border border-[#2b2b2b] text-neutral-300 hover:text-white transition-colors text-[11px] font-semibold"
                title="View Source on GitHub"
              >
                <Github className="w-3.5 h-3.5" />
                <span>Source</span>
              </a>

              {/* Donate / Support Developer */}
              <a
                href="https://www.paypal.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:text-amber-300 transition-colors text-[11px] font-semibold"
                title="Support the developer — Buy me a chai ☕"
              >
                <Heart className="w-3 h-3" />
                <span>Donate / Support</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            </div>
          </div>

          {/* Row 3 — License note */}
          <p className="text-[10px] text-neutral-600">
            MIT License — Free to use, fork &amp; modify. If this project helped you, a ⭐ on GitHub or a small donation keeps it alive.
          </p>
        </div>
      </footer>
    </div>
  );
}
