import { jsPDF } from 'jspdf';
import { AttendanceRecord, Employee, Shift, Department } from '../types';
import { calculateAttendanceMetrics, formatMinutes, autoDetectShift } from './shiftDeduction';

export interface ReportSummaryOptions {
  title: string;
  subtitle?: string;
  startDate?: string;
  endDate?: string;
  shift?: Shift | 'auto';
  generatedBy?: string;
}

export { formatMinutes };

/**
 * Backward-compatible helper for shift calculations with auto-detect fallback
 */
export function calculateShiftMetrics(
  firstInTime: string,
  lastOutTime: string,
  shift: Shift,
  dateStr: string,
  allShifts?: Shift[]
) {
  const shiftsList = allShifts || [shift];
  const res = calculateAttendanceMetrics(firstInTime, lastOutTime, shift, dateStr, shiftsList);
  return {
    hoursWorked: res.hoursWorked,
    durationStr: res.durationStr,
    isLate: res.isLate,
    lateMinutes: res.lateMinutes,
    isEarlyDeparture: false,
    earlyMinutes: 0,
    status: res.status,
    overtimeHours: res.overtimeHours,
    overtimeStr: res.overtimeStr,
    isOvertime: res.isOvertime,
    detectedShift: res.detectedShift
  };
}

/**
 * Generates an official, beautifully styled Multi-Page PDF Attendance, Overtime & Department Report
 */
