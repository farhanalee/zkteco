import { AttendanceRecord, Employee, Department, Shift, Designation, ZKTecoDevice, MdbDatabaseStats, ShiftOverride } from '../types';

// 1. ZKTeco Terminals (3 Machines deployed at LRC Karachi Toll Operations)
export const initialDevices: ZKTecoDevice[] = [
  {
    id: 'dev_1',
    sensor_id: 1,
    name: 'Terminal 1 - Karachi North Entry Plaza (K40)',
    ip_address: '192.168.227.180',
    port: 4370,
    comm_key: 0,
    timeout: 5,
    auto_refresh_interval: 30,
    status: 'Connected',
    last_sync: 'Just now',
    serial_number: 'BK82918370129',
    firmware_version: 'Ver 6.60 (ZEM560)',
    platform: 'ZEM560 / Linux Standalone',
    mac_address: '00:17:61:A4:B2:99',
    user_count: 2466,
    user_capacity: 3000,
    fingerprint_count: 490,
    fingerprint_capacity: 3000,
    attendance_count: 14778,
    attendance_capacity: 100000,
    device_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
    pc_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
    time_diff_seconds: 0,
    location: 'North Entry Lanes 1-6 Booth Gantry'
  },
  {
    id: 'dev_2',
    sensor_id: 2,
    name: 'Terminal 2 - Karachi South Exit Plaza (K40)',
    ip_address: '192.168.227.181',
    port: 4370,
    comm_key: 0,
    timeout: 5,
    auto_refresh_interval: 30,
    status: 'Connected',
    last_sync: 'Just now',
    serial_number: 'BK82918370130',
    firmware_version: 'Ver 6.60 (ZEM560)',
    platform: 'ZEM560 / Linux Standalone',
    mac_address: '00:17:61:A4:B2:9A',
    user_count: 2466,
    user_capacity: 3000,
    fingerprint_count: 490,
    fingerprint_capacity: 3000,
    attendance_count: 14778,
    attendance_capacity: 100000,
    device_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
    pc_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
    time_diff_seconds: 0,
    location: 'South Exit Lanes 7-12 Booth Gantry'
  },
  {
    id: 'dev_3',
    sensor_id: 3,
    name: 'Terminal 3 - Admin & Operations Building (K40)',
    ip_address: '192.168.227.182',
    port: 4370,
    comm_key: 0,
    timeout: 5,
    auto_refresh_interval: 30,
    status: 'Connected',
    last_sync: 'Just now',
    serial_number: 'BK82918370131',
    firmware_version: 'Ver 6.60 (ZEM560)',
    platform: 'ZEM560 / Linux Standalone',
    mac_address: '00:17:61:A4:B2:9B',
    user_count: 2466,
    user_capacity: 3000,
    fingerprint_count: 490,
    fingerprint_capacity: 3000,
    attendance_count: 14778,
    attendance_capacity: 100000,
    device_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
    pc_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
    time_diff_seconds: 0,
    location: 'Operations Main Lobby / Server Room'
  }
];

// 2. MDB Database Metadata (att2000.mdb / LRC Karachi Toll Operations)
export const initialMdbStats: MdbDatabaseStats = {
  database_name: 'att2000.mdb (Access MDB Database)',
  total_users: 2466,
  total_punches: 14778,
  total_departments: 13,
  total_templates: 490,
  total_machines: 3,
  operation_name: 'LRC Karachi Toll Operations',
  last_synced: '2026-09-01 07:00:00'
};

// 3. SchClass - 3 Shifts
export const initialShifts: Shift[] = [
  { 
    id: 'shift_day_7_19', 
    schclass_id: 1,
    name: 'Daytime 7-19 (07:00 AM - 07:00 PM)', 
    start_time: '07:00', 
    end_time: '19:00', 
    grace_period_minutes: 15, 
    late_threshold_minutes: 30, 
    half_day_minutes: 360, 
    full_day_minutes: 720, 
    is_night_shift: false, 
    is_default: true,
    sunday_is_holiday: true,
    sunday_overtime_enabled: false,
    sunday_overtime_rate: 2.0,
  },
  { 
    id: 'shift_night_19_7', 
    schclass_id: 2,
    name: 'Night 19-7 (07:00 PM - 07:00 AM)', 
    start_time: '19:00', 
    end_time: '07:00', 
    grace_period_minutes: 15, 
    late_threshold_minutes: 30, 
    half_day_minutes: 360, 
    full_day_minutes: 720, 
    is_night_shift: true, 
    is_default: false,
    sunday_is_holiday: true,
    sunday_overtime_enabled: false,
    sunday_overtime_rate: 2.0,
  },
  { 
    id: 'shift_office_830_1630', 
    schclass_id: 3,
    name: 'Office 8:30-16:30 (08:30 AM - 04:30 PM)', 
    start_time: '08:30', 
    end_time: '16:30', 
    grace_period_minutes: 15, 
    late_threshold_minutes: 30, 
    half_day_minutes: 240, 
    full_day_minutes: 480, 
    is_night_shift: false, 
    is_default: false,
    sunday_is_holiday: true,
    sunday_overtime_enabled: false,
    sunday_overtime_rate: 1.5,
  }
];

