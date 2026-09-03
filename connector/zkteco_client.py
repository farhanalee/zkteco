"""
ZKTeco K40 Communication Protocol Client
Based on ZKTeco Standalone-SDK (pyzk / zkemkeeper standard protocol).
Implements both high-level PyZK engine and native TCP/UDP dual-stack binary socket driver.
No external database required - device is the primary source of truth.
"""

import socket
import struct
import time
import datetime
import logging
from typing import Dict, List, Any, Optional, Tuple

logger = logging.getLogger("zkteco_client")

# Attempt importing official pyzk package (Standalone-SDK open-source Python port)
try:
    from zk import ZK, const
    from zk.user import User as ZkUser
    from zk.attendance import Attendance as ZkAttendance
    PYZK_AVAILABLE = True
except ImportError:
    PYZK_AVAILABLE = False
    logger.info("pyzk package not found. Using built-in Standalone-SDK direct socket driver.")

# Command Constants (ZKTeco Protocol standard)
CMD_CONNECT = 1000
CMD_EXIT = 1001
CMD_ENABLEDEVICE = 1002
CMD_DISABLEDEVICE = 1003
CMD_RESTART = 1004
CMD_POWEROFF = 1005
CMD_REFRESHDATA = 1013
CMD_VERSION = 1100
CMD_AUTH = 1102
CMD_GET_TIME = 201
CMD_SET_TIME = 202
CMD_DEVICE_INFO = 11
CMD_USER_TEMP_RRQ = 9
CMD_USER_WRQ = 8
CMD_DELETE_USER = 18
CMD_ATTLOG_RRQ = 13
CMD_CLEAR_ATTLOG = 14
CMD_GET_FREE_SIZES = 1016

# Response Codes
CMD_ACK_OK = 2000
CMD_ACK_ERROR = 2001
CMD_ACK_DATA = 2002
CMD_ACK_RETRY = 2003
CMD_ACK_REPEAT = 2004
CMD_ACK_UNAUTH = 2005

# Verification Type Mappings
VERIFICATION_TYPES = {
    0: "Password",
    1: "Fingerprint",
    2: "Card",
    3: "Face",
    4: "Password",
    15: "Other"
}

# Attendance State Mappings
ATTENDANCE_STATES = {
    0: "Check-In",
    1: "Check-Out",
    2: "Break-Out",
    3: "Break-In",
    4: "Overtime-In",
    5: "Overtime-Out"
}

USHRT_MAX = 65535


def make_commkey(key: int, session_id: int, ticks: int = 50) -> int:
    """Calculate exact ZKTeco XOR authentication key from comm password and session ID (commpro.c / pyzk)."""
    key = int(key)
    session_id = int(session_id)
    k = 0
    for i in range(32):
        if key & (1 << i):
            k = (k << 1) | 1
        else:
            k = (k << 1)
    k = (k + session_id) & 0xFFFFFFFF

    # 1. XOR bytes with 'Z', 'K', 'S', 'O'
    k_bytes = struct.pack("<I", k)
    b0, b1, b2, b3 = struct.unpack("<4B", k_bytes)
    k_val = (
        (b0 ^ ord('Z')) |
        ((b1 ^ ord('K')) << 8) |
        ((b2 ^ ord('S')) << 16) |
        ((b3 ^ ord('O')) << 24)
    )

    # 2. Swap 16-bit halves
    k_bytes = struct.pack("<I", k_val & 0xFFFFFFFF)
    h0, h1 = struct.unpack("<2H", k_bytes)
    k_val = h1 | (h0 << 16)

    # 3. XOR with ticks (default 50)
    k_bytes = struct.pack("<I", k_val & 0xFFFFFFFF)
    b0, b1, b2, b3 = struct.unpack("<4B", k_bytes)
    final_k = (
        (b0 ^ ticks) |
        ((b1 ^ ticks) << 8) |
        ((b2 ^ ticks) << 16) |
        ((b3 ^ ticks) << 24)
    )
    return final_k & 0xFFFFFFFF


def decode_time(t: int) -> str:
    """Decode ZKTeco 32-bit packed integer timestamp into ISO datetime string."""
    try:
        second = t % 60
        t //= 60
        minute = t % 60
        t //= 60
        hour = t % 24
        t //= 24
        day = (t % 31) + 1
        t //= 31
        month = (t % 12) + 1
        t //= 12
        year = t + 2000
        dt = datetime.datetime(year, month, day, hour, minute, second)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def encode_time(dt: datetime.datetime) -> int:
    """Encode datetime object into ZKTeco 32-bit packed integer."""
    year = dt.year % 100
    month = dt.month - 1
    day = dt.day - 1
    hour = dt.hour
    minute = dt.minute
    second = dt.second

    t = (((year * 12 + month) * 31 + day) * 24 + hour) * 60 + minute
    t = t * 60 + second
    return t


