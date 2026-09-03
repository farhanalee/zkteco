<?php
/**
 * ZKTeco K40 Attendance System - Attendance Calculation & Reporting Helpers
 * Updated with per-day auto shift detection and shift assignment support
 */

namespace App;

require_once __DIR__ . '/config.php';

class AttendanceHelper {

    /**
     * Get shift pair (day/night) for a shift type
     */
    private static function getShiftPairForType(array $shifts, string $shiftType): array {
        $dayShift = null;
        $nightShift = null;
        foreach ($shifts as $s) {
            if (($s['shift_type'] ?? '') === $shiftType) {
                if (($s['is_night_shift'] ?? false)) {
                    $nightShift = $s;
                } else {
                    $dayShift = $s;
                }
            }
        }
        return ['dayShift' => $dayShift, 'nightShift' => $nightShift];
    }

    /**
     * Auto-detect shift based on punch-in time and available shifts
     * Supports multiple shift types: 12h (7-19/19-7), 8h (9-17/21-5), office (8:30-16:30)
     */
    public static function autoDetectShift(string $inTime, array $availableShifts, ?string $departmentId = null): ?array {
        if (!$inTime || $inTime === '--:--') {
            // Return default day shift (first non-night shift with is_default)
            foreach ($availableShifts as $s) {
                if (!($s['is_night_shift'] ?? false) && ($s['is_default'] ?? false)) {
                    return $s;
                }
            }
            return $availableShifts[0] ?? null;
        }

        [$hStr, $mStr] = explode(':', $inTime);
        $h = (int)$hStr;
        $m = (int)($mStr ?? '0');
        $totalMinutes = $h * 60 + $m;

        // Office departments (HR, Accounts, IT, Exec) - check around 08:00-09:30
        $officeShift = null;
        foreach ($availableShifts as $s) {
            if (($s['id'] ?? '') === 'shift_office_830_1630' || ($s['shift_type'] ?? '') === 'office') {
                $officeShift = $s;
                break;
            }
        }
        $officeDeptCodes = ['1', '6', '9', '11', '12'];
        if ($officeShift && in_array(strval($departmentId), $officeDeptCodes) && $totalMinutes >= 480 && $totalMinutes <= 570) {
            return $officeShift;
        }

        // Try each shift type in order: 12h, 8h, office
        $shiftTypes = ['12h', '8h', 'office'];

        foreach ($shiftTypes as $shiftType) {
            $pair = self::getShiftPairForType($availableShifts, $shiftType);
            $dayShift = $pair['dayShift'];
            $nightShift = $pair['nightShift'];

            if (!$dayShift || !$nightShift) continue;
            if ($shiftType === 'office') continue; // Already handled above

            $dayStart = self::parseTimeToMinutes($dayShift['start_time'] ?? '09:00');
            $dayEnd = self::parseTimeToMinutes($dayShift['end_time'] ?? '17:00');
            $nightStart = self::parseTimeToMinutes($nightShift['start_time'] ?? '19:00');
            $nightEnd = self::parseTimeToMinutes($nightShift['end_time'] ?? '07:00');

            // Day shift window: from dayStart to nightStart (exclusive)
            // e.g., 12h: 07:00 (420) to 19:00 (1140)
            // e.g., 8h: 09:00 (540) to 21:00 (1260)
            $isInDayWindow = ($totalMinutes >= $dayStart && $totalMinutes < $nightStart);
            $isInNightWindow = ($totalMinutes >= $nightStart || $totalMinutes < $dayStart);

            if ($isInDayWindow) {
                return $dayShift;
            }
            if ($isInNightWindow) {
                return $nightShift;
            }
        }

        // Fallback: find any day shift
        foreach ($availableShifts as $s) {
            if (!($s['is_night_shift'] ?? false) && ($s['is_default'] ?? false)) {
                return $s;
            }
        }
        return $availableShifts[0] ?? null;
    }

    private static function parseTimeToMinutes(string $timeStr): int {
        [$h, $m] = array_map('intval', explode(':', $timeStr));
        return $h * 60 + $m;
    }

