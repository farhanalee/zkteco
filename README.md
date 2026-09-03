# ZKTeco K40 Biometric Attendance Management System

A complete, production-ready, **local web-based Attendance Management System** built specifically for the **ZKTeco K40** biometric machine.

Runs locally on Windows (e.g. `http://localhost/zkteco/` or `http://localhost:3000/zkteco/`) and communicates directly with the physical ZKTeco K40 device using its native **TCP/IP communication protocol**.

---

## 🌟 Zero-Database Architecture (The K40 is the Source of Truth)

* **NO MySQL, PostgreSQL, SQLite, or MongoDB required**: All biometric user records, enrolled fingerprints, and punch logs are queried directly from the **ZKTeco K40 hardware memory / flash storage**.
* **Direct TCP/IP Socket Communication**: Custom Python binary protocol connector establishes socket sessions (Port 4370) with Comm Key authentication.
* **Persistent Configuration**: System parameters, shifts, departments, and designations are maintained in lightweight JSON configuration files (`config/*.json`).

---

## 🏛️ System Architecture

```text
  [ Browser ]
       |
       | HTTP Requests / AJAX Polling
       v
  [ PHP Local Web Application ]  (Port 80 or 3000)
       |
       | REST API + X-Connector-Token (Port 5005)
       v
  [ Python ZKTeco Connector Daemon ]
       |
       | Raw TCP/IP Sockets (Port 4370)
       v
  [ Physical ZKTeco K40 Biometric Terminal ] (e.g. 192.168.1.201:4370)
```

---

## 🚀 Quick Start on Windows

### Prerequisites
1. **Windows 10 / 11** or Windows Server.
2. **Python 3.8+** installed with `Add Python to PATH` checked.
3. **PHP 7.4+ or 8.x** (or XAMPP / WAMP).
4. **ZKTeco K40** connected to your local network via Ethernet cable.

### 1. Installation
Double-click `install.bat` or run:
```cmd
pip install -r connector\requirements.txt
```

### 2. Start the System
Double-click `start.bat`. This will:
1. Start the Python Connector daemon on `127.0.0.1:5005`.
2. Start the PHP web server on `http://localhost:3000/zkteco/`.
3. Open your default web browser automatically.

### 3. Log In
* **Default Username**: `admin`
* **Default Password**: `admin123`

---

## ⚙️ Connecting to your ZKTeco K40 Machine

1. On your physical ZKTeco K40 device:
   * Press **Menu** &rarr; **Comm.** &rarr; **Ethernet**
   * Note the IP Address (e.g. `192.168.1.201`), Subnet Mask, and Gateway.
   * Go to **Comm.** &rarr; **Comm Key** &rarr; Check the communication key (default is `0`).
2. In the Web Application:
   * Navigate to **Device** &rarr; **Settings**
   * Enter the **Device IP Address** (e.g., `192.168.1.201`)
   * Enter the **Port** (`4370`)
   * Enter the **Comm Key** (e.g. `0` or `123456`)
   * Click **Test Connection** &rarr; Click **Save Settings**

---

## 📋 Features & Capabilities

1. **Dashboard**:
   * Live connection status indicator (Connected / Disconnected)
   * Real-time metrics: Enrolled Employees, Today's Punches, Total Device Logs
   * K40 Hardware telemetry (Device Serial, Firmware, Platform)
   * Quick synchronization of device RTC clock with PC local time

2. **Employee Management**:
   * View all enrolled employees directly from K40 device flash memory
   * Enroll / Add new employee (UID, ID, Full Name, Privilege, Password, RFID Card)
   * Delete employee from K40 memory
   * Search and filter by Employee ID or Name

3. **Attendance Logs & Records**:
   * Direct flash log retrieval
   * Filter by Date Range (From Date / To Date) and Employee
   * Verification types: Fingerprint, Card, Password
   * Export to CSV and Print layout

4. **Live Attendance Monitoring**:
   * Real-time polling stream (every 3s / 5s / 10s)
   * Visual hero highlight of the most recent punch
   * Web Audio chime / beep on every incoming biometric punch

5. **Reports**:
   * **Daily Report**: First In, Last Out, Working Duration, Single Punch detection.
   * **Employee Timesheet**: Comprehensive timesheet for an individual staff member.
   * **Late Report**: Calculates late arrivals past shift start time and grace periods.
   * **Absenteeism Report**: Identifies absent employees by cross-referencing active device users against punches.

6. **Shift & Organization Management**:
   * Morning, Night, and Custom shifts with grace periods
   * Departments & Job Designations

---

## 🛡️ Security
* **PHP Session Security**: Admin authentication with CSRF tokens on all POST requests.
* **Internal API Authentication**: Python connector protected with `X-Connector-Token` header.
* **No Database Exposure**: Zero SQL injection attack surface.

---

## 🛑 Stopping the System
Run `stop.bat` to safely terminate the background Python connector and PHP server.
