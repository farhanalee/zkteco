import React, { useState, useMemo } from 'react';
import {
  FileText,
  Calendar,
  User,
  Clock,
  UserX,
  Printer,
  CheckCircle2,
  CalendarRange,
  FileDown,
  Sun,
  Moon,
  Users,
  Search,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Filter,
  Building2,
  Zap,
  Flame,
  ChevronDown,
  ChevronRight,
  Layers,
  Award,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { AttendanceRecord, Employee, Shift, Department, ZKTecoDevice, ShiftOverride } from '../types';
import { generateOfficialPDF, formatMinutes } from '../utils/pdfGenerator';
import { calculateAttendanceMetrics, autoDetectShift } from '../utils/shiftDeduction';

interface ReportsViewProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  shifts: Shift[];
  departments?: Department[];
  device?: ZKTecoDevice;
  temporaryOverrides?: ShiftOverride[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  employees,
  attendance,
  shifts,
  departments = [],
  device,
  temporaryOverrides = [],
}) => {
  const [activeReportTab, setActiveReportTab] = useState<
    'summary' | 'range' | 'overtime' | 'department' | 'employee' | 'daily' | 'late' | 'absent'
  >('overtime');

  // Dynamic min and max dates from records
  const { minDate, maxDate, availableDates } = useMemo(() => {
    const dates = Array.from(new Set(attendance.map((a) => a.date).filter(Boolean))).sort();
    return {
      minDate: dates[0] || '2026-08-01',
      maxDate: dates[dates.length - 1] || '2026-09-01',
      availableDates: dates
    };
  }, [attendance]);

  // Date states
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-09-01');
  const [selectedDate, setSelectedDate] = useState(maxDate || '2026-08-01');
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.user_id || '1001');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');

  // Additional Filter states
  const [filterEmpId, setFilterEmpId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMinOt, setFilterMinOt] = useState<string>('all'); // 'all', 'ot_only', 'gt_1', 'gt_2'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null);

  const empMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((e) => map.set(String(e.user_id).trim(), e));
    return map;
  }, [employees]);

  const deptMap = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach((d) => map.set(String(d.id), d));
    return map;
  }, [departments]);

  // Convert temporaryOverrides array to Map for O(1) lookup
  const tempOverridesMap = useMemo(() => {
    const map = new Map<string, { shiftId: string; fromDate: string; toDate: string }>();
    temporaryOverrides.forEach((override) => {
      map.set(String(override.employee_id), {
        shiftId: override.shift_id,
        fromDate: override.from_date,
        toDate: override.to_date
      });
    });
    return map;
  }, [temporaryOverrides]);

  // Helper to get assigned shift name for an employee (for display in consolidated report)
  const getAssignedShiftName = (emp: Employee) => {
    if (!emp.shift_id) return '—';
    const assignedShift = shifts.find(s => s.id === emp.shift_id);
    return assignedShift ? assignedShift.name : '—';
  };

  // Helper quick date presets
  const setPreset = (preset: 'all' | 'august' | 'today' | 'last7') => {
    if (preset === 'all') {
      setStartDate(minDate || '2026-08-01');
      setEndDate(maxDate || '2026-09-01');
    } else if (preset === 'august') {
      setStartDate('2026-08-01');
      setEndDate('2026-08-31');
      setSelectedDate('2026-08-01');
    } else if (preset === 'today') {
      const t = maxDate || new Date().toISOString().split('T')[0];
      setStartDate(t);
      setEndDate(t);
      setSelectedDate(t);
    } else if (preset === 'last7') {
      setStartDate('2026-08-25');
      setEndDate('2026-08-31');
    }
  };

  // 1. Staff Overview Matrix - Auto-detect shift per day
  const staffSummary = useMemo(() => {
    const filteredAttendance = attendance.filter((a) => {
      if (startDate && a.date < startDate) return false;
      if (endDate && a.date > endDate) return false;
      return true;
    });

    return employees
      .filter((emp) => {
        if (selectedDeptFilter !== 'all' && String(emp.department_id) !== selectedDeptFilter) return false;
        return true;
      })
      .map((emp) => {
        const empIdStr = String(emp.user_id).trim();
        const empPunches = filteredAttendance.filter((p) => String(p.user_id).trim() === empIdStr);

        // Group by date
        const dateMap = new Map<string, AttendanceRecord[]>();
        empPunches.forEach((p) => {
          const list = dateMap.get(p.date) || [];
          list.push(p);
          dateMap.set(p.date, list);
        });

        let presentDays = 0;
        let lateDays = 0;
        let totalHours = 0;
        let totalOtHours = 0;
        let dayShiftCount = 0;
        let nightShiftCount = 0;
        let officeShiftCount = 0;

        dateMap.forEach((punches, d) => {
          punches.sort((a, b) => a.time.localeCompare(b.time));
          const firstIn = punches[0]?.time || '--:--';
          const lastOut = punches.length > 1 ? punches[punches.length - 1].time : '--:--';

          // Auto-detect shift for each day based on punch-in time
          const metrics = calculateAttendanceMetrics(firstIn, lastOut, 'auto', d, shifts, emp.department_id, emp, tempOverridesMap, departments);

          if (firstIn && firstIn !== '--:--') presentDays++;
          if (metrics.isLate) lateDays++;
          totalHours += metrics.hoursWorked;
          totalOtHours += metrics.overtimeHours;

          // Count shift types
          if (metrics.detectedShift.shift_type === '12h' && !metrics.detectedShift.is_night_shift) dayShiftCount++;
          else if (metrics.detectedShift.shift_type === '12h' && metrics.detectedShift.is_night_shift) nightShiftCount++;
          else if (metrics.detectedShift.shift_type === '8h' && !metrics.detectedShift.is_night_shift) dayShiftCount++;
          else if (metrics.detectedShift.shift_type === '8h' && metrics.detectedShift.is_night_shift) nightShiftCount++;
          else if (metrics.detectedShift.shift_type === 'office') officeShiftCount++;
        });

        const avgHours = presentDays > 0 ? (totalHours / presentDays).toFixed(1) : '0';
        const complianceRate = presentDays > 0 ? Math.min(100, Math.round((presentDays / 26) * 100)) : 0;
        const deptObj = deptMap.get(String(emp.department_id));
        const assignedShiftName = getAssignedShiftName(emp);

        // Build shift summary for display
        const shiftSummary = [];
        if (dayShiftCount > 0) shiftSummary.push(`${dayShiftCount} Day`);
        if (nightShiftCount > 0) shiftSummary.push(`${nightShiftCount} Night`);
        if (officeShiftCount > 0) shiftSummary.push(`${officeShiftCount} Office`);

        return {
          userId: emp.user_id,
          name: emp.name,
          departmentId: emp.department_id,
          departmentName: deptObj?.name || emp.department_name || 'Plaza Operations',
          privilege: emp.privilege_name || 'User',
          cardNumber: emp.card_number,
          totalPunches: empPunches.length,
          presentDays,
          lateDays,
          totalHours: Math.round(totalHours * 10) / 10,
          totalOtHours: Math.round(totalOtHours * 10) / 10,
          avgHours,
          complianceRate,
          assignedShiftName,
          detectedShiftName: shiftSummary.join(', ') || '—'
        };
      });
  }, [employees, attendance, startDate, endDate, selectedDeptFilter, deptMap, shifts, tempOverridesMap]);

  // 2. Date Range Master Calculation with Auto Shift Detection per Day
  const rangeRows = useMemo(() => {
    const rangePunches = attendance.filter((a) => {
      if (startDate && a.date < startDate) return false;
      if (endDate && a.date > endDate) return false;
      if (filterEmpId !== 'all' && String(a.user_id).trim() !== filterEmpId) return false;
      return true;
    });

    const rangeUserDateMap = new Map<string, AttendanceRecord[]>();
    rangePunches.forEach((p) => {
      const uid = String(p.user_id).trim();
      const key = `${p.date}_${uid}`;
      const list = rangeUserDateMap.get(key) || [];
      list.push(p);
      rangeUserDateMap.set(key, list);
    });

    const rows: Array<{
      date: string;
      userId: string;
      name: string;
      departmentName: string;
      departmentId: string;
      firstIn: string;
      lastOut: string;
      duration: string;
      hours: number;
      standardHours: number;
      overtimeHours: number;
      overtimeStr: string;
      detectedShiftName: string;
      isNightShift: boolean;
      punchesCount: number;
      status: 'Present' | 'Single Punch' | 'Late' | 'Overtime' | 'Absent';
      isLate: boolean;
      lateMinutes: number;
    }> = [];

    Array.from(rangeUserDateMap.keys()).sort().reverse().forEach((key) => {
      const [d, uid] = key.split('_');
      const punches = rangeUserDateMap.get(key) || [];
      punches.sort((a, b) => a.time.localeCompare(b.time));

      const emp = empMap.get(uid);
      const deptId = emp?.department_id || '1';
      const deptObj = deptMap.get(String(deptId));
      const deptName = deptObj?.name || emp?.department_name || 'Plaza Operations';

      // Department Filter
      if (selectedDeptFilter !== 'all' && String(deptId) !== selectedDeptFilter) {
        return;
      }

      const firstIn = punches[0].time;
      const lastOut = punches.length > 1 ? punches[punches.length - 1].time : '--:--';

      // Auto-detect shift for EACH day based on punch-in time
      const metrics = calculateAttendanceMetrics(firstIn, lastOut, 'auto', d, shifts, deptId, emp, tempOverridesMap, departments);
      const empName = emp?.name || punches[0]?.name || `EMP-${uid}`;

      // Status filter
      if (filterStatus !== 'all') {
        if (filterStatus === 'Late' && !metrics.isLate) return;
        if (filterStatus === 'Overtime' && metrics.overtimeHours <= 0) return;
        if (filterStatus === 'Present' && metrics.status !== 'Present' && metrics.status !== 'Overtime') return;
        if (filterStatus === 'Single Punch' && metrics.status !== 'Single Punch') return;
      }

      // Min Overtime filter
      if (filterMinOt !== 'all') {
        if (filterMinOt === 'ot_only' && metrics.overtimeHours <= 0) return;
        if (filterMinOt === 'gt_1' && metrics.overtimeHours < 1.0) return;
        if (filterMinOt === 'gt_2' && metrics.overtimeHours < 2.0) return;
      }

      // Search Query filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!uid.includes(q) && !empName.toLowerCase().includes(q) && !d.includes(q) && !deptName.toLowerCase().includes(q)) {
          return;
        }
      }

      rows.push({
        date: d,
        userId: uid,
        name: empName,
        departmentName: deptName,
        departmentId: deptId,
        firstIn,
        lastOut,
        duration: metrics.durationStr,
        hours: metrics.hoursWorked,
        standardHours: metrics.standardHours,
        overtimeHours: metrics.overtimeHours,
        overtimeStr: metrics.overtimeStr,
        detectedShiftName: metrics.detectedShift.name,
        isNightShift: metrics.detectedShift.is_night_shift,
        punchesCount: punches.length,
        status: metrics.status,
        isLate: metrics.isLate,
        lateMinutes: metrics.lateMinutes,
      });
    });

    return rows;
  }, [attendance, startDate, endDate, filterEmpId, empMap, deptMap, selectedDeptFilter, shifts, filterStatus, filterMinOt, searchQuery, tempOverridesMap]);

  // 3. Overtime Dedicated Records
  const overtimeRecords = useMemo(() => {
    return rangeRows.filter((r) => r.overtimeHours > 0);
  }, [rangeRows]);

  const totalOvertimeStats = useMemo(() => {
    const totalHours = overtimeRecords.reduce((acc, curr) => acc + curr.overtimeHours, 0);
    const uniqueEmployeesWithOt = new Set(overtimeRecords.map((r) => r.userId)).size;
    const avgOt = overtimeRecords.length > 0 ? (totalHours / overtimeRecords.length).toFixed(1) : '0';
    return {
      totalHours: Math.round(totalHours * 10) / 10,
      shiftsCount: overtimeRecords.length,
      employeesCount: uniqueEmployeesWithOt,
      avgOt
    };
  }, [overtimeRecords]);

  // 4. Department Summary Matrix
  const departmentSummary = useMemo(() => {
    return departments.map((dept) => {
      const deptEmployees = employees.filter((e) => String(e.department_id) === String(dept.id));
      const deptEmpIds = new Set(deptEmployees.map((e) => String(e.user_id).trim()));

      const deptRows = rangeRows.filter((r) => deptEmpIds.has(String(r.userId).trim()));
      
      const presentCount = deptRows.length;
      const lateCount = deptRows.filter((r) => r.isLate).length;
      const otShiftsCount = deptRows.filter((r) => r.overtimeHours > 0).length;
      const totalWorkHours = deptRows.reduce((acc, r) => acc + r.hours, 0);
      const totalOtHours = deptRows.reduce((acc, r) => acc + r.overtimeHours, 0);

      const totalExpected = Math.max(1, deptEmployees.length * 26);
      const attendanceRate = deptEmployees.length > 0 ? Math.min(100, Math.round((presentCount / totalExpected) * 100)) : 0;

      return {
        id: dept.id,
        code: dept.code,
        name: dept.name,
        manager: dept.manager,
        staffCount: deptEmployees.length,
        presentShifts: presentCount,
        lateCount,
        otShiftsCount,
        totalWorkHours: Math.round(totalWorkHours * 10) / 10,
        totalOtHours: Math.round(totalOtHours * 10) / 10,
        attendanceRate,
        employees: deptEmployees
      };
    });
  }, [departments, employees, rangeRows]);

  // Export CSV Helper
  const exportCurrentTabCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `ZKTeco_LRC_Report_${activeReportTab}_${startDate}_to_${endDate}.csv`;

    if (activeReportTab === 'overtime') {
      headers = ['Date', 'Employee ID', 'Name', 'Department', 'Detected Shift', 'Punch In', 'Punch Out', 'Worked Hours', 'Standard Shift Hours', 'Overtime (OT) Hours', 'OT Duration'];
      rows = overtimeRecords.map((r) => [
        r.date,
        `EMP-${r.userId}`,
        `"${r.name}"`,
        `"${r.departmentName}"`,
        `"${r.detectedShiftName}"`,
        r.firstIn,
        r.lastOut,
        r.hours,
        r.standardHours,
        r.overtimeHours,
        `"${r.overtimeStr}"`
      ]);
    } else if (activeReportTab === 'department') {
      headers = ['Dept ID', 'Department Code', 'Department Name', 'Staff Count', 'Present Shifts', 'Late Count', 'OT Shifts', 'Regular Hours', 'Overtime (OT) Hours', 'Attendance Rate %'];
      rows = departmentSummary.map((d) => [
        `DEPT-${d.id}`,
        d.code,
        `"${d.name}"`,
        d.staffCount,
        d.presentShifts,
        d.lateCount,
        d.otShiftsCount,
        d.totalWorkHours,
        d.totalOtHours,
        `${d.attendanceRate}%`
      ]);
    } else if (activeReportTab === 'employee') {
      // Consolidated Employee Report - Keep both Assigned Shift and Detected Shift per day
      const empRows = rangeRows.filter((r) => String(r.userId).trim() === String(selectedEmpId).trim());
      headers = ['Date', 'Day', 'Assigned Shift', 'Detected Shift (Auto)', 'Punch In', 'Punch Out', 'Worked Hours', 'Overtime (OT)', 'Status'];
      rows = empRows.map((r) => {
        const dayStr = new Date(r.date).toLocaleDateString(undefined, { weekday: 'short' });
        const selectedEmp = employees.find(e => String(e.user_id).trim() === String(selectedEmpId).trim());
        return [
          r.date,
          dayStr,
          `"${getAssignedShiftName(selectedEmp || { user_id: selectedEmpId, shift_id: '' } as Employee)}"`,
          `"${r.detectedShiftName}"`,
          r.firstIn,
          r.lastOut,
          r.hours,
          r.overtimeHours > 0 ? `+${r.overtimeHours}h` : '0h',
          r.status
        ];
      });
    } else {
      headers = ['Date', 'Employee ID', 'Name', 'Department', 'Detected Shift', 'First In', 'Last Out', 'Duration', 'Worked Hours', 'Overtime Hours', 'Status', 'Late Delay (min)'];
      rows = rangeRows.map((r) => [
        r.date,
        `EMP-${r.userId}`,
        `"${r.name}"`,
        `"${r.departmentName}"`,
        `"${r.detectedShiftName}"`,
        r.firstIn,
        r.lastOut,
        `"${r.duration}"`,
        r.hours,
        r.overtimeHours,
        r.status,
        r.lateMinutes
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = (type: 'daily' | 'timesheet' | 'range' | 'late' | 'absent' | 'summary' | 'overtime' | 'department') => {
    generateOfficialPDF(type, {
      employees,
      attendance,
      shifts,
      departments,
      device,
      selectedDate,
      startDate,
      endDate,
      selectedEmpId,
      selectedShift: currentShift === 'auto' ? 'auto' : currentShift,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#121212] p-6 rounded-2xl border border-[#262626] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-blue-400" />
            <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">
              Reports & Overtime Analytics
            </h1>
          </div>
          <p className="text-sm text-neutral-400">
            Target Terminal: <strong className="text-blue-400 font-mono">{device ? `${device.name} (${device.ip_address}:${device.port})` : 'ZKTeco K40 (192.168.227.180)'}</strong> &bull; Auto Shift Deduction &bull; Department Summaries
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handlePrintPDF(activeReportTab as any)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-blue-900/30 transition-all cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>Generate Official PDF</span>
          </button>
          <button
            onClick={exportCurrentTabCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
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

      {/* Global Filter Bar (Dates, Shift Rotation Mode, Department) */}
      <div className="bg-[#121212] p-5 rounded-2xl border border-[#262626] shadow-xs space-y-4">
        {/* Row 1: Preset Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-[#222222]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5 mr-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Quick Presets:
            </span>
            <button
              onClick={() => setPreset('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                startDate === minDate && endDate === maxDate
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-[#181818] text-neutral-400 border-[#2a2a2a] hover:bg-[#222222]'
              }`}
            >
              All Records
            </button>
            <button
              onClick={() => setPreset('august')}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                startDate === '2026-08-01' && endDate === '2026-08-31'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-[#181818] text-neutral-400 border-[#2a2a2a] hover:bg-[#222222]'
              }`}
            >
              August 2026 (Full Month)
            </button>
            <button
              onClick={() => setPreset('last7')}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                startDate === '2026-08-25' && endDate === '2026-08-31'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-[#181818] text-neutral-400 border-[#2a2a2a] hover:bg-[#222222]'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setPreset('today')}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                startDate === maxDate && endDate === maxDate
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-[#181818] text-neutral-400 border-[#2a2a2a] hover:bg-[#222222]'
              }`}
            >
              Today ({maxDate})
            </button>
          </div>

          {/* Auto Shift Detection Info Tag */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              <strong>Per-Day Auto Shift Detection Active:</strong> Each day auto-detects Day/Night/Office shift from check-in punch!
            </span>
          </div>
        </div>

        {/* Row 2: Selectors (From Date, To Date, Department Filter) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#181818] border border-[#2e2e2e] rounded-xl text-xs text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#181818] border border-[#2e2e2e] rounded-xl text-xs text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
              Filter by Department
            </label>
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#181818] border border-[#2e2e2e] rounded-xl text-xs text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">🏢 All Departments ({departments.length})</option>
              {departments.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  DEPT-{d.id}: {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#262626]">
        <button
          onClick={() => setActiveReportTab('overtime')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 ${
            activeReportTab === 'overtime'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30'
              : 'text-neutral-400 hover:bg-[#181818] hover:text-neutral-200'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-300" />
          <span>Overtime (OT) Report</span>
          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 text-[10px] font-bold">
            {overtimeRecords.length}
          </span>
        </button>

        <button
          onClick={() => setActiveReportTab('department')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 ${
            activeReportTab === 'department'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-neutral-400 hover:bg-[#181818] hover:text-neutral-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Department Summary ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveReportTab('summary')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 ${
            activeReportTab === 'summary'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-neutral-400 hover:bg-[#181818] hover:text-neutral-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Matrix ({staffSummary.length})</span>
        </button>

        <button
          onClick={() => setActiveReportTab('range')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 ${
            activeReportTab === 'range'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-neutral-400 hover:bg-[#181818] hover:text-neutral-200'
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          <span>Master Date Range Log ({rangeRows.length})</span>
        </button>

        <button
          onClick={() => setActiveReportTab('employee')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 ${
            activeReportTab === 'employee'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-neutral-400 hover:bg-[#181818] hover:text-neutral-200'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Individual Timesheet</span>
        </button>

        <button
          onClick={() => setActiveReportTab('late')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 ${
            activeReportTab === 'late'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
              : 'text-neutral-400 hover:bg-[#181818] hover:text-neutral-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Late Arrivals</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERTIME (OT) DEDICATED REPORT                                     */}
      {/* ========================================================================= */}
      {activeReportTab === 'overtime' && (
        <div className="space-y-6">
          {/* Overtime Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#121212] p-5 rounded-2xl border border-amber-500/20 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-neutral-400">Total Overtime Hours</p>
                  <h3 className="text-3xl font-extrabold text-amber-400 mt-1 font-mono">
                    +{totalOvertimeStats.totalHours} <span className="text-sm font-sans font-normal text-neutral-400">hrs</span>
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Flame className="w-6 h-6" />
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 mt-3 flex items-center gap-1">
                <span>Calculated beyond standard shift hours (12h or 8h)</span>
              </p>
            </div>

            <div className="bg-[#121212] p-5 rounded-2xl border border-[#262626] shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-neutral-400">Overtime Shifts Count</p>
                  <h3 className="text-3xl font-extrabold text-neutral-100 mt-1 font-mono">
                    {totalOvertimeStats.shiftsCount} <span className="text-sm font-sans font-normal text-neutral-400">duties</span>
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Zap className="w-6 h-6" />
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 mt-3">
                Across {startDate} to {endDate}
              </p>
            </div>

            <div className="bg-[#121212] p-5 rounded-2xl border border-[#262626] shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-neutral-400">Employees with OT</p>
                  <h3 className="text-3xl font-extrabold text-neutral-100 mt-1 font-mono">
                    {totalOvertimeStats.employeesCount} <span className="text-sm font-sans font-normal text-neutral-400">staff</span>
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Users className="w-6 h-6" />
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 mt-3">
                Avg OT: <strong className="text-neutral-200">+{totalOvertimeStats.avgOt} hrs</strong> per shift
              </p>
            </div>

            <div className="bg-[#121212] p-5 rounded-2xl border border-[#262626] shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-neutral-400">Shift Rotation Method</p>
                  <h3 className="text-base font-bold text-emerald-400 mt-1">
                    Auto Deduce Active
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 mt-3">
                Day 7-19 / Night 19-7 / Office 8:30-16:30
              </p>
            </div>
          </div>

          {/* Overtime Secondary Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#161616] p-4 rounded-xl border border-[#262626]">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-amber-400" />
                Filter Minimum Overtime:
              </span>
              <select
                value={filterMinOt}
                onChange={(e) => setFilterMinOt(e.target.value)}
                className="px-3 py-1.5 bg-[#121212] border border-[#2e2e2e] rounded-lg text-xs text-neutral-100 focus:outline-hidden"
              >
                <option value="all">All Overtime Records</option>
                <option value="gt_1">&gt; 1.0 Hour OT</option>
                <option value="gt_2">&gt; 2.0 Hours OT</option>
              </select>
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Employee, ID, or Dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#121212] border border-[#2e2e2e] rounded-lg text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Overtime Records Table */}
          <div className="bg-[#121212] rounded-2xl border border-[#262626] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181818] text-neutral-400 font-semibold border-b border-[#262626]">
                  <tr>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">EMP ID</th>
                    <th className="py-3.5 px-4">Employee Name</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Detected Shift (Auto)</th>
                    <th className="py-3.5 px-4">Punch In</th>
                    <th className="py-3.5 px-4">Punch Out</th>
                    <th className="py-3.5 px-4 text-center">Worked Hours</th>
                    <th className="py-3.5 px-4 text-center">Standard Shift</th>
                    <th className="py-3.5 px-4 text-right">Overtime (OT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f1f] font-medium">
                  {overtimeRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-neutral-500">
                        <Flame className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-400" />
                        <p className="text-sm font-medium">No overtime records found for this period/filter.</p>
                      </td>
                    </tr>
                  ) : (
                    overtimeRecords.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#181818] transition-colors">
                        <td className="py-3 px-4 font-mono text-neutral-300">{row.date}</td>
                        <td className="py-3 px-4 font-mono text-neutral-400">EMP-{row.userId}</td>
                        <td className="py-3 px-4 font-semibold text-neutral-100">{row.name}</td>
                        <td className="py-3 px-4 text-neutral-400">
                          <span className="px-2 py-0.5 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-[11px]">
                            {row.departmentName}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                            {row.isNightShift ? <Moon className="w-3 h-3 text-indigo-400" /> : <Sun className="w-3 h-3 text-amber-400" />}
                            {row.detectedShiftName}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-400">{row.firstIn}</td>
                        <td className="py-3 px-4 font-mono text-rose-400">{row.lastOut}</td>
                        <td className="py-3 px-4 text-center font-mono text-neutral-200">
                          {row.hours}h <span className="text-neutral-500 text-[10px]">({row.duration})</span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-neutral-400">
                          {row.standardHours}h
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-bold text-xs">
                            <Flame className="w-3.5 h-3.5" />
                            +{row.overtimeHours} hrs ({row.overtimeStr})
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DEPARTMENT ATTENDANCE & OVERTIME BREAKDOWN                         */}
      {/* ========================================================================= */}
      {activeReportTab === 'department' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#121212] p-5 rounded-2xl border border-[#262626] shadow-xs">
              <p className="text-xs font-semibold text-neutral-400">Total Departments</p>
              <h3 className="text-3xl font-extrabold text-neutral-100 mt-1 font-mono">
                {departments.length}
              </h3>
              <p className="text-[11px] text-neutral-500 mt-2">
                Across LRC Karachi Tollway & Terminal Operations
              </p>
            </div>

            <div className="bg-[#121212] p-5 rounded-2xl border border-blue-500/20 shadow-xs">
              <p className="text-xs font-semibold text-neutral-400">Total Department Work Hours</p>
              <h3 className="text-3xl font-extrabold text-blue-400 mt-1 font-mono">
                {Math.round(departmentSummary.reduce((acc, d) => acc + d.totalWorkHours, 0))} <span className="text-sm font-sans text-neutral-400">hrs</span>
              </h3>
              <p className="text-[11px] text-neutral-500 mt-2">
                Total Overtime: <strong className="text-amber-400">+{Math.round(departmentSummary.reduce((acc, d) => acc + d.totalOtHours, 0))}h</strong>
              </p>
            </div>

            <div className="bg-[#121212] p-5 rounded-2xl border border-emerald-500/20 shadow-xs">
              <p className="text-xs font-semibold text-neutral-400">Top Staffed Unit</p>
              <h3 className="text-lg font-bold text-emerald-400 mt-1 truncate">
                Plaza Operations (640 Staff)
              </h3>
              <p className="text-[11px] text-neutral-500 mt-2">
                Shift A (Day) & Shift B (Night) Rotation
              </p>
            </div>
          </div>

          {/* Department Summary Table */}
          <div className="bg-[#121212] rounded-2xl border border-[#262626] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#262626] bg-[#161616] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-neutral-100 text-sm">Department Performance & Overtime Audit</h3>
              </div>
              <span className="text-xs text-neutral-400">
                Click any department to view enrolled employee roster
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181818] text-neutral-400 font-semibold border-b border-[#262626]">
                  <tr>
                    <th className="py-3.5 px-4 w-10"></th>
                    <th className="py-3.5 px-4">Dept ID</th>
                    <th className="py-3.5 px-4">Department Name</th>
                    <th className="py-3.5 px-4">Code</th>
                    <th className="py-3.5 px-4 text-center">Staff Count</th>
                    <th className="py-3.5 px-4 text-center">Present Shifts</th>
                    <th className="py-3.5 px-4 text-center">Late Count</th>
                    <th className="py-3.5 px-4 text-center">Regular Hours</th>
                    <th className="py-3.5 px-4 text-center">Overtime (OT)</th>
                    <th className="py-3.5 px-4 text-right">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f1f] font-medium">
                  {departmentSummary.map((dept) => {
                    const isExpanded = expandedDeptId === dept.id;
                    return (
                      <React.Fragment key={dept.id}>
                        <tr 
                          onClick={() => setExpandedDeptId(isExpanded ? null : dept.id)}
                          className="hover:bg-[#181818] transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-4 text-neutral-500">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-400" /> : <ChevronRight className="w-4 h-4" />}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-neutral-400">DEPT-{dept.id}</td>
                          <td className="py-3.5 px-4 font-bold text-neutral-100">
                            {dept.name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-neutral-400 text-[11px]">{dept.code}</td>
                          <td className="py-3.5 px-4 text-center font-semibold text-neutral-200">
                            {dept.staffCount}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-emerald-400">
                            {dept.presentShifts}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-amber-400">
                            {dept.lateCount}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-neutral-300">
                            {dept.totalWorkHours}h
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {dept.totalOtHours > 0 ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-bold text-[11px]">
                                +{dept.totalOtHours}h
                              </span>
                            ) : (
                              <span className="text-neutral-600 font-mono">0h</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold text-xs">
                              {dept.attendanceRate}%
                            </span>
                          </td>
                        </tr>

                        {/* Expanded Department Employee Details */}
                        {isExpanded && (
                          <tr className="bg-[#141414]">
                            <td colSpan={10} className="p-4 pl-12 border-y border-[#262626]">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs text-neutral-400">
                                  <span className="font-semibold text-neutral-200">
                                    Enrolled Staff in {dept.name} ({dept.employees.length}):
                                  </span>
                                  <span>Manager: <strong className="text-neutral-300">{dept.manager}</strong></span>
                                </div>

                                {dept.employees.length === 0 ? (
                                  <p className="text-xs text-neutral-500 italic">No employees assigned to this department yet.</p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {dept.employees.map((emp) => {
                                      const empRows = rangeRows.filter((r) => String(r.userId).trim() === String(emp.user_id).trim());
                                      const totalEmpHours = empRows.reduce((a, b) => a + b.hours, 0);
                                      const totalEmpOt = empRows.reduce((a, b) => a + b.overtimeHours, 0);
                                      return (
                                        <div key={emp.user_id} className="bg-[#181818] p-3 rounded-xl border border-[#2a2a2a] space-y-1.5">
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-neutral-100 text-xs">{emp.name}</span>
                                            <span className="font-mono text-neutral-500 text-[10px]">EMP-{emp.user_id}</span>
                                          </div>
                                          <p className="text-[11px] text-neutral-400 truncate">{emp.designation_title || 'Toll Staff'}</p>
                                          <div className="flex items-center justify-between pt-1 border-t border-[#222222] text-[11px] font-mono">
                                            <span className="text-neutral-400">Worked: <strong className="text-neutral-200">{Math.round(totalEmpHours)}h</strong></span>
                                            <span className="text-amber-400 font-semibold">OT: +{Math.round(totalEmpOt * 10) / 10}h</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STAFF SUMMARY MATRIX                                               */}
      {/* ========================================================================= */}
      {activeReportTab === 'summary' && (
        <div className="space-y-6">
          <div className="bg-[#121212] rounded-2xl border border-[#262626] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#262626] bg-[#161616] flex items-center justify-between">
              <h3 className="font-bold text-neutral-100 text-sm">Staff Attendance & Overtime Summary Matrix</h3>
              <span className="text-xs text-neutral-400">Total: {staffSummary.length} Employees</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181818] text-neutral-400 font-semibold border-b border-[#262626]">
                  <tr>
                    <th className="py-3.5 px-4">EMP ID</th>
                    <th className="py-3.5 px-4">Full Name</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Privilege</th>
                    <th className="py-3.5 px-4">Shift Pattern (Auto-Detected)</th>
                    <th className="py-3.5 px-4 text-center">Present Days</th>
                    <th className="py-3.5 px-4 text-center">Late Days</th>
                    <th className="py-3.5 px-4 text-center">Total Hours</th>
                    <th className="py-3.5 px-4 text-center">Overtime (OT)</th>
                    <th className="py-3.5 px-4 text-right">Compliance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f1f] font-medium">
                  {staffSummary.map((staff) => (
                    <tr key={staff.userId} className="hover:bg-[#181818] transition-colors">
                      <td className="py-3 px-4 font-mono text-neutral-400">EMP-{staff.userId}</td>
                      <td className="py-3 px-4 font-bold text-neutral-100">{staff.name}</td>
                      <td className="py-3 px-4 text-neutral-300">{staff.departmentName}</td>
                      <td className="py-3 px-4 text-neutral-400">{staff.privilege}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                          {staff.detectedShiftName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-400 font-semibold">
                        {staff.presentDays} days
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-amber-400">
                        {staff.lateDays}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-neutral-200">
                        {staff.totalHours}h
                      </td>
                      <td className="py-3 px-4 text-center">
                        {staff.totalOtHours > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-bold text-[11px]">
                            +{staff.totalOtHours}h
                          </span>
                        ) : (
                          <span className="text-neutral-600 font-mono">0h</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[11px] font-bold">
                          {staff.complianceRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MASTER DATE RANGE LOG                                              */}
      {/* ========================================================================= */}
      {activeReportTab === 'range' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#161616] p-4 rounded-xl border border-[#262626]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-neutral-300">Status Filter:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-[#121212] border border-[#2e2e2e] rounded-lg text-xs text-neutral-100 focus:outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="Present">Present Only</option>
                <option value="Overtime">Overtime Only</option>
                <option value="Late">Late Only</option>
                <option value="Single Punch">Single Punch (Missing Out)</option>
              </select>
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Employee, ID, or Dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#121212] border border-[#2e2e2e] rounded-lg text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="bg-[#121212] rounded-2xl border border-[#262626] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181818] text-neutral-400 font-semibold border-b border-[#262626]">
                  <tr>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">EMP ID</th>
                    <th className="py-3.5 px-4">Employee Name</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Detected Shift (Auto)</th>
                    <th className="py-3.5 px-4">First In</th>
                    <th className="py-3.5 px-4">Last Out</th>
                    <th className="py-3.5 px-4 text-center">Duration</th>
                    <th className="py-3.5 px-4 text-center">Overtime</th>
                    <th className="py-3.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f1f] font-medium">
                  {rangeRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-neutral-500">
                        <CalendarRange className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-medium">No biometric records match the selected filter criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    rangeRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#181818] transition-colors">
                        <td className="py-3 px-4 font-mono text-neutral-300">{row.date}</td>
                        <td className="py-3 px-4 font-mono text-neutral-400">EMP-{row.userId}</td>
                        <td className="py-3 px-4 font-semibold text-neutral-100">{row.name}</td>
                        <td className="py-3 px-4 text-neutral-400 text-[11px]">{row.departmentName}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                            {row.isNightShift ? <Moon className="w-3 h-3 text-indigo-400" /> : <Sun className="w-3 h-3 text-amber-400" />}
                            {row.detectedShiftName}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-400">{row.firstIn}</td>
                        <td className="py-3 px-4 font-mono text-rose-400">{row.lastOut}</td>
                        <td className="py-3 px-4 text-center font-mono text-neutral-200">
                          {row.duration}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {row.overtimeHours > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-bold text-[11px]">
                              +{row.overtimeHours}h
                            </span>
                          ) : (
                            <span className="text-neutral-600 font-mono">0h</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            row.isLate
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : (row.overtimeHours > 0
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20')
                          }`}>
                            {row.status} {row.isLate && `(+${row.lateMinutes}m)`}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CONSOLIDATED EMPLOYEE REPORT (Timesheet) - Keeps Assigned + Detected Shift */}
      {/* ========================================================================= */}
      {activeReportTab === 'employee' && (
        <div className="space-y-6">
          <div className="bg-[#121212] p-5 rounded-2xl border border-[#262626] shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <User className="w-6 h-6" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Select Employee</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="px-3 py-1.5 bg-[#181818] border border-[#2e2e2e] rounded-xl text-xs text-neutral-100 font-semibold focus:outline-hidden"
                >
                  {employees.map((e) => (
                    <option key={e.user_id} value={e.user_id}>
                      EMP-{e.user_id}: {e.name} ({deptMap.get(String(e.department_id))?.name || 'Operations'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => handlePrintPDF('timesheet')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Export Timesheet PDF</span>
            </button>
          </div>

          <div className="bg-[#121212] rounded-2xl border border-[#262626] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#262626] bg-[#161616] flex items-center justify-between">
              <h3 className="font-bold text-neutral-100 text-sm">Consolidated Employee Report - Per-Day Auto Shift Detection</h3>
              <span className="text-xs text-blue-400">Shows Assigned Shift vs Auto-Detected Shift per day</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181818] text-neutral-400 font-semibold border-b border-[#262626]">
                  <tr>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Day</th>
                    <th className="py-3.5 px-4">Assigned Shift</th>
                    <th className="py-3.5 px-4">Detected Shift (Auto)</th>
                    <th className="py-3.5 px-4">Punch In</th>
                    <th className="py-3.5 px-4">Punch Out</th>
                    <th className="py-3.5 px-4 text-center">Worked Hours</th>
                    <th className="py-3.5 px-4 text-center">Overtime (OT)</th>
                    <th className="py-3.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f1f] font-medium">
                  {rangeRows.filter((r) => String(r.userId).trim() === String(selectedEmpId).trim()).map((row, idx) => {
                    const dayStr = new Date(row.date).toLocaleDateString(undefined, { weekday: 'short' });
                    const selectedEmp = employees.find(e => String(e.user_id).trim() === String(selectedEmpId).trim());
                    return (
                      <tr key={idx} className="hover:bg-[#181818] transition-colors">
                        <td className="py-3 px-4 font-mono text-neutral-300">{row.date}</td>
                        <td className="py-3 px-4 text-neutral-400">{dayStr}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20 text-[10px] font-semibold">
                            {getAssignedShiftName(selectedEmp || { user_id: selectedEmpId, shift_id: '' } as Employee)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                            {row.isNightShift ? <Moon className="w-3 h-3 text-indigo-400" /> : <Sun className="w-3 h-3 text-amber-400" />}
                            {row.detectedShiftName}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-400">{row.firstIn}</td>
                        <td className="py-3 px-4 font-mono text-rose-400">{row.lastOut}</td>
                        <td className="py-3 px-4 text-center font-mono text-neutral-200">
                          {row.hours}h <span className="text-neutral-500 text-[10px]">({row.duration})</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {row.overtimeHours > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-bold text-[11px]">
                              +{row.overtimeHours}h
                            </span>
                          ) : (
                            <span className="text-neutral-600 font-mono">0h</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            row.isLate
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : (row.overtimeHours > 0
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20')
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: LATE ARRIVALS AUDIT                                                */}
      {/* ========================================================================= */}
      {activeReportTab === 'late' && (
        <div className="space-y-6">
          <div className="bg-[#121212] rounded-2xl border border-[#262626] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#262626] bg-[#161616] flex items-center justify-between">
              <h3 className="font-bold text-neutral-100 text-sm">Late Arrival Violations & Grace Audit</h3>
              <span className="text-xs text-amber-400 font-semibold">
                {rangeRows.filter((r) => r.isLate).length} Late Incidents Recorded
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181818] text-neutral-400 font-semibold border-b border-[#262626]">
                  <tr>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">EMP ID</th>
                    <th className="py-3.5 px-4">Employee Name</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Detected Shift (Auto)</th>
                    <th className="py-3.5 px-4">Actual Punch In</th>
                    <th className="py-3.5 px-4">Delay (Mins)</th>
                    <th className="py-3.5 px-4 text-right">Grace Period Allowed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f1f] font-medium">
                  {rangeRows.filter((r) => r.isLate).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-neutral-500">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-60" />
                        <p className="text-sm font-medium text-emerald-400">Zero late arrivals in this filtered period!</p>
                      </td>
                    </tr>
                  ) : (
                    rangeRows.filter((r) => r.isLate).map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#181818] transition-colors">
                        <td className="py-3 px-4 font-mono text-neutral-300">{row.date}</td>
                        <td className="py-3 px-4 font-mono text-neutral-400">EMP-{row.userId}</td>
                        <td className="py-3 px-4 font-semibold text-neutral-100">{row.name}</td>
                        <td className="py-3 px-4 text-neutral-400">{row.departmentName}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                            {row.isNightShift ? <Moon className="w-3 h-3 text-indigo-400" /> : <Sun className="w-3 h-3 text-amber-400" />}
                            {row.detectedShiftName}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-rose-400 font-bold">{row.firstIn}</td>
                        <td className="py-3 px-4 font-mono text-amber-400 font-bold">
                          +{row.lateMinutes} mins
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-neutral-500">
                          15 mins grace
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