    /**
     * Get effective shift for an employee on a specific date
     * Priority: temporary override → permanent assignment → department default → auto-detect
     */
    public static function getEffectiveShift(
        array $employee,
        array $availableShifts,
        string $dateStr,
        string $firstInTime,
        array $temporaryOverrides = []
    ): array {
        $employeeId = strval($employee['user_id'] ?? $employee['uid'] ?? '');

        // Check temporary override first
        foreach ($temporaryOverrides as $override) {
            if (strval($override['employee_id']) === $employeeId) {
                $overrideDate = new \DateTime($dateStr);
                $fromDate = new \DateTime($override['from_date']);
                $toDate = new \DateTime($override['to_date']);
                if ($overrideDate >= $fromDate && $overrideDate <= $toDate) {
                    foreach ($availableShifts as $s) {
                        if (($s['id'] ?? '') === $override['shift_id']) {
                            return ['shift' => $s, 'isAutoDetected' => false];
                        }
                    }
                }
            }
        }

        // Check permanent assignment
        if (!empty($employee['shift_id'])) {
            foreach ($availableShifts as $s) {
                if (($s['id'] ?? '') === $employee['shift_id']) {
                    return ['shift' => $s, 'isAutoDetected' => false];
                }
            }
        }

        // Check department default shift
        if (!empty($employee['department_id'])) {
            $departments = Config::get('departments', []);
            foreach ($departments as $dept) {
                if (($dept['id'] ?? '') === $employee['department_id'] && !empty($dept['default_shift_id'])) {
                    foreach ($availableShifts as $s) {
                        if (($s['id'] ?? '') === $dept['default_shift_id']) {
                            return ['shift' => $s, 'isAutoDetected' => false];
                        }
                    }
                }
            }
        }

        // Auto-detect based on punch time
        $detectedShift = self::autoDetectShift($firstInTime, $availableShifts, $employee['department_id'] ?? null);
        return ['shift' => $detectedShift, 'isAutoDetected' => true];
    }

    /**
     * Cross-midnight aware overtime + work-hours calculator.
     *
     * WHY this exists:
     *   Night shift end_time = "07:00" stored in config means NEXT-DAY 07:00.
     *   Without fix, same-date comparison gives:
     *     shiftEnd = Sept-01 07:00,  punchOut = Sept-01 21:00
     *     OT = 21:00 - 07:00 = 14h  ← WRONG (worker just started shift!)
     *
     *   With fix, isCrossMidnight detected → shiftEnd pushed to Sept-02 07:00:
     *     punchOut = Sept-01 21:00  →  OT = 0   (hasn't crossed end yet) ✓
     *     punchOut = Sept-02 09:00  →  OT = 2h  (2h past end at 07:00)   ✓
     *
     * @return array ['ot_sec' => int, 'work_sec' => int]
     */
    private static function calcShiftTotals(string $date, string $firstIn, string $lastOut, array $shift): array
    {
        $shiftStartTs = strtotime("$date " . $shift['start_time']);
        $shiftEndTs   = strtotime("$date " . $shift['end_time']);

        // Cross-midnight: end_time < start_time  (07:00 < 19:00 for night shift)
        $isCrossMidnight = ($shiftEndTs <= $shiftStartTs);
        if ($isCrossMidnight) {
            $shiftEndTs = strtotime('+1 day', $shiftEndTs); // move to next calendar day
        }

        $punchInTs  = strtotime("$date $firstIn");
        $punchOutTs = strtotime("$date $lastOut");

        // If punch-out time is less than punch-in time on cross-midnight shift,
        // the worker clocked out after midnight → add one day
        if ($isCrossMidnight && $punchOutTs < $punchInTs) {
            $punchOutTs = strtotime('+1 day', $punchOutTs);
        }

        $workSec = max(0, $punchOutTs - $punchInTs);

        // Overtime = punch-out beyond shift end
        $otSec = $punchOutTs > $shiftEndTs ? ($punchOutTs - $shiftEndTs) : 0;

        // Sanity guard: OT cannot equal or exceed a full shift (data anomaly)
        $shiftDur = $shiftEndTs - $shiftStartTs;
        if ($otSec >= $shiftDur) $otSec = 0;

        return ['ot_sec' => $otSec, 'work_sec' => $workSec];
    }

    /**
     * Get standard hours for a shift
     */
    private static function getStandardHours(array $shift): float {
        if ($shift['is_night_shift'] ?? false) {
            return ($shift['full_day_minutes'] ?? 720) / 60;
        }
        // For 12h shifts, standard is 12 hours; for 8h and office, 8 hours
        $shiftType = $shift['shift_type'] ?? '';
        if ($shiftType === '12h') {
            return ($shift['full_day_minutes'] ?? 720) / 60;
        }
        return ($shift['full_day_minutes'] ?? 480) / 60;
    }

