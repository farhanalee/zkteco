import { Shift, AttendanceRecord, Employee, Department } from '../types';

export interface ShiftCalculationResult {
  detectedShift: Shift;
  isAutoDetected: boolean;
  hoursWorked: number;
  durationStr: string;
  standardHours: number;
  overtimeHours: number;
  overtimeStr: string;
  isOvertime: boolean;
  isLate: boolean;
  lateMinutes: number;
  status: 'Present' | 'Single Punch' | 'Late' | 'Overtime' | 'Absent';
}

/**
 * Formats minutes into human-readable string (e.g., "8h 30m" or "0h 0m")
 */
export function formatMinutes(mins: number): string {
  if (!mins || mins <= 0) return '0h 0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

/**
 * Get the pair of day/night shifts for a given shift_type
 */
function getShiftPairForType(shifts: Shift[], shiftType: string): { dayShift: Shift | null; nightShift: Shift | null } {
  const dayShift = shifts.find(s => s.shift_type === shiftType && !s.is_night_shift) || null;
  const nightShift = shifts.find(s => s.shift_type === shiftType && s.is_night_shift) || null;
  return { dayShift, nightShift };
}

/**
 * Automatically deduce the duty shift based on actual Check-In punch time.
 * Handles multiple shift types: 12h (7-19/19-7), 8h (9-17/21-5), office (8:30-16:30)
 *
 * Logic:
 * - For each shift_type, find the day/night pair
 * - Check if punch-in falls within the day shift window or night shift window
 * - Office departments use office shift if within 08:00-09:30 window
 */
export function autoDetectShift(
  inTime: string,
  availableShifts: Shift[],
  departmentId?: string
): Shift {
  if (!inTime || inTime === '--:--') {
    // Return default day shift (first non-night shift)
    return availableShifts.find(s => !s.is_night_shift && s.is_default) || availableShifts[0];
  }

  const [hStr, mStr] = inTime.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  const totalMinutes = h * 60 + m;

  // Office departments (HR, Accounts, IT, Exec) - check around 08:00-09:30
  const officeShift = availableShifts.find(s => s.id === 'shift_office_830_1630') || availableShifts.find(s => s.shift_type === 'office');
  if (['1', '6', '9', '11', '12'].includes(String(departmentId)) && totalMinutes >= 480 && totalMinutes <= 570 && officeShift) {
    return officeShift;
  }

  // Try each shift type in order: 12h, 8h, office
  const shiftTypes = ['12h', '8h', 'office'];

  for (const shiftType of shiftTypes) {
    const { dayShift, nightShift } = getShiftPairForType(availableShifts, shiftType);

    if (!dayShift || !nightShift) continue;

    const dayStart = parseTimeToMinutes(dayShift.start_time);
    const dayEnd = parseTimeToMinutes(dayShift.end_time);
    const nightStart = parseTimeToMinutes(nightShift.start_time);
    const nightEnd = parseTimeToMinutes(nightShift.end_time);

    // Day shift window: from dayStart to nightStart (exclusive)
    // e.g., 12h: 07:00 (420) to 19:00 (1140)
    // e.g., 8h: 09:00 (540) to 21:00 (1260)
    // e.g., office: 08:30 (510) to 16:30 (990) -- but office has no night pair, handled above

    if (shiftType === 'office') continue; // Already handled

    const isInDayWindow = totalMinutes >= dayStart && totalMinutes < nightStart;
    const isInNightWindow = totalMinutes >= nightStart || totalMinutes < dayStart;

    if (isInDayWindow) {
      return dayShift;
    }
    if (isInNightWindow) {
      return nightShift;
    }
  }

  // Fallback: find any day shift
  return availableShifts.find(s => !s.is_night_shift && s.is_default) || availableShifts[0];
}

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Get the assigned shift for an employee based on their permanent assignment
 * Falls back to auto-detection if no assignment
 * Priority: temporary override → permanent assignment → department default → auto-detect
 */
export function getEffectiveShift(
  employee: Employee,
  availableShifts: Shift[],
  dateStr: string,
  firstInTime: string,
  temporaryOverrides?: Map<string, { shiftId: string; fromDate: string; toDate: string }>,
  departments?: Department[]
): { shift: Shift; isAutoDetected: boolean } {
  // Check temporary override first
  if (temporaryOverrides) {
    const override = temporaryOverrides.get(String(employee.user_id));
    if (override) {
      const overrideDate = new Date(dateStr);
      const fromDate = new Date(override.fromDate);
      const toDate = new Date(override.toDate);
      if (overrideDate >= fromDate && overrideDate <= toDate) {
        const overrideShift = availableShifts.find(s => s.id === override.shiftId);
        if (overrideShift) {
          return { shift: overrideShift, isAutoDetected: false };
        }
      }
    }
  }

  // Check permanent assignment
  if (employee.shift_id) {
    const assignedShift = availableShifts.find(s => s.id === employee.shift_id);
    if (assignedShift) {
      return { shift: assignedShift, isAutoDetected: false };
    }
  }

  // Check department default shift
  if (employee.department_id && departments) {
    const dept = departments.find(d => String(d.id) === String(employee.department_id));
    if (dept && dept.default_shift_id) {
      const deptDefaultShift = availableShifts.find(s => s.id === dept.default_shift_id);
      if (deptDefaultShift) {
        return { shift: deptDefaultShift, isAutoDetected: false };
      }
    }
  }

  // Auto-detect based on punch time
  const detectedShift = autoDetectShift(firstInTime, availableShifts, employee.department_id);
  return { shift: detectedShift, isAutoDetected: true };
}

/**
 * Calculates work hours, late penalty, and overtime (OT) for a day's punches.
 * Supports both fixed shift mode and intelligent Auto-Shift rotation detection.
 */
export function calculateAttendanceMetrics(
  firstInTime: string,
  lastOutTime: string,
  shiftOrMode: Shift | 'auto',
  dateStr: string,
  allShifts: Shift[],
  departmentId?: string,
  employee?: Employee,
  temporaryOverrides?: Map<string, { shiftId: string; fromDate: string; toDate: string }>,
  departments?: Department[]
): ShiftCalculationResult {
  let isAuto = false;
  let effectiveShift: Shift;

  if (shiftOrMode === 'auto') {
    // If employee provided, use their assigned shift with auto-detect fallback
    if (employee) {
      const result = getEffectiveShift(employee, allShifts, dateStr, firstInTime, temporaryOverrides, departments);
      effectiveShift = result.shift;
      isAuto = result.isAutoDetected;
    } else {
      effectiveShift = autoDetectShift(firstInTime, allShifts, departmentId);
      isAuto = true;
    }
  } else {
    effectiveShift = shiftOrMode;
  }

  const standardHours = effectiveShift.is_night_shift
    ? (effectiveShift.full_day_minutes ? effectiveShift.full_day_minutes / 60 : 12.0)
    : (effectiveShift.full_day_minutes ? effectiveShift.full_day_minutes / 60 : (effectiveShift.shift_type === '12h' ? 12.0 : 8.0));

  if (!firstInTime || firstInTime === '--:--') {
    return {
      detectedShift: effectiveShift,
      isAutoDetected: isAuto,
      hoursWorked: 0,
      durationStr: '0h 0m',
      standardHours,
      overtimeHours: 0,
      overtimeStr: '0h 0m',
      isOvertime: false,
      isLate: false,
      lateMinutes: 0,
      status: 'Absent',
    };
  }

  const [inH, inM] = firstInTime.split(':').map(Number);
  const [shiftStartH, shiftStartM] = effectiveShift.start_time.split(':').map(Number);

  const punchInMinutes = inH * 60 + inM;
  const shiftStartMinutes = shiftStartH * 60 + shiftStartM;
  const graceMinutes = effectiveShift.grace_period_minutes || 15;

  let lateMinutes = 0;
  let isLate = false;

  // Late calculation for Day Shift vs Night Shift
  if (effectiveShift.is_night_shift) {
    // Night Shift starts at e.g. 19:00 (1140 mins) or 21:00 (1260 mins)
    if (punchInMinutes > shiftStartMinutes + graceMinutes && punchInMinutes < 1440) {
      lateMinutes = punchInMinutes - shiftStartMinutes;
      isLate = true;
    } else if (punchInMinutes < 300 && shiftStartMinutes >= 1140) {
      // Punched after midnight (e.g., 00:30 when shift starts at 19:00 or 21:00)
      lateMinutes = (punchInMinutes + 1440) - shiftStartMinutes;
      isLate = true;
    }
  } else {
    // Day/Office shift
    if (punchInMinutes > shiftStartMinutes + graceMinutes && punchInMinutes < shiftStartMinutes + 360) {
      lateMinutes = punchInMinutes - shiftStartMinutes;
      isLate = true;
    }
  }

  let hoursWorked = 0;
  let durationStr = '0h 0m';

  if (lastOutTime && lastOutTime !== '--:--' && lastOutTime !== firstInTime) {
    const [outH, outM] = lastOutTime.split(':').map(Number);
    let outMinutes = outH * 60 + outM;

    // Overnight shift: punch out is next morning (e.g., In 19:00, Out 07:15 next day)
    if ((effectiveShift.is_night_shift || outMinutes < punchInMinutes) && outMinutes < punchInMinutes) {
      outMinutes += 24 * 60;
    }

    const diffMinutes = Math.max(0, outMinutes - punchInMinutes);
    hoursWorked = Math.round((diffMinutes / 60) * 100) / 100;
    durationStr = formatMinutes(diffMinutes);
  }

  // Calculate Overtime (OT)
  // If employee works more than their standard shift (e.g. >12h or >8h), count the excess
  let overtimeHours = 0;
  let overtimeStr = '0h 0m';
  let isOvertime = false;

  if (hoursWorked > standardHours) {
    overtimeHours = Math.round((hoursWorked - standardHours) * 100) / 100;
    overtimeStr = formatMinutes(Math.round(overtimeHours * 60));
    isOvertime = true;
  }

  let status: ShiftCalculationResult['status'] = 'Present';
  if (!lastOutTime || lastOutTime === '--:--' || lastOutTime === firstInTime) {
    status = 'Single Punch';
  } else if (isOvertime && !isLate) {
    status = 'Overtime';
  } else if (isLate) {
    status = 'Late';
  }

  return {
    detectedShift: effectiveShift,
    isAutoDetected: isAuto,
    hoursWorked,
    durationStr,
    standardHours,
    overtimeHours,
    overtimeStr,
    isOvertime,
    isLate,
    lateMinutes,
    status,
  };
}