def calculate_checksum(payload: bytes) -> int:
    """Calculate 16-bit checksum matching ZKTeco Standalone SDK."""
    l = len(payload)
    chksum = 0
    p = payload
    while l > 1:
        w = struct.unpack("<H", p[:2])[0]
        chksum += w
        p = p[2:]
        if chksum > USHRT_MAX:
            chksum -= USHRT_MAX
        l -= 2
    if l > 0:
        chksum += p[0]
    while chksum > USHRT_MAX:
        chksum -= USHRT_MAX
    chksum = ~chksum & 0xFFFF
    return chksum


class ZKTecoK40Client:
    """
    Unified ZKTeco K40 Communication Client.
    Employs Standalone-SDK PyZK backend if installed, with native socket driver fallback.
    """

    def __init__(self, ip: str, port: int = 4370, comm_key: int = 0, timeout: int = 5):
        self.ip = str(ip).strip()
        self.port = int(port) if port else 4370
        self.comm_key = int(comm_key) if comm_key else 0
        self.timeout = int(timeout) if timeout else 5

        # Native socket states
        self.sock: Optional[socket.socket] = None
        self.protocol = "TCP"  # "TCP" or "UDP"
        self.session_id = 0
        self.reply_id = 0
        self.is_connected = False
        self.last_activity = 0.0

        # PyZK instance (if available)
        self.zk_inst = None
        self.zk_conn = None

    def _create_packet(self, command: int, data: bytes = b"") -> bytes:
        """Construct a ZK packet with command, checksum, session_id, and reply_id."""
        buf = struct.pack("<4H", command, 0, self.session_id, self.reply_id) + data
        chk = calculate_checksum(buf)
        self.reply_id = (self.reply_id + 1) % USHRT_MAX

        header_with_chk = struct.pack("<4H", command, chk, self.session_id, self.reply_id)
        payload = header_with_chk + data

        if self.protocol == "TCP":
            tcp_magic = struct.pack("<I", 0x5050827D)
            tcp_len = struct.pack("<I", len(payload))
            return tcp_magic + tcp_len + payload
        else:
            return payload

    def _send(self, packet: bytes) -> None:
        """Send packet over open socket."""
        if not self.sock:
            raise ConnectionError("Socket is not initialized")
        if self.protocol == "TCP":
            self.sock.sendall(packet)
        else:
            self.sock.sendto(packet, (self.ip, self.port))

    def _recv(self, expected_size: int = 1024) -> Tuple[int, int, int, bytes]:
        """Receive and unpack packet. Returns (reply_code, session_id, reply_id, data)."""
        if not self.sock:
            raise ConnectionError("Socket is not connected")

        if self.protocol == "TCP":
            prefix = b""
            while len(prefix) < 8:
                chunk = self.sock.recv(8 - len(prefix))
                if not chunk:
                    raise ConnectionResetError("Connection closed by ZKTeco device")
                prefix += chunk

            magic, length = struct.unpack("<II", prefix)
            body = b""
            while len(body) < length:
                chunk = self.sock.recv(min(length - len(body), 4096))
                if not chunk:
                    break
                body += chunk

            if len(body) < 8:
                raise ValueError("Incomplete ZKTeco packet header")

            reply_code, chk, session_id, reply_id = struct.unpack("<4H", body[:8])
            data = body[8:]
            return reply_code, session_id, reply_id, data
        else:
            raw_data, _ = self.sock.recvfrom(expected_size)
            if len(raw_data) < 8:
                raise ValueError("Incomplete ZKTeco UDP packet header")
            reply_code, chk, session_id, reply_id = struct.unpack("<4H", raw_data[:8])
            data = raw_data[8:]
            return reply_code, session_id, reply_id, data

    def connect(self) -> Dict[str, Any]:
        """Attempt connection and handshake with ZKTeco K40."""
        self.disconnect()

        # Validate IP address format
        try:
            socket.inet_aton(self.ip)
        except socket.error:
            return {
                "success": False,
                "error": "INVALID_IP",
                "message": f"Invalid IP address format: '{self.ip}'"
            }

        # 1. Primary Method: Try official PyZK engine (Standalone SDK standard)
        if PYZK_AVAILABLE:
            try:
                # Try TCP first then UDP
                for force_udp in [False, True]:
                    try:
                        self.zk_inst = ZK(
                            self.ip,
                            port=self.port,
                            timeout=self.timeout,
                            password=self.comm_key,
                            force_udp=force_udp,
                            ommit_ping=True
                        )
                        self.zk_conn = self.zk_inst.connect()
                        if self.zk_conn:
                            self.is_connected = True
                            self.protocol = "UDP" if force_udp else "TCP"
                            self.last_activity = time.time()
                            logger.info(f"Connected via PyZK ({self.protocol}) to {self.ip}:{self.port}")
                            return {
                                "success": True,
                                "protocol": f"PyZK ({self.protocol} Standalone SDK)",
                                "session_id": getattr(self.zk_inst, "session_id", "ZK_ACTIVE"),
                                "message": f"Successfully connected to ZKTeco K40 at {self.ip}:{self.port}"
                            }
                    except Exception as e:
                        logger.debug(f"PyZK attempt (force_udp={force_udp}) failed: {e}")
                        if self.zk_conn:
                            try:
                                self.zk_conn.disconnect()
                            except Exception:
                                pass
                            self.zk_conn = None
            except Exception as e:
                logger.warning(f"PyZK connection routine returned: {e}")

        # 2. Secondary Method: Native TCP / UDP Driver
        protocols_to_try = ["TCP", "UDP"]
        last_err = ""

        for proto in protocols_to_try:
            self.protocol = proto
            self.session_id = 0
            self.reply_id = 0
            try:
                if proto == "TCP":
                    self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    self.sock.settimeout(self.timeout)
                    self.sock.connect((self.ip, self.port))
                else:
                    self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                    self.sock.settimeout(self.timeout)

                # Send CMD_CONNECT
                pkt = self._create_packet(CMD_CONNECT)
                self._send(pkt)
                reply_code, sess_id, r_id, data = self._recv()

                if reply_code == CMD_ACK_OK:
                    self.session_id = sess_id
                    # If user provided a non-zero key, authenticate it
                    if self.comm_key != 0:
                        auth_val = make_commkey(self.comm_key, self.session_id)
                        auth_pkt = self._create_packet(CMD_AUTH, struct.pack("<I", auth_val))
                        self._send(auth_pkt)
                        auth_reply, _, _, _ = self._recv()
                        if auth_reply != CMD_ACK_OK:
                            self.disconnect()
                            continue

                    self.is_connected = True
                    self.last_activity = time.time()
                    return {
                        "success": True,
                        "protocol": proto,
                        "session_id": self.session_id,
                        "message": f"Successfully connected to ZKTeco K40 at {self.ip}:{self.port} via {proto}"
                    }

                elif reply_code == CMD_ACK_UNAUTH:
                    self.session_id = sess_id
                    auth_val = make_commkey(self.comm_key, self.session_id)
                    auth_pkt = self._create_packet(CMD_AUTH, struct.pack("<I", auth_val))
                    self._send(auth_pkt)
                    auth_reply, _, _, _ = self._recv()

                    if auth_reply == CMD_ACK_OK:
                        self.is_connected = True
                        self.last_activity = time.time()
                        return {
                            "success": True,
                            "protocol": proto,
                            "session_id": self.session_id,
                            "message": f"Successfully authenticated and connected to ZKTeco K40 via {proto}"
                        }
                    else:
                        last_err = f"{proto} device rejected Comm Key '{self.comm_key}'."
                        self.disconnect()
                        continue
                else:
                    last_err = f"Device returned error code: {reply_code} via {proto}"

            except Exception as e:
                last_err = f"Network ({proto}): {str(e)}"
            finally:
                if not self.is_connected and self.sock:
                    try:
                        self.sock.close()
                    except Exception:
                        pass
                    self.sock = None

        return {
            "success": False,
            "error": "COMMUNICATION_ERROR",
            "message": last_err or f"Unable to establish session with ZKTeco at {self.ip}:{self.port}"
        }

    def disconnect(self) -> None:
        """Send disconnect packet and close socket / PyZK session."""
        if self.zk_conn:
            try:
                self.zk_conn.disconnect()
            except Exception:
                pass
            self.zk_conn = None
            self.zk_inst = None

        if self.sock and self.is_connected:
            try:
                pkt = self._create_packet(CMD_EXIT)
                self._send(pkt)
            except Exception:
                pass
        if self.sock:
            try:
                self.sock.close()
            except Exception:
                pass
        self.sock = None
        self.is_connected = False
        self.session_id = 0

    def enable_device(self, enable: bool = True) -> bool:
        """Enable or disable device keypad/scanner during data transfer."""
        if self.zk_conn:
            try:
                if enable:
                    self.zk_conn.enable_device()
                else:
                    self.zk_conn.disable_device()
                return True
            except Exception:
                pass

        if not self.is_connected:
            return False
        cmd = CMD_ENABLEDEVICE if enable else CMD_DISABLEDEVICE
        try:
            pkt = self._create_packet(cmd)
            self._send(pkt)
            code, _, _, _ = self._recv()
            return code == CMD_ACK_OK
        except Exception:
            return False

    def get_version(self) -> str:
        """Retrieve firmware version string."""
        if self.zk_conn:
            try:
                return str(self.zk_conn.get_firmware_version() or "ZKTeco K40 Firmware")
            except Exception:
                pass

        if not self.is_connected:
            return "Not connected"
        try:
            pkt = self._create_packet(CMD_VERSION)
            self._send(pkt)
            code, _, _, data = self._recv()
            if code == CMD_ACK_OK:
                return data.decode("ascii", errors="ignore").strip("\x00")
            return "ZKTeco K40 Standalone"
        except Exception:
            return "ZKTeco K40 Standalone"

    def get_device_time(self) -> Optional[str]:
        """Retrieve current real-time clock from K40."""
        if self.zk_conn:
            try:
                t = self.zk_conn.get_time()
                if t:
                    return t.strftime("%Y-%m-%d %H:%M:%S")
            except Exception:
                pass

        if not self.is_connected:
            return None
        try:
            pkt = self._create_packet(CMD_GET_TIME)
            self._send(pkt)
            code, _, _, data = self._recv()
            if code == CMD_ACK_OK and len(data) >= 4:
                t_int = struct.unpack("<I", data[:4])[0]
                return decode_time(t_int)
            return None
        except Exception as e:
            logger.error(f"Error getting device time: {e}")
            return None

    def set_device_time(self, dt: Optional[datetime.datetime] = None) -> bool:
        """Set K40 device clock to specified or current PC time."""
        if dt is None:
            dt = datetime.datetime.now()

        if self.zk_conn:
            try:
                self.zk_conn.set_time(dt)
                return True
            except Exception:
                pass

        if not self.is_connected:
            return False
        t_int = encode_time(dt)
        try:
            pkt = self._create_packet(CMD_SET_TIME, struct.pack("<I", t_int))
            self._send(pkt)
            code, _, _, _ = self._recv()
            return code == CMD_ACK_OK
        except Exception as e:
            logger.error(f"Error setting device time: {e}")
            return False

    def get_device_info(self) -> Dict[str, Any]:
        """Query comprehensive device hardware specs, counts, serial, and firmware."""
        info = {
            "firmware_version": "ZKTeco K40 Standalone",
            "serial_number": "N/A",
            "device_name": "ZKTeco K40 Biometric Terminal",
            "platform": "ZEM560 / ZK6001",
            "mac_address": "N/A",
            "user_count": 0,
            "fingerprint_count": 0,
            "attendance_count": 0,
            "admin_count": 0,
            "password_count": 0,
            "card_count": 0,
            "device_time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        if self.zk_conn:
            try:
                info["firmware_version"] = str(self.zk_conn.get_firmware_version() or "ZKTeco K40")
                info["serial_number"] = str(self.zk_conn.get_serialnumber() or "N/A")
                info["device_name"] = str(self.zk_conn.get_device_name() or "ZKTeco K40")
                info["platform"] = str(self.zk_conn.get_platform() or "Standalone")
                info["mac_address"] = str(self.zk_conn.get_mac() or "N/A")
                t = self.zk_conn.get_time()
                if t:
                    info["device_time"] = t.strftime("%Y-%m-%d %H:%M:%S")
                users = self.get_users()
                info["user_count"] = len(users)
                info["admin_count"] = sum(1 for u in users if u.get("privilege") == 14)
                logs = self.get_attendance()
                info["attendance_count"] = len(logs)
                return info
            except Exception as e:
                logger.error(f"PyZK get_device_info error: {e}")

        if not self.is_connected:
            return info

        info["firmware_version"] = self.get_version()
        dev_time = self.get_device_time()
        if dev_time:
            info["device_time"] = dev_time

        return info

    def get_users(self) -> List[Dict[str, Any]]:
        """Download all enrolled employees from K40 device."""
        if self.zk_conn:
            try:
                zk_users = self.zk_conn.get_users()
                users = []
                for u in zk_users:
                    users.append({
                        "uid": u.uid,
                        "user_id": str(u.user_id),
                        "name": str(u.name or f"User {u.user_id}"),
                        "privilege": u.privilege,
                        "role": "Super Admin" if u.privilege == 14 else "User",
                        "password": str(u.password or ""),
                        "card": getattr(u, "card", 0)
                    })
                return users
            except Exception as e:
                logger.error(f"PyZK get_users error: {e}")

        if not self.is_connected:
            return []

        users = []
        try:
            self.enable_device(False)
            pkt = self._create_packet(CMD_USER_TEMP_RRQ, struct.pack("<H", 1))
            self._send(pkt)
            reply_code, _, _, data = self._recv()

            if reply_code in [CMD_ACK_OK, CMD_ACK_DATA]:
                # Parse 72-byte user structure
                offset = 0
                while offset + 72 <= len(data):
                    chunk = data[offset:offset + 72]
                    uid, priv = struct.unpack("<HB", chunk[:3])
                    pwd = chunk[3:11].decode("ascii", errors="ignore").strip("\x00")
                    name = chunk[11:35].decode("utf-8", errors="ignore").strip("\x00")
                    card = struct.unpack("<I", chunk[35:39])[0]
                    user_id = chunk[48:72].decode("ascii", errors="ignore").strip("\x00")

                    if not user_id:
                        user_id = str(uid)
                    if not name:
                        name = f"User {user_id}"

                    users.append({
                        "uid": uid,
                        "user_id": user_id,
                        "name": name,
                        "privilege": priv,
                        "role": "Super Admin" if priv == 14 else "User",
                        "password": pwd,
                        "card": card
                    })
                    offset += 72
        except Exception as e:
            logger.error(f"Error reading users: {e}")
        finally:
            self.enable_device(True)

        return users

    def save_user(self, user_data: Dict[str, Any]) -> bool:
        """Enroll or update user on K40 device."""
        uid = int(user_data.get("uid", 1))
        name = str(user_data.get("name", "")).strip()
        privilege = int(user_data.get("privilege", 0))
        password = str(user_data.get("password", ""))
        user_id = str(user_data.get("user_id", uid))
        card = int(user_data.get("card", 0))

        if self.zk_conn:
            try:
                self.zk_conn.set_user(
                    uid=uid,
                    name=name,
                    privilege=privilege,
                    password=password,
                    group_id="",
                    user_id=user_id,
                    card=card
                )
                return True
            except Exception as e:
                logger.error(f"PyZK set_user error: {e}")

        if not self.is_connected:
            return False

        try:
            self.enable_device(False)
            payload = bytearray(72)
            struct.pack_into("<HB", payload, 0, uid, privilege)
            pwd_bytes = password.encode("ascii")[:8]
            payload[3:3 + len(pwd_bytes)] = pwd_bytes
            name_bytes = name.encode("utf-8")[:24]
            payload[11:11 + len(name_bytes)] = name_bytes
            struct.pack_into("<I", payload, 35, card)
            uid_bytes = user_id.encode("ascii")[:24]
            payload[48:48 + len(uid_bytes)] = uid_bytes

            pkt = self._create_packet(CMD_USER_WRQ, bytes(payload))
            self._send(pkt)
            reply_code, _, _, _ = self._recv()

            if reply_code == CMD_ACK_OK:
                refresh_pkt = self._create_packet(CMD_REFRESHDATA)
                self._send(refresh_pkt)
                self._recv()
                return True
            return False
        except Exception as e:
            logger.error(f"Error saving user: {e}")
            return False
        finally:
            self.enable_device(True)

    def delete_user(self, user_id: str, uid: Optional[int] = None) -> bool:
        """Delete user by User ID or UID from K40."""
        user_id_str = str(user_id)
        uid_int = int(uid) if uid else None

        if self.zk_conn:
            try:
                self.zk_conn.delete_user(uid=uid_int, user_id=user_id_str)
                return True
            except Exception as e:
                logger.error(f"PyZK delete_user error: {e}")

        if not self.is_connected:
            return False

        try:
            self.enable_device(False)
            payload = user_id_str.encode("ascii") + b"\x00"
            pkt = self._create_packet(CMD_DELETE_USER, payload)
            self._send(pkt)
            reply_code, _, _, _ = self._recv()
            if reply_code == CMD_ACK_OK:
                refresh_pkt = self._create_packet(CMD_REFRESHDATA)
                self._send(refresh_pkt)
                self._recv()
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            return False
        finally:
            self.enable_device(True)

    def get_attendance(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Download raw attendance check-in/out logs directly from K40 terminal memory."""
        logs = []

        if self.zk_conn:
            try:
                zk_logs = self.zk_conn.get_attendance()
                for log in zk_logs:
                    ts_str = log.timestamp.strftime("%Y-%m-%d %H:%M:%S")
                    status_name = ATTENDANCE_STATES.get(log.status, "Check-In")
                    ver_type = VERIFICATION_TYPES.get(getattr(log, "punch", 1), "Fingerprint")

                    log_entry = {
                        "user_id": str(log.user_id),
                        "timestamp": ts_str,
                        "date": log.timestamp.strftime("%Y-%m-%d"),
                        "time": log.timestamp.strftime("%H:%M:%S"),
                        "status": log.status,
                        "status_name": status_name,
                        "verification_type": ver_type
                    }

                    if filters:
                        if filters.get("user_id") and str(filters["user_id"]) != log_entry["user_id"]:
                            continue
                        if filters.get("date") and str(filters["date"]) != log_entry["date"]:
                            continue

                    logs.append(log_entry)
                logs.sort(key=lambda x: x["timestamp"], reverse=True)
                return logs
            except Exception as e:
                logger.error(f"PyZK get_attendance error: {e}")

        if not self.is_connected:
            return []

        try:
            self.enable_device(False)
            pkt = self._create_packet(CMD_ATTLOG_RRQ)
            self._send(pkt)
            reply_code, _, _, data = self._recv()

            if reply_code in [CMD_ACK_OK, CMD_ACK_DATA]:
                # Try 40-byte standard format or 8-byte legacy format
                if len(data) % 40 == 0:
                    for i in range(0, len(data), 40):
                        chunk = data[i:i + 40]
                        uid = struct.unpack("<H", chunk[:2])[0]
                        user_id = chunk[2:26].decode("ascii", errors="ignore").strip("\x00")
                        ver_state = chunk[26]
                        t_int = struct.unpack("<I", chunk[27:31])[0]
                        att_state = chunk[31]

                        if not user_id:
                            user_id = str(uid)

                        dt_str = decode_time(t_int)
                        date_part, time_part = dt_str.split(" ") if " " in dt_str else (dt_str, "")

                        log_entry = {
                            "user_id": user_id,
                            "timestamp": dt_str,
                            "date": date_part,
                            "time": time_part,
                            "status": att_state,
                            "status_name": ATTENDANCE_STATES.get(att_state, "Check-In"),
                            "verification_type": VERIFICATION_TYPES.get(ver_state, "Fingerprint")
                        }

                        if filters:
                            if filters.get("user_id") and str(filters["user_id"]) != log_entry["user_id"]:
                                continue
                            if filters.get("date") and str(filters["date"]) != log_entry["date"]:
                                continue

                        logs.append(log_entry)
            logs.sort(key=lambda x: x["timestamp"], reverse=True)
        except Exception as e:
            logger.error(f"Error fetching attendance: {e}")
        finally:
            self.enable_device(True)

        return logs

    def get_attendance_logs(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Alias for get_attendance."""
        return self.get_attendance(filters)

    def clear_attendance(self) -> bool:
        """Clear attendance records on K40 hardware memory."""
        if self.zk_conn:
            try:
                self.zk_conn.clear_attendance()
                return True
            except Exception as e:
                logger.error(f"PyZK clear_attendance error: {e}")

        if not self.is_connected:
            return False

        try:
            self.enable_device(False)
            pkt = self._create_packet(CMD_CLEAR_ATTLOG)
            self._send(pkt)
            reply_code, _, _, _ = self._recv()
            return reply_code == CMD_ACK_OK
        except Exception as e:
            logger.error(f"Error clearing attendance: {e}")
            return False
        finally:
            self.enable_device(True)

    def restart_device(self) -> bool:
        """Reboot K40 terminal hardware."""
        if self.zk_conn:
            try:
                self.zk_conn.restart()
                self.disconnect()
                return True
            except Exception:
                pass

        if not self.is_connected:
            return False
        try:
            pkt = self._create_packet(CMD_RESTART)
            self._send(pkt)
            self.disconnect()
            return True
        except Exception:
            return False