    public static function processDailyAttendance(array $attendanceLogs, array $users, string $date, ?string $shiftId = null, ?string $departmentId = null): array {
        $shifts = Config::get('shifts', []);
        $shiftAssignments = Config::get('shift_assignments', ['employee_shifts' => [], 'temporary_overrides' => []]);

        // Map user lookup with metadata
        $userMap = [];
        foreach ($users as $u) {
            $uid = strval($u['user_id'] ?? $u['uid']);
            $userMap[$uid] = [
                'name' => $u['name'] ?? ("Employee #$uid"),
                'shift_id' => $u['shift_id'] ?? null,
                'department_id' => $u['department_id'] ?? null,
                'employment_type' => $u['employment_type'] ?? 'permanent'
            ];
        }

        // Filter logs for date
        $dayLogs = [];
        foreach ($attendanceLogs as $log) {
            if (($log['date'] ?? '') === $date) {
                $uid = strval($log['user_id']);
                if (!isset($dayLogs[$uid])) {
                    $dayLogs[$uid] = [];
                }
                $dayLogs[$uid][] = $log;
            }
        }

        $records = [];
        foreach ($dayLogs as $uid => $punches) {
            // Sort punches by time
            usort($punches, fn($a, $b) => strcmp($a['time'], $b['time']));

            $firstIn = $punches[0]['time'] ?? '--:--';
            $lastOut = count($punches) > 1 ? $punches[count($punches) - 1]['time'] : '--:--';

            // Get employee data for shift resolution
            $employee = $userMap[$uid] ?? ['name' => "EMP-$uid", 'shift_id' => null, 'department_id' => $departmentId];

            // Get effective shift for this employee on this date
            $shiftResult = self::getEffectiveShift(
                $employee,
                $shifts,
                $date,
                $firstIn,
                $shiftAssignments['temporary_overrides'] ?? []
            );
            $effectiveShift = $shiftResult['shift'];
            $isAutoDetected = $shiftResult['isAutoDetected'];

            // Calculate hours and overtime
            $totalHours = 0.0;
            $durationStr = '0h 0m';
            $overtimeStr = '0h 0m';
            $overtimeHours = 0.0;
            $isOvertime = false;
            $standardHours = self::getStandardHours($effectiveShift);

            if ($firstIn !== '--:--' && $lastOut !== '--:--' && $firstIn !== $lastOut && $effectiveShift) {
                $totals = self::calcShiftTotals($date, $firstIn, $lastOut, $effectiveShift);
                $workSec = $totals['work_sec'];
                $otSec = $totals['ot_sec'];

                $totalHours = round($workSec / 3600, 2);
                $h = floor($workSec / 3600);
                $m = floor(($workSec % 3600) / 60);
                $durationStr = "{$h}h {$m}m";

                if ($otSec > 0) {
                    $overtimeHours = round($otSec / 3600, 2);
                    $otH = floor($otSec / 3600);
                    $otM = floor(($otSec % 3600) / 60);
                    $overtimeStr = "{$otH}h {$otM}m";
                    $isOvertime = true;
                }
            }

            // Determine Status
            $status = 'Present';
            $statusBadge = 'success';
            $isLate = false;
            $lateMinutes = 0;

            if ($effectiveShift && $firstIn !== '--:--') {
                $shiftStart = strtotime("$date " . $effectiveShift['start_time']);
                $graceLimit = $shiftStart + (($effectiveShift['grace_period_minutes'] ?? 15) * 60);
                $punchInTime = strtotime("$date $firstIn");

                // Cross-midnight aware late check
                $shiftEndSame = strtotime("$date " . $effectiveShift['end_time']);
                $isCross = ($shiftEndSame <= $shiftStart);
                if (!$isCross || $punchInTime >= $shiftStart) {
                    if ($punchInTime > $graceLimit) {
                        $lateMinutes = floor(($punchInTime - $shiftStart) / 60);
                        $status = "Late ({$lateMinutes}m)";
                        $statusBadge = 'warning';
                        $isLate = true;
                    }
                }
            }

            if ($lastOut === '--:--' || $firstIn === $lastOut) {
                $status = 'Single Punch';
                $statusBadge = 'info';
            }

            $shiftDisplayName = $effectiveShift['name'] ?? 'Standard Shift';
            if ($isAutoDetected) {
                $shiftDisplayName .= ' (Auto)';
            }

            $records[] = [
                'user_id' => $uid,
                'name' => $userMap[$uid]['name'] ?? "EMP-$uid",
                'date' => $date,
                'first_in' => $firstIn,
                'last_out' => $lastOut,
                'total_hours' => $totalHours,
                'duration' => $durationStr,
                'punches_count' => count($punches),
                'status' => $status,
                'status_badge' => $statusBadge,
                'shift_name' => $shiftDisplayName,
                'detected_shift_id' => $effectiveShift['id'] ?? null,
                'detected_shift_name' => $effectiveShift['name'] ?? null,
                'is_auto_detected' => $isAutoDetected,
                'overtime' => $overtimeStr,
                'overtime_hours' => $overtimeHours,
                'is_overtime' => $isOvertime,
                'is_late' => $isLate,
                'late_minutes' => $lateMinutes,
                'standard_hours' => $standardHours
            ];
        }

        return $records;
    }

