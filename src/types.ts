export interface ZKTecoDevice {
  id?: string;
  name: string;
  ip_address: string;
  port: number;
  comm_key: number;
  timeout: number;
  auto_refresh_interval: number;
  status: 'Connected' | 'Disconnected' | 'Connecting' | 'Error';
  last_sync: string;
  serial_number: string;
  firmware_version: string;
  platform: string;
  mac_address: string;
  user_count: number;
  user_capacity: number;
  fingerprint_count: number;
  fingerprint_capacity: number;
  attendance_count: number;
  attendance_capacity: number;
  device_time: string;
  pc_time: string;
  time_diff_seconds: number;
  location?: string;
  sensor_id?: number;
}

export interface Employee {
  uid: number;
  user_id: string; // Badgenumber
  name: string;
  privilege: number;
  privilege_name: string;
  password?: string;
  card_number: string;
  enabled: boolean;
  department_id: string; // DEFAULTDEPTID
  department_name?: string;
  designation_id?: string;
  designation_title?: string;
  shift_id?: string; // Permanent assigned shift ID
  has_fingerprint: boolean;
  employment_type?: 'permanent' | 'temporary'; // Employment type
}

export interface AttendanceRecord {
  id: string;
  user_id: string; // USERID / Badgenumber
  name?: string;
  timestamp: string; // CHECKTIME
  date: string;
  time: string;
  status: 'Check-In' | 'Check-Out' | 'Break-Out' | 'Break-In' | 'Overtime-In' | 'Overtime-Out';
  check_type?: 'I' | 'O' | '0' | '1';
  verification_type: 'Fingerprint' | 'Password' | 'Card' | 'Face' | 'Other';
  verify_code?: number; // 1=FP, 2=PW, 3=Card
  device_ip: string;
  sensor_id?: number; // Machine SENSORID 1, 2, 3
  sensor_name?: string;
}

export interface Shift {
  id: string;
  name: string; // SchClass Name
  schclass_id?: number;
  start_time: string;
  end_time: string;
  grace_period_minutes: number;
  late_threshold_minutes: number;
  half_day_minutes: number;
  full_day_minutes: number;
  is_night_shift: boolean;
  is_default: boolean;
  shift_type?: string;
  // Sunday / Holiday settings
  sunday_is_holiday: boolean;          // Sunday is off by default
  sunday_overtime_enabled: boolean;    // If true: Sunday work → Overtime (1.5x or 2x)
  sunday_overtime_rate?: number;       // Multiplier: 1.5 or 2.0 (optional)
}

export interface Department {
  id: string; // DEPTID
  dept_id_num?: number;
  name: string; // DEPTNAME
  code: string;
  manager: string;
  sup_dept_id?: string;
  employee_count?: number;
  default_shift_id?: string; // Default shift for this department
}

export interface Designation {
  id: string;
  title: string;
  department_id: string;
  level: string;
}

export interface ShiftOverride {
  employee_id: string;
  shift_id: string;
  from_date: string;
  to_date: string;
  reason?: string;
}

export interface MdbDatabaseStats {
  database_name: string; // att2000.mdb / LRC_Karachi_Attendance.mdb
  total_users: number; // 2466
  total_punches: number; // 14778
  total_departments: number; // 13
  total_templates: number; // 490
  total_machines: number; // 3
  operation_name: string; // LRC Karachi Toll Operations
  last_synced: string;
}