export function generateOfficialPDF(
  type: 'daily' | 'timesheet' | 'range' | 'late' | 'absent' | 'summary' | 'overtime' | 'department',
  data: {
    employees: Employee[];
    attendance: AttendanceRecord[];
    shifts: Shift[];
    departments?: Department[];
    device?: ZKTecoDevice;
    selectedDate?: string;
    startDate?: string;
    endDate?: string;
    selectedEmpId?: string;
    selectedDeptId?: string;
    selectedShift?: Shift | 'auto';
    useAutoShift?: boolean;
  }
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const empMap = new Map<string, Employee>();
  data.employees.forEach((e) => empMap.set(String(e.user_id).trim(), e));

  const deptMap = new Map<string, string>();
  (data.departments || []).forEach((d) => deptMap.set(String(d.id), d.name));

  const currentShift = data.selectedShift === 'auto' ? undefined : (data.selectedShift || data.shifts[0]);

  const primaryColor = [26, 86, 219]; // #1A56DB Blue
  const darkTextColor = [20, 20, 20];
  const mutedTextColor = [100, 100, 100];
  const borderColor = [220, 225, 230];
  const tableHeaderBg = [245, 247, 250];

  let currentY = 18;

  // Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(14, currentY, 182, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);

  let reportTitle = 'ZKTECO K40 OFFICIAL ATTENDANCE REPORT';
  if (type === 'overtime') reportTitle = 'ZKTECO K40 OVERTIME (OT) AUDIT REPORT';
  else if (type === 'department') reportTitle = 'DEPARTMENT ATTENDANCE & OT SUMMARY';
  else if (type === 'late') reportTitle = 'LATE ARRIVALS & PUNCTUALITY AUDIT';

  doc.text(reportTitle, 20, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const targetDeviceStr = data.device 
    ? `Target Machine: ${data.device.name || 'K40'} (${data.device.ip_address}:${data.device.port})`
    : 'Target Machine: ZKTeco K40 (192.168.227.180:4370)';
  const shiftText = currentShift 
    ? `Shift: ${currentShift.name} (${currentShift.start_time} - ${currentShift.end_time})` 
    : 'Auto Shift Deduce (07-19 / 19-07 / 08:30-16:30)';
  doc.text(`${targetDeviceStr} | ${shiftText}`, 20, currentY + 16);

  currentY += 28;

  // Metadata block
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  const printTime = new Date().toLocaleString();
  const dateRangeStr = data.startDate && data.endDate 
    ? `${data.startDate} to ${data.endDate}` 
    : (data.selectedDate || new Date().toISOString().split('T')[0]);

  const activeIpDisplay = data.device ? `Device IP: ${data.device.ip_address}` : 'Device IP: 192.168.227.180';
  doc.text(`Report Period: ${dateRangeStr}  |  ${activeIpDisplay}`, 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text(`Generated: ${printTime}`, 140, currentY);

  currentY += 8;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.line(14, currentY, 196, currentY);
  currentY += 6;

  // Table Building Helper
  const drawRow = (
    cols: string[],
    widths: number[],
    isHeader = false,
    highlight: 'none' | 'late' | 'present' | 'absent' | 'overtime' = 'none'
  ) => {
    // Check page break
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }

    if (isHeader) {
      doc.setFillColor(tableHeaderBg[0], tableHeaderBg[1], tableHeaderBg[2]);
      doc.rect(14, currentY, 182, 7, 'F');
      doc.setTextColor(50, 50, 50);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
    } else {
      if (highlight === 'late') {
        doc.setFillColor(254, 243, 199); // Amber tint
        doc.rect(14, currentY, 182, 6.5, 'F');
      } else if (highlight === 'absent') {
        doc.setFillColor(254, 226, 226); // Rose tint
        doc.rect(14, currentY, 182, 6.5, 'F');
      } else if (highlight === 'overtime') {
        doc.setFillColor(236, 253, 245); // Emerald tint
        doc.rect(14, currentY, 182, 6.5, 'F');
      }
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
    }

    let startX = 14;
    cols.forEach((col, idx) => {
      const w = widths[idx];
      doc.text(String(col || '-'), startX + 2, currentY + (isHeader ? 4.8 : 4.5));
      startX += w;
    });

    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(14, currentY + (isHeader ? 7 : 6.5), 196, currentY + (isHeader ? 7 : 6.5));
    currentY += isHeader ? 7.5 : 6.8;
  };

  // 1. OVERTIME REPORT
  if (type === 'overtime') {
    const fromD = data.startDate || '2026-08-01';
    const toD = data.endDate || '2026-08-31';

    const rangePunches = data.attendance.filter((p) => p.date >= fromD && p.date <= toD);
    const groupKeyMap = new Map<string, AttendanceRecord[]>();
    rangePunches.forEach((p) => {
      const key = `${p.date}_${String(p.user_id).trim()}`;
      const list = groupKeyMap.get(key) || [];
      list.push(p);
      groupKeyMap.set(key, list);
    });

    const headers = ['Date', 'EMP ID', 'Employee Name', 'Shift', 'In Time', 'Out Time', 'Worked', 'Standard', 'Overtime (OT)'];
    const widths = [22, 16, 44, 28, 16, 16, 16, 14, 20];

    drawRow(headers, widths, true);

    let totalOtCount = 0;
    let sumOtHours = 0;

    Array.from(groupKeyMap.keys()).sort().reverse().forEach((key) => {
      const [d, uid] = key.split('_');
      const punches = groupKeyMap.get(key) || [];
      punches.sort((a, b) => a.time.localeCompare(b.time));

      const firstIn = punches[0].time;
      const lastOut = punches.length > 1 ? punches[punches.length - 1].time : '--:--';
      const emp = empMap.get(uid);
      const empName = emp?.name || `EMP-${uid}`;

      const metrics = calculateAttendanceMetrics(
        firstIn,
        lastOut,
        data.selectedShift || 'auto',
        d,
        data.shifts,
        emp?.department_id
      );

      if (metrics.overtimeHours > 0) {
        totalOtCount++;
        sumOtHours += metrics.overtimeHours;
        drawRow(
          [
            d,
            `EMP-${uid}`,
            empName,
            metrics.detectedShift.name.substring(0, 14),
            firstIn,
            lastOut,
            `${metrics.hoursWorked}h`,
            `${metrics.standardHours}h`,
            `+${metrics.overtimeHours}h OT`
          ],
          widths,
          false,
          'overtime'
        );
      }
    });

    if (totalOtCount === 0) {
      doc.text('No overtime hours recorded in this selected period.', 14, currentY + 8);
    } else {
      currentY += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`Total Overtime Shifts: ${totalOtCount} | Total Overtime Accumulated: ${Math.round(sumOtHours * 10) / 10} Hours`, 14, currentY);
    }
  }

  // 2. DEPARTMENT REPORT
  else if (type === 'department') {
    const fromD = data.startDate || '2026-08-01';
    const toD = data.endDate || '2026-08-31';

    const rangePunches = data.attendance.filter((p) => p.date >= fromD && p.date <= toD);

    const headers = ['Dept ID', 'Department Name', 'Staff Count', 'Present Shifts', 'Late Count', 'Regular Hrs', 'Overtime (OT) Hrs', 'Attendance %'];
    const widths = [16, 52, 20, 22, 18, 20, 24, 20];

    drawRow(headers, widths, true);

    const departments = data.departments || [];
    departments.forEach((dept) => {
      const deptEmployees = data.employees.filter((e) => String(e.department_id) === String(dept.id));
      const deptEmpIds = new Set(deptEmployees.map((e) => String(e.user_id).trim()));

      let presentCount = 0;
      let lateCount = 0;
      let totalWorkHours = 0;
      let totalOtHours = 0;

      // Group punches by user and date
      const deptPunches = rangePunches.filter((p) => deptEmpIds.has(String(p.user_id).trim()));
      const userDateMap = new Map<string, AttendanceRecord[]>();
      deptPunches.forEach((p) => {
        const key = `${p.date}_${String(p.user_id).trim()}`;
        const list = userDateMap.get(key) || [];
        list.push(p);
        userDateMap.set(key, list);
      });

      userDateMap.forEach((punches, key) => {
        const [d] = key.split('_');
        punches.sort((a, b) => a.time.localeCompare(b.time));
        const firstIn = punches[0]?.time || '--:--';
        const lastOut = punches.length > 1 ? punches[punches.length - 1].time : '--:--';
        const metrics = calculateAttendanceMetrics(firstIn, lastOut, data.selectedShift || 'auto', d, data.shifts, dept.id);

        if (firstIn && firstIn !== '--:--') presentCount++;
        if (metrics.isLate) lateCount++;
        totalWorkHours += metrics.hoursWorked;
        totalOtHours += metrics.overtimeHours;
      });

      const totalExpected = (deptEmployees.length || 1) * 26;
      const rate = deptEmployees.length > 0 ? Math.min(100, Math.round((presentCount / totalExpected) * 100)) : 0;

      drawRow(
        [
          `DEPT-${dept.id}`,
          dept.name.length > 28 ? dept.name.substring(0, 26) + '...' : dept.name,
          `${deptEmployees.length}`,
          `${presentCount}`,
          `${lateCount}`,
          `${Math.round(totalWorkHours)}h`,
          `+${Math.round(totalOtHours * 10) / 10}h`,
          `${rate}%`
        ],
        widths,
        false,
        rate < 70 ? 'absent' : 'none'
      );
    });
  }

  // 3. DAILY / RANGE MASTER REPORT
  else if (type === 'daily' || type === 'range') {
    const fromD = data.startDate || data.selectedDate || '2026-08-01';
    const toD = data.endDate || data.selectedDate || '2026-08-31';

    const rangePunches = data.attendance.filter((p) => p.date >= fromD && p.date <= toD);

    const groupKeyMap = new Map<string, AttendanceRecord[]>();
    rangePunches.forEach((p) => {
      const key = `${p.date}_${String(p.user_id).trim()}`;
      const list = groupKeyMap.get(key) || [];
      list.push(p);
      groupKeyMap.set(key, list);
    });

    const headers = ['Date', 'EMP ID', 'Employee Name', 'Shift (Auto/Set)', 'First In', 'Last Out', 'Duration', 'Overtime', 'Status'];
    const widths = [20, 16, 40, 30, 16, 16, 18, 16, 20];

    drawRow(headers, widths, true);

    if (groupKeyMap.size === 0) {
      doc.setFontSize(8.5);
      doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
      doc.text(`No biometric logs found between ${fromD} and ${toD}.`, 14, currentY + 8);
    } else {
      const sortedKeys = Array.from(groupKeyMap.keys()).sort().reverse();
      sortedKeys.forEach((key) => {
        const [d, uid] = key.split('_');
        const punches = groupKeyMap.get(key) || [];
        punches.sort((a, b) => a.time.localeCompare(b.time));

        const firstIn = punches[0].time;
        const lastOut = punches.length > 1 ? punches[punches.length - 1].time : '--:--';
        const emp = empMap.get(uid);
        const name = emp?.name || `EMP-${uid}`;

        const metrics = calculateAttendanceMetrics(
          firstIn,
          lastOut,
          data.selectedShift || 'auto',
          d,
          data.shifts,
          emp?.department_id
        );

        const highlight = metrics.isLate ? 'late' : (metrics.overtimeHours > 0 ? 'overtime' : 'none');
        drawRow(
          [
            d,
            `EMP-${uid}`,
            name,
            metrics.detectedShift.name.substring(0, 15),
            firstIn,
            lastOut,
            metrics.durationStr,
            metrics.overtimeHours > 0 ? `+${metrics.overtimeHours}h` : '0h',
            metrics.status
          ],
          widths,
          false,
          highlight
        );
      });
    }
  }

  // 4. TIMESHEET
  else if (type === 'timesheet') {
    const empId = data.selectedEmpId || data.employees[0]?.user_id || '1001';
    const emp = empMap.get(String(empId).trim());
    const empName = emp?.name || `EMP-${empId}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Timesheet: EMP-${empId} - ${empName} (${emp?.department_name || 'LRC Operations'})`, 14, currentY);
    currentY += 7;

    const fromD = data.startDate || '2026-08-01';
    const toD = data.endDate || '2026-08-31';

    const empPunches = data.attendance.filter((p) => String(p.user_id).trim() === String(empId).trim() && p.date >= fromD && p.date <= toD);
    const dateMap = new Map<string, AttendanceRecord[]>();
    empPunches.forEach((p) => {
      const list = dateMap.get(p.date) || [];
      list.push(p);
      dateMap.set(p.date, list);
    });

    const headers = ['Date', 'Day', 'Shift (Detected)', 'First In', 'Last Out', 'Worked', 'Overtime', 'Status'];
    const widths = [22, 16, 38, 20, 20, 20, 20, 26];

    drawRow(headers, widths, true);

    const sortedDates = Array.from(dateMap.keys()).sort().reverse();
    if (sortedDates.length === 0) {
      doc.text(`No biometric logs found for ${empName} between ${fromD} and ${toD}.`, 14, currentY + 8);
    } else {
      sortedDates.forEach((d) => {
        const punches = dateMap.get(d) || [];
        punches.sort((a, b) => a.time.localeCompare(b.time));
        const firstIn = punches[0].time;
        const lastOut = punches.length > 1 ? punches[punches.length - 1].time : '--:--';
        const dayStr = new Date(d).toLocaleDateString(undefined, { weekday: 'short' });

        const metrics = calculateAttendanceMetrics(
          firstIn,
          lastOut,
          data.selectedShift || 'auto',
          d,
          data.shifts,
          emp?.department_id
        );

        drawRow(
          [
            d,
            dayStr,
            metrics.detectedShift.name.substring(0, 18),
            firstIn,
            lastOut,
            metrics.durationStr,
            metrics.overtimeHours > 0 ? `+${metrics.overtimeHours}h OT` : '0h',
            metrics.status
          ],
          widths,
          false,
          metrics.isLate ? 'late' : (metrics.overtimeHours > 0 ? 'overtime' : 'none')
        );
      });
    }
  }

  // 5. LATE REPORT
  else if (type === 'late') {
    const fromD = data.startDate || '2026-08-01';
    const toD = data.endDate || '2026-08-31';

    const rangePunches = data.attendance.filter((p) => p.date >= fromD && p.date <= toD);
    const groupKeyMap = new Map<string, AttendanceRecord[]>();
    rangePunches.forEach((p) => {
      const key = `${p.date}_${String(p.user_id).trim()}`;
      const list = groupKeyMap.get(key) || [];
      list.push(p);
      groupKeyMap.set(key, list);
    });

    const headers = ['Date', 'EMP ID', 'Employee Name', 'Shift Start', 'Actual Punch In', 'Late Delay', 'Grace Allowed'];
    const widths = [24, 20, 48, 22, 24, 24, 20];

    drawRow(headers, widths, true);

    let lateCount = 0;
    Array.from(groupKeyMap.keys()).sort().reverse().forEach((key) => {
      const [d, uid] = key.split('_');
      const punches = groupKeyMap.get(key) || [];
      punches.sort((a, b) => a.time.localeCompare(b.time));
      const firstIn = punches[0].time;
      const emp = empMap.get(uid);
      const metrics = calculateAttendanceMetrics(firstIn, punches[punches.length - 1].time, data.selectedShift || 'auto', d, data.shifts, emp?.department_id);

      if (metrics.isLate) {
        lateCount++;
        drawRow(
          [d, `EMP-${uid}`, emp?.name || `EMP-${uid}`, metrics.detectedShift.start_time, firstIn, `+${metrics.lateMinutes} min`, `${metrics.detectedShift.grace_period_minutes || 15}m`],
          widths,
          false,
          'late'
        );
      }
    });

    if (lateCount === 0) {
      doc.text('Zero late arrivals detected during this period!', 14, currentY + 8);
    }
  }

  // 6. SUMMARY MATRIX
  else if (type === 'summary') {
    const fromD = data.startDate || '2026-08-01';
    const toD = data.endDate || '2026-08-31';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Executive Staff Attendance & Overtime Summary Matrix', 14, currentY);
    currentY += 7;

    const headers = ['EMP ID', 'Employee Name', 'Department', 'Present Days', 'Late Count', 'Total Hours', 'Overtime (OT)', 'Rate'];
    const widths = [18, 40, 36, 20, 18, 20, 20, 16];

    drawRow(headers, widths, true);

    const rangePunches = data.attendance.filter((p) => (!fromD || p.date >= fromD) && (!toD || p.date <= toD));

    data.employees.forEach((emp) => {
      const empPunches = rangePunches.filter((p) => String(p.user_id).trim() === String(emp.user_id).trim());
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

      dateMap.forEach((punches, d) => {
        punches.sort((a, b) => a.time.localeCompare(b.time));
        const firstIn = punches[0]?.time || '--:--';
        const lastOut = punches.length > 1 ? punches[punches.length - 1].time : '--:--';
        const metrics = calculateAttendanceMetrics(firstIn, lastOut, data.selectedShift || 'auto', d, data.shifts, emp.department_id);
        if (firstIn && firstIn !== '--:--') presentDays++;
        if (metrics.isLate) lateDays++;
        totalHours += metrics.hoursWorked;
        totalOtHours += metrics.overtimeHours;
      });

      const rate = presentDays > 0 ? `${Math.min(100, Math.round((presentDays / 26) * 100))}%` : '0%';

      drawRow(
        [
          `EMP-${emp.user_id}`,
          emp.name,
          (deptMap.get(String(emp.department_id)) || emp.department_name || 'Operations').substring(0, 18),
          `${presentDays} days`,
          `${lateDays}`,
          `${Math.round(totalHours)}h`,
          `+${Math.round(totalOtHours * 10) / 10}h`,
          rate
        ],
        widths,
        false,
        lateDays > 3 ? 'late' : 'none'
      );
    });
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text(`Page ${i} of ${pageCount} | ZKTeco K40 Standalone SDK Hardware Extraction`, 14, 288);
    doc.text('Confidential - LRC Karachi Operations', 140, 288);
  }

  // Save PDF
  const filename = `ZKTeco_K40_Report_${type}_${dateRangeStr.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}