    public static function getLateReport(array $attendanceLogs, array $users, string $fromDate, string $toDate, ?string $shiftId = null): array {
        $shifts = Config::get('shifts', []);
        $shiftAssignments = Config::get('shift_assignments', ['employee_shifts' => [], 'temporary_overrides' => []]);

        $userMap = [];
        foreach ($users as $u) {
            $userMap[strval($u['user_id'] ?? $u['uid'])] = [
                'name' => $u['name'] ?? ('Employee #' . ($u['user_id'] ?? '')),
                'shift_id' => $u['shift_id'] ?? null,
                'department_id' => $u['department_id'] ?? null
            ];
        }

        // Group by user & date
        $grouped = [];
        foreach ($attendanceLogs as $log) {
            $d = $log['date'] ?? '';
            if ($d >= $fromDate && $d <= $toDate) {
                $key = ($log['user_id'] ?? '') . '_' . $d;
                if (!isset($grouped[$key])) {
                    $grouped[$key] = [];
                }
                $grouped[$key][] = $log;
            }
        }

        $lateRecords = [];
        foreach ($grouped as $key => $punches) {
            usort($punches, fn($a, $b) => strcmp($a['time'], $b['time']));
            $firstPunch = $punches[0];
            $uid = strval($firstPunch['user_id']);
            $date = $firstPunch['date'];
            $time = $firstPunch['time'];

            $employee = $userMap[$uid] ?? ['name' => "EMP-$uid", 'shift_id' => null, 'department_id' => null];
            $shiftResult = self::getEffectiveShift(
                $employee,
                $shifts,
                $date,
                $time,
                $shiftAssignments['temporary_overrides'] ?? []
            );
            $effectiveShift = $shiftResult['shift'];
            $isAutoDetected = $shiftResult['isAutoDetected'];

            if ($effectiveShift) {
                $shiftStart = strtotime("$date " . $effectiveShift['start_time']);
                $graceLimit = $shiftStart + (($effectiveShift['grace_period_minutes'] ?? 15) * 60);
                $punchTime = strtotime("$date $time");

                $shiftEndSame = strtotime("$date " . $effectiveShift['end_time']);
                $isCross = ($shiftEndSame <= $shiftStart);
                if (!$isCross || $punchTime >= $shiftStart) {
                    if ($punchTime > $graceLimit) {
                        $lateMinutes = floor(($punchTime - $shiftStart) / 60);
                        $lateRecords[] = [
                            'user_id' => $uid,
                            'name' => $userMap[$uid]['name'] ?? "EMP-$uid",
                            'date' => $date,
                            'punch_time' => $time,
                            'shift_start' => $effectiveShift['start_time'],
                            'late_minutes' => $lateMinutes,
                            'shift_name' => $effectiveShift['name'],
                            'detected_shift_id' => $effectiveShift['id'] ?? null,
                            'is_auto_detected' => $isAutoDetected
                        ];
                    }
                }
            }
        }

        return $lateRecords;
    }

    public static function getAbsentReport(array $attendanceLogs, array $users, string $date, ?string $shiftId = null): array {
        // Collect all punch user IDs for the date
        $presentIds = [];
        foreach ($attendanceLogs as $log) {
            if (($log['date'] ?? '') === $date) {
                $presentIds[strval($log['user_id'])] = true;
            }
        }

        $absentUsers = [];
        foreach ($users as $user) {
            $uid = strval($user['user_id'] ?? $user['uid']);
            if (!isset($presentIds[$uid])) {
                $absentUsers[] = [
                    'user_id' => $uid,
                    'name' => $user['name'] ?? "EMP-$uid",
                    'date' => $date,
                    'privilege' => $user['privilege_name'] ?? 'User',
                    'card_number' => $user['card_number'] ?? 'None',
                    'status' => 'Absent'
                ];
            }
        }

        return $absentUsers;
    }

