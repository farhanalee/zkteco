import React from 'react';
import { 
  Router, 
  Users, 
  Clock, 
  Database, 
  Radio, 
  Sliders, 
  ArrowUpRight, 
  CheckCircle, 
  AlertTriangle, 
  Cpu, 
  HardDrive, 
  Fingerprint, 
  Calendar,
  Download,
  Upload,
  Server
} from 'lucide-react';
import { ZKTecoDevice, Employee, AttendanceRecord } from '../types';

interface DashboardViewProps {
  device: ZKTecoDevice;
  employees: Employee[];
  attendance: AttendanceRecord[];
  onNavigate: (tab: string) => void;
  onSyncTime: () => void;
  onTestConnection: () => void;
  onOpenDownloadModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  device,
  employees,
  attendance,
  onNavigate,
  onSyncTime,
  onTestConnection,
  onOpenDownloadModal,
}) => {
  const isConnected = device.status === 'Connected';
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPunches = attendance.filter((a) => a.date === todayStr);
  const recentPunches = attendance.slice(0, 7);

  const empMap = new Map<string, string>();
  employees.forEach((e) => empMap.set(e.user_id, e.name));

  const userCapPct = Math.min(Math.round((employees.length / (device.user_capacity || 1000)) * 100), 100);
  const logCapPct = Math.min(Math.round((attendance.length / (device.attendance_capacity || 80000)) * 100), 100);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121212] p-6 rounded-2xl border border-[#262626] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">Terminal Dashboard</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#1c1c1c] text-neutral-300 border border-[#333333]">
              K40 Biometric Hardware
            </span>
          </div>
          <p className="text-sm text-neutral-400">
            Real-time TCP/IP telemetry & attendance logs with automatic Local PC storage persistence
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenDownloadModal && (
            <button
              onClick={onOpenDownloadModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-900/30 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Download Logs from Machine</span>
            </button>
          )}
          <button
            onClick={() => onNavigate('live')}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#1c1c1c] hover:bg-[#262626] text-neutral-200 text-sm font-semibold rounded-xl border border-[#303030] transition-all cursor-pointer"
          >
            <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Live Stream</span>
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#1c1c1c] hover:bg-[#262626] text-neutral-300 text-sm font-medium rounded-xl border border-[#303030] transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-neutral-400" />
            <span>Reports & PDF</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Connection Status */}
        <div className="bg-[#121212] p-5 rounded-2xl border border-[#262626] shadow-xs hover:border-[#383838] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Device Link</span>
            <div className={`p-2 rounded-xl ${isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
              <Router className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-2xl font-bold ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isConnected ? 'Connected' : 'Offline'}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span>{device.ip_address}:{device.port}</span>
            <span className="text-neutral-500">Port 4370</span>
          </div>
        </div>

        {/* Card 2: Enrolled Users */}
        <div className="bg-[#121212] p-5 rounded-2xl border border-[#262626] shadow-xs hover:border-[#383838] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Enrolled Staff</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-100">
            {employees.length}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
            <span>Capacity: {device.user_capacity.toLocaleString()}</span>
            <span className="font-semibold text-blue-400">{userCapPct}% full</span>
          </div>
        </div>

        {/* Card 3: Today's Attendance */}
        <div className="bg-[#121212] p-5 rounded-2xl border border-[#262626] shadow-xs hover:border-[#383838] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Today's Punches</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {todayPunches.length}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
            <span>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <span className="font-semibold text-emerald-400">Live Active</span>
          </div>
        </div>

        {/* Card 4: Total Flash Logs */}
        <div className="bg-[#121212] p-5 rounded-2xl border border-[#262626] shadow-xs hover:border-[#383838] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">K40 Stored Logs</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-100">
            {attendance.length.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
            <span>Flash Limit: {device.attendance_capacity.toLocaleString()}</span>
            <span className="text-indigo-400 font-semibold">{logCapPct}%</span>
          </div>
        </div>
      </div>

      {/* Hardware Telemetry & Recent Activity Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Cols: Hardware Diagnostics */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#121212] p-5 rounded-2xl border border-[#262626] shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-neutral-100 text-sm">K40 Hardware Telemetry</h3>
              </div>
              <button
                onClick={onSyncTime}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
              >
                Sync Clock
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#1c1c1c]">
                <span className="text-neutral-500">Terminal Model</span>
                <span className="font-semibold text-neutral-200">{device.name}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1c1c1c]">
                <span className="text-neutral-500">Serial Number</span>
                <span className="font-mono font-medium text-neutral-200">{device.serial_number}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1c1c1c]">
                <span className="text-neutral-500">Firmware Release</span>
                <span className="font-semibold text-neutral-200">{device.firmware_version}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1c1c1c]">
                <span className="text-neutral-500">Platform SoC</span>
                <span className="font-semibold text-neutral-200">{device.platform}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1c1c1c]">
                <span className="text-neutral-500">MAC Address</span>
                <span className="font-mono font-medium text-neutral-200">{device.mac_address}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-neutral-500">Device Hardware RTC</span>
                <span className="font-mono font-bold text-blue-400">{device.device_time}</span>
              </div>
            </div>
          </div>

          {/* Flash Storage Utilization */}
          <div className="bg-[#121212] p-5 rounded-2xl border border-[#262626] shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-[#222222] mb-4">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-neutral-100 text-sm">Flash Memory Allocation</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between font-semibold mb-1.5 text-neutral-300">
                  <span>Enrolled Biometric Templates</span>
                  <span>{employees.length} / {device.user_capacity} ({userCapPct}%)</span>
                </div>
                <div className="w-full bg-[#1c1c1c] rounded-full h-2 overflow-hidden border border-[#2a2a2a]">
                  <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${userCapPct}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1.5 text-neutral-300">
                  <span>Attendance Flash Memory</span>
                  <span>{attendance.length} / {device.attendance_capacity} ({logCapPct}%)</span>
                </div>
                <div className="w-full bg-[#1c1c1c] rounded-full h-2 overflow-hidden border border-[#2a2a2a]">
                  <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${logCapPct}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Recent Punches */}
        <div className="lg:col-span-7">
          <div className="bg-[#121212] rounded-2xl border border-[#262626] shadow-xs overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-[#222222] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-neutral-100 text-sm">Recent Biometric Punches</h3>
              </div>
              <button
                onClick={() => onNavigate('records')}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View Full Log</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181818] text-neutral-400 font-semibold border-b border-[#262626]">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Punch Time</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f1f]">
                  {recentPunches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-neutral-500">
                        No punch logs retrieved yet. Connect device or poll logs.
                      </td>
                    </tr>
                  ) : (
                    recentPunches.map((punch) => {
                      const empName = empMap.get(punch.user_id) || `EMP-${punch.user_id}`;
                      const isCheckIn = punch.status === 'Check-In';
                      return (
                        <tr key={punch.id} className="hover:bg-[#181818]/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-neutral-100">{empName}</div>
                            <div className="font-mono text-[11px] text-neutral-500">ID: {punch.user_id}</div>
                          </td>
                          <td className="py-3 px-3 text-neutral-400">{punch.date}</td>
                          <td className="py-3 px-3 font-mono font-bold text-blue-400">{punch.time}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                                isCheckIn
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              }`}
                            >
                              {punch.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-neutral-400">
                            <span className="flex items-center gap-1.5">
                              <Fingerprint className="w-3.5 h-3.5 text-neutral-500" />
                              {punch.verification_type}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
