import React, { useState } from 'react';
import { 
  Clock, 
  Search, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  Fingerprint, 
  RotateCcw,
  Upload,
  RefreshCw
} from 'lucide-react';
import { AttendanceRecord, Employee, ZKTecoDevice } from '../types';

interface RecordsViewProps {
  device: ZKTecoDevice;
  employees: Employee[];
  attendance: AttendanceRecord[];
  onOpenDownloadModal?: () => void;
}

export const RecordsView: React.FC<RecordsViewProps> = ({
  device,
  employees,
  attendance,
  onOpenDownloadModal,
}) => {
  const [fromDate, setFromDate] = useState('2026-08-01');
  const [toDate, setToDate] = useState('2026-09-01');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const empMap = new Map<string, string>();
  employees.forEach((e) => empMap.set(e.user_id, e.name));

  const filteredRecords = attendance.filter((punch) => {
    const d = punch.date;
    if (d < fromDate || d > toDate) return false;
    if (selectedUser && punch.user_id !== selectedUser) return false;
    if (selectedMachine !== 'all' && String(punch.sensor_id || 1) !== selectedMachine) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = empMap.get(punch.user_id)?.toLowerCase() || '';
      if (!punch.user_id.includes(q) && !name.includes(q) && !punch.status.toLowerCase().includes(q) && !(punch.sensor_name || '').toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const setPreset = (preset: 'aug17' | 'august' | 'all' | 'today') => {
    if (preset === 'aug17') {
      setFromDate('2026-08-17');
      setToDate('2026-08-17');
    } else if (preset === 'august') {
      setFromDate('2026-08-01');
      setToDate('2026-08-31');
    } else if (preset === 'all') {
      setFromDate('2026-08-01');
      setToDate('2026-09-01');
    } else if (preset === 'today') {
      const today = new Date().toISOString().split('T')[0];
      setFromDate(today);
      setToDate(today);
    }
  };

  const exportCSV = () => {
    const headers = ['Employee ID', 'Employee Name', 'Date', 'Time', 'Status', 'CheckType', 'Verification', 'Machine SENSORID', 'Hardware Terminal', 'Terminal IP'];
    const rows = filteredRecords.map((r) => [
      `EMP-${r.user_id}`,
      `"${empMap.get(r.user_id) || r.name || `EMP-${r.user_id}`}"`,
      r.date,
      r.time,
      r.status,
      r.check_type || (r.status === 'Check-In' ? 'I' : 'O'),
      r.verification_type,
      r.sensor_id || 1,
      `"${r.sensor_name || 'Terminal 1 - Karachi North Entry Plaza'}"`,
      r.device_ip || device.ip_address,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ZKTeco_LRC_Karachi_Attendance_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121212] p-6 rounded-2xl border border-[#262626] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-blue-400" />
            <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">Attendance Records</h1>
          </div>
          <p className="text-sm text-neutral-400">
            Raw punch records (CHECKINOUT) from 3 ZKTeco K40 terminals &bull; LRC Karachi Toll Operations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenDownloadModal && (
            <button
              onClick={onOpenDownloadModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-blue-900/30 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Logs from Machine</span>
            </button>
          )}
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#1c1c1c] hover:bg-[#282828] text-neutral-200 text-xs sm:text-sm font-medium rounded-xl border border-[#303030] transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#121212] p-5 rounded-2xl border border-[#262626] shadow-xs space-y-4">
        {/* Quick Date Range Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#222222]">
          <span className="text-xs font-semibold text-neutral-400">Quick Date Presets:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setPreset('aug17')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                fromDate === '2026-08-17' && toDate === '2026-08-17'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                  : 'bg-[#1c1c1c] text-neutral-300 hover:bg-[#282828] border-[#303030]'
              }`}
            >
              2026-08-17 (Aug 17)
            </button>
            <button
              onClick={() => setPreset('august')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                fromDate === '2026-08-01' && toDate === '2026-08-31'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                  : 'bg-[#1c1c1c] text-neutral-300 hover:bg-[#282828] border-[#303030]'
              }`}
            >
              Full August 2026
            </button>
            <button
              onClick={() => setPreset('all')}
              className="px-3 py-1 text-xs font-medium bg-[#1c1c1c] text-neutral-300 hover:bg-[#282828] border border-[#303030] rounded-lg transition-colors cursor-pointer"
            >
              All Records
            </button>
            <button
              onClick={() => setPreset('today')}
              className="px-3 py-1 text-xs font-medium bg-[#1c1c1c] text-neutral-300 hover:bg-[#282828] border border-[#303030] rounded-lg transition-colors cursor-pointer"
            >
              Latest Punches
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-neutral-300 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-300 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-300 mb-1">Hardware Terminal</label>
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="w-full px-3 py-2 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="all" className="bg-[#171717] text-neutral-100">All 3 Terminals</option>
              <option value="1" className="bg-[#171717] text-neutral-100">Terminal 1 - North Entry (192.168.227.180)</option>
              <option value="2" className="bg-[#171717] text-neutral-100">Terminal 2 - South Exit (192.168.227.181)</option>
              <option value="3" className="bg-[#171717] text-neutral-100">Terminal 3 - Admin Bldg (192.168.227.182)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-neutral-300 mb-1">Filter Employee</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="" className="bg-[#171717] text-neutral-100">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.user_id} value={emp.user_id} className="bg-[#171717] text-neutral-100">
                  EMP-{emp.user_id} - {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-neutral-300 mb-1">Search Keywords</label>
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ID, name, machine..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#121212] rounded-2xl border border-[#262626] shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#222222] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="font-bold text-neutral-100 text-sm flex items-center gap-2">
            <span>Biometric Punch Logs ({filteredRecords.length} entries)</span>
            {fromDate === '2026-08-17' && toDate === '2026-08-17' && (
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
                Showing 2026-08-17 Complete Punches
              </span>
            )}
          </h3>
          <span className="text-xs text-neutral-400 font-mono">
            Date Range: {fromDate} &rarr; {toDate}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#181818] text-neutral-400 font-semibold border-b border-[#262626]">
              <tr>
                <th className="py-3.5 px-4">Employee ID</th>
                <th className="py-3.5 px-4">Employee Name</th>
                <th className="py-3.5 px-4">Punch Date</th>
                <th className="py-3.5 px-4">Punch Time</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Verification</th>
                <th className="py-3.5 px-4">Terminal & Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f] font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-neutral-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No attendance records found for this filter range.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((punch) => {
                  const empName = empMap.get(punch.user_id) || punch.name || `EMP-${punch.user_id}`;
                  const isCheckIn = punch.status === 'Check-In';
                  return (
                    <tr key={punch.id} className="hover:bg-[#181818]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-neutral-200">EMP-{punch.user_id}</td>
                      <td className="py-3.5 px-4 font-semibold text-blue-400">{empName}</td>
                      <td className="py-3.5 px-4 text-neutral-300 font-mono">{punch.date}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-neutral-100">{punch.time}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            isCheckIn
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}
                        >
                          {punch.status} ({punch.check_type || (isCheckIn ? 'I' : 'O')})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-300">
                        <span className="flex items-center gap-1.5">
                          <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
                          {punch.verification_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-neutral-300 font-medium text-[11px]">
                          {punch.sensor_name || `Terminal ${punch.sensor_id || 1}`}
                        </div>
                        <div className="text-neutral-500 font-mono text-[10px]">
                          {punch.device_ip || device.ip_address} &bull; SENSORID: {punch.sensor_id || 1}
                        </div>
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
  );
};