// 4. DEPARTMENTS - 13 Departments Hierarchy (DEPTID 1-13)
export const initialDepartments: Department[] = [
  { id: '1', dept_id_num: 1, code: 'OPS-MAIN', name: 'Plaza Operations (LRC Karachi Tollway)', manager: 'EMP-1001', employee_count: 640 },
  { id: '2', dept_id_num: 2, code: 'TOLL-A', name: 'Toll Collection - Shift A (Day)', manager: 'EMP-1002', employee_count: 520, sup_dept_id: '1' },
  { id: '3', dept_id_num: 3, code: 'TOLL-B', name: 'Toll Collection - Shift B (Night)', manager: 'EMP-1004', employee_count: 480, sup_dept_id: '1' },
  { id: '4', dept_id_num: 4, code: 'LANE-MGT', name: 'Lane Management & Traffic Control', manager: 'EMP-1003', employee_count: 240, sup_dept_id: '1' },
  { id: '5', dept_id_num: 5, code: 'WEIGH-STN', name: 'Weigh Station & Axle Load Control', manager: 'EMP-1005', employee_count: 110, sup_dept_id: '1' },
  { id: '6', dept_id_num: 6, code: 'ACC-REV', name: 'Accounts & Revenue Reconciliation', manager: 'EMP-1006', employee_count: 85, sup_dept_id: '1' },
  { id: '7', dept_id_num: 7, code: 'ETC-TAG', name: 'Electronic Toll Collection (Smart Pass / ETC)', manager: 'EMP-1007', employee_count: 65, sup_dept_id: '1' },
  { id: '8', dept_id_num: 8, code: 'SEC-CCTV', name: 'Security & Surveillance Command Center', manager: 'EMP-1008', employee_count: 130, sup_dept_id: '1' },
  { id: '9', dept_id_num: 9, code: 'IT-BIO', name: 'IT & Biometrics Network Infrastructure', manager: 'EMP-1009', employee_count: 45, sup_dept_id: '1' },
  { id: '10', dept_id_num: 10, code: 'MECH-ELEC', name: 'Mechanical & Electrical Maintenance', manager: 'EMP-1010', employee_count: 60, sup_dept_id: '1' },
  { id: '11', dept_id_num: 11, code: 'HR-ADMIN', name: 'Human Resources & Administration', manager: 'EMP-1011', employee_count: 35, sup_dept_id: '1' },
  { id: '12', dept_id_num: 12, code: 'EXEC-MGT', name: 'Plaza Management & Operations Executive', manager: 'EMP-1012', employee_count: 18, sup_dept_id: '1' },
  { id: '13', dept_id_num: 13, code: 'SAFETY-EMG', name: 'Safety & Emergency Response Unit', manager: 'EMP-1013', employee_count: 38, sup_dept_id: '1' }
];

// 5. Designations
export const initialDesignations: Designation[] = [
  { id: 'desig_1', title: 'Plaza Operations Incharge', department_id: '1', level: 'Executive' },
  { id: 'desig_2', title: 'Shift Supervisor (Day)', department_id: '2', level: 'Supervisor' },
  { id: 'desig_3', title: 'Shift Supervisor (Night)', department_id: '3', level: 'Supervisor' },
  { id: 'desig_4', title: 'Senior Toll Collector', department_id: '2', level: 'Senior Operator' },
  { id: 'desig_5', title: 'Toll Booth Operator', department_id: '3', level: 'Operator' },
  { id: 'desig_6', title: 'Lane Traffic Controller', department_id: '4', level: 'Staff' },
  { id: 'desig_7', title: 'Weighbridge Inspector', department_id: '5', level: 'Inspector' },
  { id: 'desig_8', title: 'Cash Reconciliation Officer', department_id: '6', level: 'Officer' },
  { id: 'desig_9', title: 'Smart Tag / ETC Technician', department_id: '7', level: 'Technical' },
  { id: 'desig_10', title: 'Security Command Officer', department_id: '8', level: 'Security' },
  { id: 'desig_11', title: 'Biometrics & Network Systems Admin', department_id: '9', level: 'Specialist' },
  { id: 'desig_12', title: 'Electrical & Power Generator Engineer', department_id: '10', level: 'Engineer' },
  { id: 'desig_13', title: 'HR & Payroll Assistant', department_id: '11', level: 'Admin' },
  { id: 'desig_14', title: 'Emergency Response First Responder', department_id: '13', level: 'Emergency' }
];

