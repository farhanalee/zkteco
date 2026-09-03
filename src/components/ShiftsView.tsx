import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  Sun,
  Moon,
  Plus,
  Trash2,
  Building2,
  Briefcase,
  Clock,
  Database,
  Server,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  UserPlus,
  UserMinus,
  Calendar,
  Edit2,
  Copy,
  AlertCircle,
  UserCog,
  CalendarX,
  RotateCcw
} from 'lucide-react';
import { Shift, Department, Designation, Employee, ShiftOverride } from '../types';

interface ShiftsViewProps {
  shifts: Shift[];
  departments: Department[];
  designations: Designation[];
  employees: Employee[];
  onAddShift: (shift: Shift) => void;
  onDeleteShift: (id: string) => void;
  temporaryOverrides?: ShiftOverride[];
  onAddOverride: (override: ShiftOverride) => void;
  onDeleteOverride: (index: number) => void;
}

export const ShiftsView: React.FC<ShiftsViewProps> = ({
  shifts,
  departments,
  designations,
  employees,
  onAddShift,
  onDeleteShift,
  temporaryOverrides = [],
  onAddOverride,
  onDeleteOverride,
}) => {
  const [activeTab, setActiveTab] = useState<'shifts' | 'depts' | 'desigs' | 'mdb' | 'overrides'>('shifts');

  // Department map for lookups
  const deptMap = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach((d) => map.set(String(d.id), d));
    return map;
  }, [departments]);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('19:00');
  const [grace, setGrace] = useState(15);
  const [lateThreshold, setLateThreshold] = useState(30);
  const [isNight, setIsNight] = useState(false);
  const [shiftType, setShiftType] = useState('12h');
  const [sundayIsHoliday, setSundayIsHoliday] = useState(true);
  const [sundayOvertimeEnabled, setSundayOvertimeEnabled] = useState(false);
  const [sundayOvertimeRate, setSundayOvertimeRate] = useState(2.0);

  // Temporary override form state
  const [overrideEmpId, setOverrideEmpId] = useState('');
  const [overrideShiftId, setOverrideShiftId] = useState('');
  const [overrideFromDate, setOverrideFromDate] = useState('');
  const [overrideToDate, setOverrideToDate] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const handleCreateShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newShift: Shift = {
      id: 'shift_' + Date.now(),
      name,
      start_time: startTime,
      end_time: endTime,
      grace_period_minutes: Number(grace),
      late_threshold_minutes: Number(lateThreshold),
      half_day_minutes: shiftType === '12h' ? 360 : 240,
      full_day_minutes: shiftType === '12h' ? 720 : 480,
      is_night_shift: isNight,
      is_default: false,
      shift_type: shiftType,
      sunday_is_holiday: sundayIsHoliday,
      sunday_overtime_enabled: sundayIsHoliday ? sundayOvertimeEnabled : false,
      sunday_overtime_rate: sundayOvertimeRate,
    };

    onAddShift(newShift);
    setName('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121212] p-6 rounded-2xl border border-[#262626] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarClock className="w-5 h-5 text-blue-400" />
            <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">Shifts & Organization</h1>
          </div>
          <p className="text-sm text-neutral-400">
            Define work hours, grace periods, departments & designations (stored in <code className="text-neutral-300">config/*.json</code>)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#262626] pb-1">
        <button
          onClick={() => setActiveTab('shifts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'shifts' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30' : 'text-neutral-400 hover:bg-[#181818] hover:text-neutral-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Shifts ({shifts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('depts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'depts' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30' : 'text-neutral-400 hover:bg-[#181818] hover:text-neutral-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Departments ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('desigs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'desigs' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30' : 'text-neutral-400 hover:bg-[#181818] hover:text-neutral-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Designations ({designations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('mdb')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'mdb' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30' : 'text-neutral-400 hover:bg-[#181818] hover:text-neutral-200'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Access MDB Schema (att2000.mdb)</span>
        </button>

        <button
          onClick={() => setActiveTab('overrides')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'overrides' ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30' : 'text-neutral-400 hover:bg-[#181818] hover:text-neutral-200'
          }`}
        >
          <UserCog className="w-4 h-4 text-purple-400" />
          <span>Temp Shift Overrides ({temporaryOverrides.length})</span>
        </button>
      </div>

      {/* Shift Tab */}
      {activeTab === 'shifts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shifts.map((shift) => (
              <div key={shift.id} className="bg-[#121212] p-5 rounded-2xl border border-[#262626] shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
                  <div className="flex items-center gap-2">
                    {shift.is_night_shift ? (
                      <Moon className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-400" />
                    )}
                    <h3 className="font-bold text-neutral-100 text-sm">{shift.name}</h3>
                  </div>
                  {shift.is_default && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
                      Default
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#171717] border border-[#262626] rounded-xl">
                    <span className="text-neutral-400 uppercase text-[10px] font-bold block">Start Time</span>
                    <span className="font-mono text-base font-bold text-emerald-400">{shift.start_time}</span>
                  </div>
                  <div className="p-3 bg-[#171717] border border-[#262626] rounded-xl">
                    <span className="text-neutral-400 uppercase text-[10px] font-bold block">End Time</span>
                    <span className="font-mono text-base font-bold text-rose-400">{shift.end_time}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-neutral-400">
                  <div className="flex justify-between">
                    <span>Grace Period:</span>
                    <span className="font-semibold text-neutral-200">{shift.grace_period_minutes} mins</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Late Threshold:</span>
                    <span className="font-semibold text-neutral-200">{shift.late_threshold_minutes} mins</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shift Type:</span>
                    <span className="font-semibold text-neutral-200 capitalize">{shift.shift_type || '12h'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday:</span>
                    <span className={`font-semibold ${shift.sunday_is_holiday ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {shift.sunday_is_holiday ? 'Holiday' : 'Working Day'}
                    </span>
                  </div>
                  {shift.sunday_is_holiday && shift.sunday_overtime_enabled && (
                    <div className="flex justify-between">
                      <span>Sunday OT:</span>
                      <span className="font-semibold text-amber-300">{shift.sunday_overtime_rate ?? 2.0}× Overtime</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => onDeleteShift(shift.id)}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Delete Shift"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Shift Form */}
          <div className="bg-[#121212] p-6 rounded-2xl border border-[#262626] shadow-xs max-w-xl">
            <h3 className="font-bold text-neutral-100 text-base mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Add Shift Definition</span>
            </h3>

            <form onSubmit={handleCreateShift} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Shift Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning Shift"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Start Time (24h)</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">End Time (24h)</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Shift Type</label>
                  <select
                    value={shiftType}
                    onChange={(e) => setShiftType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="12h">12-Hour (7-19 / 19-7)</option>
                    <option value="8h">8-Hour (9-17 / 21-5)</option>
                    <option value="office">Office (8:30-16:30)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    <input
                      type="checkbox"
                      checked={isNight}
                      onChange={(e) => setIsNight(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-neutral-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2">Night Shift</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Grace Period (Mins)</label>
                  <input
                    type="number"
                    value={grace}
                    onChange={(e) => setGrace(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Late Threshold (Mins)</label>
                  <input
                    type="number"
                    value={lateThreshold}
                    onChange={(e) => setLateThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Sunday / Holiday Settings */}
              <div className="p-4 bg-[#0e1a2a] border border-blue-500/20 rounded-xl space-y-3">
                <div className="text-xs font-bold text-blue-300 mb-2 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5" />
                  Sunday / Weekly Off Settings
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sundayIsHoliday}
                    onChange={(e) => {
                      setSundayIsHoliday(e.target.checked);
                      if (!e.target.checked) setSundayOvertimeEnabled(false);
                    }}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                  <span className="text-xs text-neutral-200 font-medium">Sunday is Weekly Holiday (Off Day)</span>
                </label>

                {sundayIsHoliday && (
                  <div className="ml-6 space-y-2 border-l-2 border-blue-500/30 pl-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sundayOvertimeEnabled}
                        onChange={(e) => setSundayOvertimeEnabled(e.target.checked)}
                        className="w-4 h-4 rounded accent-amber-400"
                      />
                      <span className="text-xs text-amber-300 font-medium">If employee works on Sunday → Count as Overtime</span>
                    </label>

                    {sundayOvertimeEnabled && (
                      <div>
                        <label className="block text-[11px] text-neutral-400 font-semibold mb-1">Overtime Rate Multiplier</label>
                        <select
                          value={sundayOvertimeRate}
                          onChange={(e) => setSundayOvertimeRate(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-[#171717] border border-amber-500/30 rounded-xl text-xs text-neutral-100 focus:outline-hidden"
                        >
                          <option value={1.5}>1.5× (Time & a Half)</option>
                          <option value={2.0}>2.0× (Double Pay — Standard Holiday OT)</option>
                          <option value={2.5}>2.5× (Triple Pay — Special Holiday)</option>
                        </select>
                        <p className="text-[10px] text-amber-400/70 mt-1">Sunday punch-in/out will auto-tag as Overtime-In / Overtime-Out.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-md shadow-blue-900/30 transition-all cursor-pointer"
              >
                Save Shift Schedule
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === 'depts' && (
        <div className="bg-[#121212] rounded-2xl border border-[#262626] shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#181818] text-neutral-400 font-semibold border-b border-[#262626]">
              <tr>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Department Name</th>
                <th className="py-3.5 px-4">Department Lead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f] font-medium">
              {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-[#181818]/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-400">{dept.code}</td>
                  <td className="py-3.5 px-4 font-semibold text-neutral-100">{dept.name}</td>
                  <td className="py-3.5 px-4 text-neutral-400 font-mono">{dept.manager}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Designations Tab */}
      {activeTab === 'desigs' && (
        <div className="bg-[#121212] rounded-2xl border border-[#262626] shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#181818] text-neutral-400 font-semibold border-b border-[#262626]">
              <tr>
                <th className="py-3.5 px-4">Job Title</th>
                <th className="py-3.5 px-4">Grade / Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f] font-medium">
              {designations.map((desig) => (
                <tr key={desig.id} className="hover:bg-[#181818]/60 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-neutral-100">{desig.title}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-[#1c1c1c] font-mono text-[11px] text-neutral-300 border border-[#2c2c2c]">
                      {desig.level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Access MDB Schema Tab */}
      {activeTab === 'mdb' && (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-[#121212] p-6 rounded-2xl border border-[#262626] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222]">
              <div>
                <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-400" />
                  <span>ZKTeco Access Database Architecture (att2000.mdb)</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Schema mapping for LRC Karachi Toll Operations attendance management system
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Schema Synced
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-[#171717] rounded-xl border border-[#262626]">
                <span className="text-[11px] text-neutral-400 font-semibold block">USERINFO</span>
                <span className="text-xl font-bold font-mono text-blue-400 mt-1 block">2,466</span>
                <span className="text-[10px] text-neutral-500 mt-0.5 block">Staff Profiles</span>
              </div>
              <div className="p-3 bg-[#171717] rounded-xl border border-[#262626]">
                <span className="text-[11px] text-neutral-400 font-semibold block">CHECKINOUT</span>
                <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">14,778</span>
                <span className="text-[10px] text-neutral-500 mt-0.5 block">Raw Punch Records</span>
              </div>
              <div className="p-3 bg-[#171717] rounded-xl border border-[#262626]">
                <span className="text-[11px] text-neutral-400 font-semibold block">DEPARTMENTS</span>
                <span className="text-xl font-bold font-mono text-purple-400 mt-1 block">13</span>
                <span className="text-[10px] text-neutral-500 mt-0.5 block">Toll Hierarchy Units</span>
              </div>
              <div className="p-3 bg-[#171717] rounded-xl border border-[#262626]">
                <span className="text-[11px] text-neutral-400 font-semibold block">TEMPLATE</span>
                <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">490</span>
                <span className="text-[10px] text-neutral-500 mt-0.5 block">Biometric Blobs</span>
              </div>
            </div>
          </div>

          {/* Tables Schema & Relations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#121212] p-5 rounded-2xl border border-[#262626] space-y-3">
              <h4 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Primary Entity Relationships</span>
              </h4>
              <div className="bg-[#171717] p-4 rounded-xl border border-[#262626] font-mono text-xs text-neutral-300 space-y-2 leading-relaxed">
                <div className="text-blue-400 font-bold">&bull; CHECKINOUT.USERID &rarr; USERINFO.USERID</div>
                <div className="text-purple-400 font-bold">&bull; USERINFO.DEFAULTDEPTID &rarr; DEPARTMENTS.DEPTID</div>
                <div className="text-amber-400 font-bold">&bull; TEMPLATE.USERID &rarr; USERINFO.USERID</div>
                <div className="text-emerald-400 font-bold">&bull; CHECKINOUT.SENSORID &rarr; Terminals (1, 2, 3)</div>
              </div>
              <p className="text-[11px] text-neutral-400">
                Punches are captured over raw UDP/TCP socket from 3 physical terminals at LRC Karachi and aggregated into <code className="text-neutral-300 font-mono">att2000.mdb</code>.
              </p>
            </div>

            <div className="bg-[#121212] p-5 rounded-2xl border border-[#262626] space-y-3">
              <h4 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Physical Machines Network Configuration</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-[#171717] rounded-xl border border-[#262626] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-neutral-200">Terminal 1: North Entry Plaza</div>
                    <div className="font-mono text-[11px] text-neutral-400">IP: 192.168.227.180 &bull; Port: 4370 &bull; SENSORID: 1</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">Online</span>
                </div>
                <div className="p-3 bg-[#171717] rounded-xl border border-[#262626] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-neutral-200">Terminal 2: South Exit Plaza</div>
                    <div className="font-mono text-[11px] text-neutral-400">IP: 192.168.227.181 &bull; Port: 4370 &bull; SENSORID: 2</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">Online</span>
                </div>
                <div className="p-3 bg-[#171717] rounded-xl border border-[#262626] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-neutral-200">Terminal 3: Admin Building</div>
                    <div className="font-mono text-[11px] text-neutral-400">IP: 192.168.227.182 &bull; Port: 4370 &bull; SENSORID: 3</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Temporary Shift Overrides Tab */}
      {activeTab === 'overrides' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-[#121212] p-5 rounded-2xl border border-purple-500/20 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-neutral-100 text-base">Temporary Shift Overrides</h3>
            </div>
            <p className="text-sm text-neutral-400">
              Assign a specific shift to an employee for a date range (e.g., temporary night shift, training period, leave coverage).
              Priority: <strong className="text-purple-400">Temporary Override</strong> → Permanent Assignment → Department Default → Auto-Detect
            </p>
          </div>

          {/* Active Overrides List */}
          <div className="bg-[#121212] rounded-2xl border border-[#262626] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#262626] bg-[#161616] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarX className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-neutral-100 text-sm">Active Temporary Overrides ({temporaryOverrides.length})</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181818] text-neutral-400 font-semibold border-b border-[#262626]">
                  <tr>
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Override Shift</th>
                    <th className="py-3.5 px-4">From Date</th>
                    <th className="py-3.5 px-4">To Date</th>
                    <th className="py-3.5 px-4">Days</th>
                    <th className="py-3.5 px-4">Reason</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f1f] font-medium">
                  {temporaryOverrides.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-neutral-500">
                        <CalendarX className="w-8 h-8 mx-auto mb-2 opacity-30 text-purple-400" />
                        <p className="text-sm font-medium">No temporary overrides configured</p>
                        <p className="text-xs text-neutral-500 mt-1">Add a temporary shift assignment using the form below</p>
                      </td>
                    </tr>
                  ) : (
                    temporaryOverrides.map((override, idx) => {
                      const emp = employees.find(e => String(e.user_id) === String(override.employee_id));
                      const empName = emp?.name || `EMP-${override.employee_id}`;
                      const empDept = emp ? deptMap?.get(String(emp.department_id)) : null;
                      const deptName = empDept?.name || 'Unknown';
                      const overrideShift = shifts.find(s => s.id === override.shift_id);
                      const shiftName = overrideShift?.name || 'Unknown Shift';
                      const fromDate = new Date(override.from_date);
                      const toDate = new Date(override.to_date);
                      const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                      return (
                        <tr key={idx} className="hover:bg-[#181818] transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-neutral-100">{empName}</td>
                          <td className="py-3.5 px-4 text-neutral-300 text-[11px]">{deptName}</td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                              overrideShift?.is_night_shift
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            } text-[10px] font-bold`}>
                              {overrideShift?.is_night_shift ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                              {shiftName}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-neutral-300">{override.from_date}</td>
                          <td className="py-3.5 px-4 font-mono text-neutral-300">{override.to_date}</td>
                          <td className="py-3.5 px-4 text-center font-mono text-neutral-200">{diffDays}</td>
                          <td className="py-3.5 px-4 text-neutral-400 text-[11px] max-w-xs truncate">{override.reason || '—'}</td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => onDeleteOverride?.(idx)}
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete Override"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Override Form */}
          <div className="bg-[#121212] p-6 rounded-2xl border border-purple-500/20 shadow-xs max-w-2xl">
            <h3 className="font-bold text-neutral-100 text-base mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-400" />
              <span>Create Temporary Shift Override</span>
            </h3>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!overrideEmpId || !overrideShiftId || !overrideFromDate || !overrideToDate) return;
              const newOverride: ShiftOverride = {
                employee_id: overrideEmpId,
                shift_id: overrideShiftId,
                from_date: overrideFromDate,
                to_date: overrideToDate,
                reason: overrideReason || undefined,
              };
              onAddOverride?.(newOverride);
              setOverrideEmpId('');
              setOverrideShiftId('');
              setOverrideFromDate('');
              setOverrideToDate('');
              setOverrideReason('');
            }} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Employee <span className="text-rose-400">*</span></label>
                <select
                  value={overrideEmpId}
                  onChange={(e) => setOverrideEmpId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.user_id} value={emp.user_id}>
                      EMP-{emp.user_id}: {emp.name} ({deptMap?.get(String(emp.department_id))?.name || 'No Dept'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Override Shift <span className="text-rose-400">*</span></label>
                <select
                  value={overrideShiftId}
                  onChange={(e) => setOverrideShiftId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="">Select Shift</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.is_night_shift ? '🌙 ' : '☀️ '} {s.name} ({s.start_time} - {s.end_time})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">From Date <span className="text-rose-400">*</span></label>
                  <input
                    type="date"
                    required
                    value={overrideFromDate}
                    onChange={(e) => setOverrideFromDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">To Date <span className="text-rose-400">*</span></label>
                  <input
                    type="date"
                    required
                    value={overrideToDate}
                    onChange={(e) => setOverrideToDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Training, Leave Coverage, Temporary Night Duty"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#171717] border border-[#2c2c2c] rounded-xl text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl shadow-md shadow-purple-900/30 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Apply Temporary Override
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};