    public static function exportToCsv(array $data, array $headers, string $filename = 'export.csv'): void {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');

        $out = fopen('php://output', 'w');
        // Add BOM for Excel UTF-8 recognition
        fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));
        fputcsv($out, array_values($headers));

        foreach ($data as $row) {
            $line = [];
            foreach (array_keys($headers) as $colKey) {
                $line[] = $row[$colKey] ?? '';
            }
            fputcsv($out, $line);
        }

        fclose($out);
        exit;
    }

    /**
     * Monthly Summary: one row per employee with Present/Absent/Late/OT counts
     */
    public static function getMonthlyEmployeeSummary(
        array $attendanceLogs,
        array $users,
        string $fromDate,
        string $toDate,
        ?string $shiftId = null
    ): array {
        $shifts = Config::get('shifts', []);
        $shiftAssignments = Config::get('shift_assignments', ['employee_shifts' => [], 'temporary_overrides' => []]);

        // Build all dates in range
        $allDates = [];
        $cur = new \DateTime($fromDate);
        $end = new \DateTime($toDate);
        while ($cur <= $end) {
            $allDates[] = $cur->format('Y-m-d');
            $cur->modify('+1 day');
        }
        $totalDays = count($allDates);

        // Group logs by user_id → date
        $grouped = [];
        foreach ($attendanceLogs as $log) {
            $logDate = $log['date'] ?? '';
            if ($logDate >= $fromDate && $logDate <= $toDate) {
                $uid = strval($log['user_id']);
                $grouped[$uid][$logDate][] = $log;
            }
        }

        // Build user map with metadata
        $userMap = [];
        foreach ($users as $u) {
            $uid = strval($u['user_id'] ?? $u['uid']);
            $userMap[$uid] = [
                'name' => $u['name'] ?? "EMP-$uid",
                'shift_id' => $u['shift_id'] ?? null,
                'department_id' => $u['department_id'] ?? null,
                'employment_type' => $u['employment_type'] ?? 'permanent'
            ];
        }

        $results = [];
        foreach ($users as $user) {
            $uid   = strval($user['user_id'] ?? $user['uid']);
            $name  = $user['name'] ?? "EMP-$uid";
            $present = 0; $absent = 0; $late = 0;
            $otSec = 0;
            $totalWorkSec = 0;
            $shiftTypesUsed = [];

            foreach ($allDates as $date) {
                $punches = $grouped[$uid][$date] ?? [];
                if (empty($punches)) {
                    $absent++;
                } else {
                    $present++;
                    usort($punches, fn($a, $b) => strcmp($a['time'], $b['time']));
                    $firstIn = $punches[0]['time'];
                    $lastOut = count($punches) > 1 ? $punches[count($punches)-1]['time'] : $firstIn;

                    $employee = $userMap[$uid] ?? ['name' => $name, 'shift_id' => null, 'department_id' => null];
                    $shiftResult = self::getEffectiveShift(
                        $employee,
                        $shifts,
                        $date,
                        $firstIn,
                        $shiftAssignments['temporary_overrides'] ?? []
                    );
                    $effectiveShift = $shiftResult['shift'];

                    if ($effectiveShift) {
                        $shiftTypesUsed[$effectiveShift['id']] = $effectiveShift['name'];

                        // Late check (cross-midnight aware)
                        $shiftStartTs = strtotime("$date " . $effectiveShift['start_time']);
                        $graceLimit   = $shiftStartTs + (($effectiveShift['grace_period_minutes'] ?? 15) * 60);
                        $punchInTs    = strtotime("$date $firstIn");
                        $shiftEndSame = strtotime("$date " . $effectiveShift['end_time']);
                        $isCross      = ($shiftEndSame <= $shiftStartTs);
                        if (!$isCross || $punchInTs >= $shiftStartTs) {
                            if ($punchInTs > $graceLimit) $late++;
                        }

                        // Overtime — use cross-midnight helper
                        if ($lastOut !== $firstIn) {
                            $totals = self::calcShiftTotals($date, $firstIn, $lastOut, $effectiveShift);
                            $otSec += $totals['ot_sec'];
                            $totalWorkSec += $totals['work_sec'];
                        }
                    }
                }
            }

            $otH = floor($otSec / 3600);
            $otM = floor(($otSec % 3600) / 60);

            // Determine primary shift used
            $primaryShiftName = 'N/A';
            if (!empty($shiftTypesUsed)) {
                $primaryShiftName = reset($shiftTypesUsed);
                if (count($shiftTypesUsed) > 1) {
                    $primaryShiftName .= ' +' . (count($shiftTypesUsed) - 1) . ' more';
                }
            }

            $results[] = [
                'user_id'      => $uid,
                'name'         => $name,
                'total_days'   => $totalDays,
                'present'      => $present,
                'absent'       => $absent,
                'late'         => $late,
                'overtime_sec' => $otSec,
                'overtime'     => $otSec > 0 ? "{$otH}h {$otM}m" : '0h 0m',
                'overtime_hrs' => round($otSec / 3600, 1),
                'work_hours'   => round($totalWorkSec / 3600, 1),
                'shift_name'   => $primaryShiftName,
            ];
        }
        return $results;
    }

    /**
     * Date-wise report: one row per employee per day with detected shift
     */
    public static function getDatewiseReport(
        array $attendanceLogs,
        array $users,
        string $fromDate,
        string $toDate
    ): array {
        $shifts = Config::get('shifts', []);
        $shiftAssignments = Config::get('shift_assignments', ['employee_shifts' => [], 'temporary_overrides' => []]);

        // Build all dates in range
        $allDates = [];
        $cur = new \DateTime($fromDate);
        $end = new \DateTime($toDate);
        while ($cur <= $end) {
            $allDates[] = $cur->format('Y-m-d');
            $cur->modify('+1 day');
        }

        // Group logs by user_id → date
        $grouped = [];
        foreach ($attendanceLogs as $log) {
            $logDate = $log['date'] ?? '';
            if ($logDate >= $fromDate && $logDate <= $toDate) {
                $uid = strval($log['user_id']);
                $grouped[$uid][$logDate][] = $log;
            }
        }

        // Build user map with metadata
        $userMap = [];
        foreach ($users as $u) {
            $uid = strval($u['user_id'] ?? $u['uid']);
            $userMap[$uid] = [
                'name' => $u['name'] ?? "EMP-$uid",
                'shift_id' => $u['shift_id'] ?? null,
                'department_id' => $u['department_id'] ?? null,
                'employment_type' => $u['employment_type'] ?? 'permanent'
            ];
        }

        $rows = [];
        foreach ($allDates as $date) {
            foreach ($users as $user) {
                $uid = strval($user['user_id'] ?? $user['uid']);
                $name = $user['name'] ?? "EMP-$uid";
                $punches = $grouped[$uid][$date] ?? [];

                if (empty($punches)) {
                    $rows[] = [
                        'date' => $date,
                        'day' => date('D', strtotime($date)),
                        'user_id' => $uid,
                        'name' => $name,
                        'first_in' => '--:--',
                        'last_out' => '--:--',
                        'duration' => '0h 0m',
                        'hours' => 0,
                        'status' => 'Absent',
                        'status_badge' => 'danger',
                        'overtime' => '0h 0m',
                        'overtime_hours' => 0,
                        'shift_name' => '—',
                        'detected_shift_id' => null,
                        'is_auto_detected' => false
                    ];
                } else {
                    usort($punches, fn($a, $b) => strcmp($a['time'], $b['time']));
                    $firstIn = $punches[0]['time'];
                    $lastOut = count($punches) > 1 ? $punches[count($punches)-1]['time'] : $firstIn;

                    $employee = $userMap[$uid] ?? ['name' => $name, 'shift_id' => null, 'department_id' => null];
                    $shiftResult = self::getEffectiveShift(
                        $employee,
                        $shifts,
                        $date,
                        $firstIn,
                        $shiftAssignments['temporary_overrides'] ?? []
                    );
                    $effectiveShift = $shiftResult['shift'];
                    $isAutoDetected = $shiftResult['isAutoDetected'];

                    $workSec = 0; $hours = 0; $otStr = '0h 0m'; $otHours = 0; $isOvertime = false;
                    if ($firstIn !== $lastOut && $effectiveShift) {
                        $totals = self::calcShiftTotals($date, $firstIn, $lastOut, $effectiveShift);
                        $workSec = $totals['work_sec'];
                        $daySec = $totals['ot_sec'];
                        if ($workSec > 0) { $hours = round($workSec / 3600, 1); }
                        if ($daySec > 0) {
                            $otH = floor($daySec / 3600);
                            $otM = floor(($daySec % 3600) / 60);
                            $otStr = "{$otH}h {$otM}m";
                            $otHours = round($daySec / 3600, 1);
                            $isOvertime = true;
                        }
                    }

                    $status = 'Present'; $statusBadge = 'success';
                    if ($effectiveShift) {
                        $shiftStartTs = strtotime("$date " . $effectiveShift['start_time']);
                        $shiftEndSame = strtotime("$date " . $effectiveShift['end_time']);
                        $isCross = ($shiftEndSame <= $shiftStartTs);
                        $graceLimit = $shiftStartTs + (($effectiveShift['grace_period_minutes'] ?? 15) * 60);
                        $punchInTs = strtotime("$date $firstIn");
                        if (!$isCross || $punchInTs >= $shiftStartTs) {
                            if ($punchInTs > $graceLimit) {
                                $lateMin = floor(($punchInTs - $shiftStartTs) / 60);
                                $status = "Late ({$lateMin}m)";
                                $statusBadge = 'warning';
                            }
                        }
                    }

                    $shiftDisplayName = $effectiveShift['name'] ?? '—';
                    if ($isAutoDetected) {
                        $shiftDisplayName .= ' (Auto)';
                    }

                    $rows[] = [
                        'date' => $date,
                        'day' => date('D', strtotime($date)),
                        'user_id' => $uid,
                        'name' => $name,
                        'first_in' => $firstIn,
                        'last_out' => $lastOut,
                        'duration' => $workSec > 0 ? floor($workSec/3600) . 'h ' . floor(($workSec%3600)/60) . 'm' : '0h 0m',
                        'hours' => $hours,
                        'status' => $status,
                        'status_badge' => $statusBadge,
                        'overtime' => $otStr,
                        'overtime_hours' => $otHours,
                        'is_overtime' => $isOvertime,
                        'shift_name' => $shiftDisplayName,
                        'detected_shift_id' => $effectiveShift['id'] ?? null,
                        'detected_shift_name' => $effectiveShift['name'] ?? null,
                        'is_auto_detected' => $isAutoDetected
                    ];
                }
            }
        }
        return $rows;
    }

    /**
     * Consolidated single-employee report: daily rows + aggregate summary
     */
    public static function getEmployeeConsolidated(
        array $attendanceLogs,
        array $users,
        string $uid,
        string $fromDate,
        string $toDate,
        ?string $shiftId = null
    ): array {
        $shifts = Config::get('shifts', []);
        $shiftAssignments = Config::get('shift_assignments', ['employee_shifts' => [], 'temporary_overrides' => []]);

        $empName = "EMP-$uid";
        foreach ($users as $u) {
            if (strval($u['user_id'] ?? $u['uid']) === $uid) {
                $empName = $u['name'] ?? $empName;
                break;
            }
        }

        // All dates in range
        $allDates = [];
        $cur = new \DateTime($fromDate);
        $end = new \DateTime($toDate);
        while ($cur <= $end) {
            $allDates[] = $cur->format('Y-m-d');
            $cur->modify('+1 day');
        }

        // Group this employee's punches by date
        $grouped = [];
        foreach ($attendanceLogs as $log) {
            if (strval($log['user_id']) !== $uid) continue;
            $logDate = $log['date'] ?? '';
            if ($logDate >= $fromDate && $logDate <= $toDate) {
                $grouped[$logDate][] = $log;
            }
        }

        // Employee metadata
        $employee = ['name' => $empName, 'shift_id' => null, 'department_id' => null];
        foreach ($users as $u) {
            if (strval($u['user_id'] ?? $u['uid']) === $uid) {
                $employee['shift_id'] = $u['shift_id'] ?? null;
                $employee['department_id'] = $u['department_id'] ?? null;
                break;
            }
        }

        $rows = [];
        $totalPresent = 0; $totalAbsent = 0; $totalLate = 0;
        $totalWorkSec = 0; $totalOTSec = 0;
        $shiftTypesUsed = [];

        foreach ($allDates as $date) {
            $punches = $grouped[$date] ?? [];

            if (empty($punches)) {
                $rows[] = [
                    'date'          => $date,
                    'day'           => date('D', strtotime($date)),
                    'first_in'      => '--:--',
                    'last_out'      => '--:--',
                    'hours'         => 0,
                    'status'        => 'Absent',
                    'status_badge'  => 'danger',
                    'overtime'      => '0h 0m',
                    'overtime_min'  => 0,
                    'shift_name'    => '—',
                    'detected_shift_id' => null,
                    'is_auto_detected' => false
                ];
                $totalAbsent++;
            } else {
                usort($punches, fn($a, $b) => strcmp($a['time'], $b['time']));
                $firstIn  = $punches[0]['time'];
                $lastOut  = count($punches) > 1 ? $punches[count($punches)-1]['time'] : $firstIn;

                // Work hours + Overtime — both cross-midnight aware
                $workSec = 0; $hours = 0; $otStr = '0h 0m'; $otMin = 0; $isOvertime = false;
                $shiftResult = self::getEffectiveShift(
                    $employee,
                    $shifts,
                    $date,
                    $firstIn,
                    $shiftAssignments['temporary_overrides'] ?? []
                );
                $effectiveShift = $shiftResult['shift'];
                $isAutoDetected = $shiftResult['isAutoDetected'];

                if ($effectiveShift) {
                    $shiftTypesUsed[$effectiveShift['id']] = $effectiveShift['name'];
                    $totals = self::calcShiftTotals($date, $firstIn, $lastOut, $effectiveShift);
                    $workSec = $totals['work_sec'];
                    $daySec = $totals['ot_sec'];
                    if ($workSec > 0) { $totalWorkSec += $workSec; $hours = round($workSec / 3600, 1); }
                    if ($daySec > 0) {
                        $totalOTSec += $daySec;
                        $otH = floor($daySec / 3600);
                        $otM = floor(($daySec % 3600) / 60);
                        $otStr = "{$otH}h {$otM}m";
                        $otMin = floor($daySec / 60);
                        $isOvertime = true;
                    }
                } elseif ($firstIn !== $lastOut) {
                    // No shift config: plain difference
                    $diff = strtotime("$date $lastOut") - strtotime("$date $firstIn");
                    if ($diff > 0) { $workSec = $diff; $totalWorkSec += $diff; $hours = round($diff / 3600, 1); }
                }

                // Late check (cross-midnight aware)
                $status = 'Present'; $statusBadge = 'success'; $isLate = false;
                if ($effectiveShift) {
                    $shiftStartTs = strtotime("$date " . $effectiveShift['start_time']);
                    $shiftEndSame = strtotime("$date " . $effectiveShift['end_time']);
                    $isCross = ($shiftEndSame <= $shiftStartTs);
                    $graceLimit = $shiftStartTs + (($effectiveShift['grace_period_minutes'] ?? 15) * 60);
                    $punchInTs = strtotime("$date $firstIn");
                    if (!$isCross || $punchInTs >= $shiftStartTs) {
                        if ($punchInTs > $graceLimit) {
                            $lateMin = floor(($punchInTs - $shiftStartTs) / 60);
                            $status = "Late ({$lateMin}m)";
                            $statusBadge = 'warning';
                            $isLate = true;
                            $totalLate++;
                        }
                    }
                }

                $totalPresent++;
                $shiftDisplayName = $effectiveShift['name'] ?? '—';
                if ($isAutoDetected) {
                    $shiftDisplayName .= ' (Auto)';
                }

                $rows[] = [
                    'date'          => $date,
                    'day'           => date('D', strtotime($date)),
                    'first_in'      => $firstIn,
                    'last_out'      => $lastOut,
                    'hours'         => $hours,
                    'status'        => $status,
                    'status_badge'  => $statusBadge,
                    'overtime'      => $otStr,
                    'overtime_min'  => $otMin,
                    'is_overtime'   => $isOvertime,
                    'shift_name'    => $shiftDisplayName,
                    'detected_shift_id' => $effectiveShift['id'] ?? null,
                    'detected_shift_name' => $effectiveShift['name'] ?? null,
                    'is_auto_detected' => $isAutoDetected
                ];
            }
        }

        $otTotalH = floor($totalOTSec / 3600);
        $otTotalM = floor(($totalOTSec % 3600) / 60);

        // Determine primary shift
        $primaryShiftName = 'N/A';
        if (!empty($shiftTypesUsed)) {
            $primaryShiftName = reset($shiftTypesUsed);
            if (count($shiftTypesUsed) > 1) {
                $primaryShiftName .= ' +' . (count($shiftTypesUsed) - 1) . ' more';
            }
        }

        return [
            'name'               => $empName,
            'uid'                => $uid,
            'rows'               => $rows,
            'total_days'         => count($allDates),
            'total_present'      => $totalPresent,
            'total_absent'       => $totalAbsent,
            'total_late'         => $totalLate,
            'total_work_hours'   => round($totalWorkSec / 3600, 1),
            'total_ot_str'       => $totalOTSec > 0 ? "{$otTotalH}h {$otTotalM}m" : '0h 0m',
            'total_ot_hours'     => round($totalOTSec / 3600, 1),
            'shift'              => $primaryShiftName,
            'shift_types_used'   => $shiftTypesUsed,
        ];
    }
}