// 6. Active Employees representing LRC Karachi Toll Operations Staff (from 2466 total enrolled USERINFO)
export const initialEmployees: Employee[] = [
  { 
    uid: 1, 
    user_id: '1001', 
    name: 'Farhan Ali', 
    privilege: 14, 
    privilege_name: 'Super Admin', 
    card_number: '8491001', 
    enabled: true, 
    department_id: '1', 
    department_name: 'Plaza Operations (LRC Karachi Tollway)',
    designation_title: 'Plaza Operations Incharge',
    shift_id: 'shift_office_830_1630',
    has_fingerprint: true 
  },
  { 
    uid: 2, 
    user_id: '1002', 
    name: 'Muhammad Tariq Mehmood', 
    privilege: 6, 
    privilege_name: 'Manager', 
    card_number: '8491002', 
    enabled: true, 
    department_id: '2', 
    department_name: 'Toll Collection - Shift A (Day)',
    designation_title: 'Shift Supervisor (Day)',
    shift_id: 'shift_day_7_19',
    has_fingerprint: true 
  },
  { 
    uid: 3, 
    user_id: '1003', 
    name: 'Syed Imran Shah', 
    privilege: 0, 
    privilege_name: 'User', 
    card_number: '8491003', 
    enabled: true, 
    department_id: '4', 
    department_name: 'Lane Management & Traffic Control',
    designation_title: 'Lane Traffic Controller',
    shift_id: 'shift_day_7_19',
    has_fingerprint: true 
  },
  { 
    uid: 4, 
    user_id: '1004', 
    name: 'Bilal Ahmed Khan', 
    privilege: 6, 
    privilege_name: 'Manager', 
    card_number: '8491004', 
    enabled: true, 
    department_id: '3', 
    department_name: 'Toll Collection - Shift B (Night)',
    designation_title: 'Shift Supervisor (Night)',
    shift_id: 'shift_night_19_7',
    has_fingerprint: true 
  },
  { 
    uid: 5, 
    user_id: '1005', 
    name: 'Rashid Minhas', 
    privilege: 0, 
    privilege_name: 'User', 
    card_number: '8491005', 
    enabled: true, 
    department_id: '5', 
    department_name: 'Weigh Station & Axle Load Control',
    designation_title: 'Weighbridge Inspector',
    shift_id: 'shift_day_7_19',
    has_fingerprint: true 
  },
  { 
    uid: 6, 
    user_id: '1006', 
    name: 'Khurram Shahzad', 
    privilege: 0, 
    privilege_name: 'User', 
    card_number: '8491006', 
    enabled: true, 
    department_id: '6', 
    department_name: 'Accounts & Revenue Reconciliation',
    designation_title: 'Cash Reconciliation Officer',
    shift_id: 'shift_office_830_1630',
    has_fingerprint: true 
  },
  { 
    uid: 7, 
    user_id: '1007', 
    name: 'Zubair Akhtar', 
    privilege: 0, 
    privilege_name: 'User', 
    card_number: '8491007', 
    enabled: true, 
    department_id: '7', 
    department_name: 'Electronic Toll Collection (Smart Pass / ETC)',
    designation_title: 'Smart Tag / ETC Technician',
    shift_id: 'shift_day_7_19',
    has_fingerprint: true 
  },
  { 
    uid: 8, 
    user_id: '1008', 
    name: 'Kamran Aslam', 
    privilege: 0, 
    privilege_name: 'User', 
    card_number: '8491008', 
    enabled: true, 
    department_id: '8', 
    department_name: 'Security & Surveillance Command Center',
    designation_title: 'Security Command Officer',
    shift_id: 'shift_night_19_7',
    has_fingerprint: true 
  },
  { 
    uid: 9, 
    user_id: '1009', 
    name: 'Muhammad Asif', 
    privilege: 14, 
    privilege_name: 'Super Admin', 
    card_number: '8491009', 
    enabled: true, 
    department_id: '9', 
    department_name: 'IT & Biometrics Network Infrastructure',
    designation_title: 'Biometrics & Network Systems Admin',
    shift_id: 'shift_office_830_1630',
    has_fingerprint: true 
  },
  { 
    uid: 10, 
    user_id: '1010', 
    name: 'Naveed Iqbal', 
    privilege: 0, 
    privilege_name: 'User', 
    card_number: '8491010', 
    enabled: true, 
    department_id: '10', 
    department_name: 'Mechanical & Electrical Maintenance',
    designation_title: 'Electrical & Power Generator Engineer',
    shift_id: 'shift_day_7_19',
    has_fingerprint: true 
  },
  { 
    uid: 11, 
    user_id: '1011', 
    name: 'Sobia Batool', 
    privilege: 2, 
    privilege_name: 'Enroller', 
    card_number: '8491011', 
    enabled: true, 
    department_id: '11', 
    department_name: 'Human Resources & Administration',
    designation_title: 'HR & Payroll Assistant',
    shift_id: 'shift_office_830_1630',
    has_fingerprint: true 
  },
  { 
    uid: 12, 
    user_id: '1012', 
    name: 'Waseem Akram', 
    privilege: 0, 
    privilege_name: 'User', 
    card_number: '8491012', 
    enabled: true, 
    department_id: '3', 
    department_name: 'Toll Collection - Shift B (Night)',
    designation_title: 'Toll Booth Operator',
    shift_id: 'shift_night_19_7',
    has_fingerprint: true 
  }
];

// Helper to get deterministic punch time offsets
function getPseudoTime(seed: number, baseH: number, baseM: number, jitterMaxMins: number): string {
  const pseudoRand = ((seed * 9301 + 49297) % 233280) / 233280;
  const jitter = Math.floor(pseudoRand * jitterMaxMins);
  const totalMins = baseH * 60 + baseM + jitter;
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  const s = Math.floor(pseudoRand * 59);
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

// Generate complete attendance records for August 2026, with GUARANTEED full records on 2026-08-17
export function generateAugustAttendanceRecords(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  let idCounter = 1000;

  // August 1st to August 31st
  for (let day = 1; day <= 31; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const dateStr = `2026-08-${dayStr}`;
    const isSpecialTargetDate = (dateStr === '2026-08-17'); // 2026-08-17 MUST have 100% full records for all staff

    initialEmployees.forEach((emp, empIdx) => {
      // For 2026-08-17, EVERY employee is present with 100% certainty.
      // For other days, high attendance rate (94%)
      if (!isSpecialTargetDate) {
        const leaveSeed = (day * 37 + empIdx * 19) % 100;
        if (leaveSeed < 6) return; // Rare scheduled rest day
      }

      const shiftType = emp.shift_id || 'shift_day_7_19';
      let machineSensorId = 1;
      let machineIp = '192.168.227.180';
      let machineName = 'Terminal 1 - Karachi North Entry Plaza';

      if (emp.department_id === '3' || emp.department_id === '8') {
        machineSensorId = 2;
        machineIp = '192.168.227.181';
        machineName = 'Terminal 2 - Karachi South Exit Plaza';
      } else if (emp.department_id === '1' || emp.department_id === '6' || emp.department_id === '9' || emp.department_id === '11') {
        machineSensorId = 3;
        machineIp = '192.168.227.182';
        machineName = 'Terminal 3 - Admin & Operations Building';
      }

      if (shiftType === 'shift_day_7_19') {
        // Daytime 7-19: IN around 06:48 - 07:14, OUT around 19:02 - 19:22
        const inTime = isSpecialTargetDate
          ? (empIdx === 2 ? '07:18:22' : (empIdx === 4 ? '07:22:10' : getPseudoTime(day * 13 + empIdx, 6, 48, 16)))
          : getPseudoTime(day * 13 + empIdx, 6, 48, 28);

        const outTime = getPseudoTime(day * 29 + empIdx, 19, 2, 22);

        // Check-In
        records.push({
          id: `att_${idCounter++}`,
          user_id: emp.user_id,
          name: emp.name,
          timestamp: `${dateStr} ${inTime}`,
          date: dateStr,
          time: inTime,
          status: 'Check-In',
          check_type: 'I',
          verification_type: 'Fingerprint',
          verify_code: 1,
          device_ip: machineIp,
          sensor_id: machineSensorId,
          sensor_name: machineName
        });

        // Check-Out
        records.push({
          id: `att_${idCounter++}`,
          user_id: emp.user_id,
          name: emp.name,
          timestamp: `${dateStr} ${outTime}`,
          date: dateStr,
          time: outTime,
          status: 'Check-Out',
          check_type: 'O',
          verification_type: 'Fingerprint',
          verify_code: 1,
          device_ip: machineIp,
          sensor_id: machineSensorId,
          sensor_name: machineName
        });
      } else if (shiftType === 'shift_night_19_7') {
        // Night 19-7: IN around 18:46 - 19:12, OUT morning 07:02 - 07:18
        const inTime = isSpecialTargetDate
          ? (empIdx === 7 ? '19:18:45' : getPseudoTime(day * 17 + empIdx, 18, 48, 16))
          : getPseudoTime(day * 17 + empIdx, 18, 48, 26);

        const outTime = getPseudoTime(day * 31 + empIdx, 7, 2, 18);

        // Check-In
        records.push({
          id: `att_${idCounter++}`,
          user_id: emp.user_id,
          name: emp.name,
          timestamp: `${dateStr} ${inTime}`,
          date: dateStr,
          time: inTime,
          status: 'Check-In',
          check_type: 'I',
          verification_type: 'Fingerprint',
          verify_code: 1,
          device_ip: machineIp,
          sensor_id: machineSensorId,
          sensor_name: machineName
        });

        // Check-Out (Morning punch logged under the duty shift date)
        records.push({
          id: `att_${idCounter++}`,
          user_id: emp.user_id,
          name: emp.name,
          timestamp: `${dateStr} ${outTime}`,
          date: dateStr,
          time: outTime,
          status: 'Check-Out',
          check_type: 'O',
          verification_type: 'Fingerprint',
          verify_code: 1,
          device_ip: machineIp,
          sensor_id: machineSensorId,
          sensor_name: machineName
        });
      } else {
        // Office 8:30-16:30: IN around 08:18 - 08:34, OUT around 16:32 - 16:48
        const inTime = isSpecialTargetDate
          ? (empIdx === 5 ? '08:42:15' : getPseudoTime(day * 23 + empIdx, 8, 18, 14))
          : getPseudoTime(day * 23 + empIdx, 8, 18, 22);

        const outTime = getPseudoTime(day * 41 + empIdx, 16, 32, 18);

        // Check-In
        records.push({
          id: `att_${idCounter++}`,
          user_id: emp.user_id,
          name: emp.name,
          timestamp: `${dateStr} ${inTime}`,
          date: dateStr,
          time: inTime,
          status: 'Check-In',
          check_type: 'I',
          verification_type: 'Fingerprint',
          verify_code: 1,
          device_ip: machineIp,
          sensor_id: machineSensorId,
          sensor_name: machineName
        });

        // Check-Out
        records.push({
          id: `att_${idCounter++}`,
          user_id: emp.user_id,
          name: emp.name,
          timestamp: `${dateStr} ${outTime}`,
          date: dateStr,
          time: outTime,
          status: 'Check-Out',
          check_type: 'O',
          verification_type: 'Fingerprint',
          verify_code: 1,
          device_ip: machineIp,
          sensor_id: machineSensorId,
          sensor_name: machineName
        });
      }
    });
  }

  // Also include current September 1st logs
  const today = '2026-09-01';
  initialEmployees.forEach((emp, i) => {
    const morningTime = `06:5${i % 10}:${10 + (i * 3)}`;
    records.push({
      id: `att_sep_${idCounter++}`,
      user_id: emp.user_id,
      name: emp.name,
      timestamp: `${today} ${morningTime}`,
      date: today,
      time: morningTime,
      status: 'Check-In',
      check_type: 'I',
      verification_type: 'Fingerprint',
      verify_code: 1,
      device_ip: '192.168.227.180',
      sensor_id: 1,
      sensor_name: 'Terminal 1 - Karachi North Entry Plaza'
    });
  });

  return records.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// 7. Initial Shift Assignments (empty - will be populated by user)
export const initialShiftAssignments: { temporary_overrides: ShiftOverride[] } = {
  temporary_overrides: []
};
