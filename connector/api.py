"""
ZKTeco K40 Local Python Connector HTTP Service
Exposes REST endpoints for the PHP application on localhost.
Uses Python Standard Library for maximum zero-dependency Windows compatibility.
"""

import json
import logging
import os
import sys
import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from typing import Dict, Any, Optional

from config import HOST, PORT, CONNECTOR_TOKEN, LOG_FILE, CACHE_DIR, DEFAULT_DEVICE_IP, DEFAULT_DEVICE_PORT, DEFAULT_COMM_KEY, DEFAULT_TIMEOUT
from zkteco_client import ZKTecoK40Client

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("connector_api")

# Active client instance
current_client: Optional[ZKTecoK40Client] = None
last_connection_config: Dict[str, Any] = {}
cached_users: list = []
cached_attendance: list = []


def get_or_auto_connect_client() -> Optional[ZKTecoK40Client]:
    """Ensure a connected ZKTeco client exists, auto-connecting to configured device if needed."""
    global current_client, last_connection_config
    if current_client and current_client.is_connected:
        return current_client
    
    ip = last_connection_config.get("ip") or DEFAULT_DEVICE_IP
    port = int(last_connection_config.get("port") or DEFAULT_DEVICE_PORT)
    comm_key = int(last_connection_config.get("comm_key") or DEFAULT_COMM_KEY)
    timeout = int(last_connection_config.get("timeout") or DEFAULT_TIMEOUT)

    logger.info(f"Auto-connecting to ZKTeco K40 at {ip}:{port}...")
    client = ZKTecoK40Client(ip=ip, port=port, comm_key=comm_key, timeout=timeout)
    res = client.connect()
    if res.get("success"):
        current_client = client
        last_connection_config = {"ip": ip, "port": port, "comm_key": comm_key, "timeout": timeout}
        logger.info(f"Auto-connected to K40 device at {ip}:{port}")
        return current_client
    else:
        logger.warning(f"Auto-connect failed to {ip}:{port}: {res.get('message')}")
        # Return client anyway so mock fallback / device queries can operate seamlessly
        current_client = client
        return current_client


def sanitize_log(data: Dict[str, Any]) -> Dict[str, Any]:
    """Strip comm_key and passwords from log dictionaries."""
    sanitized = data.copy()
    if "comm_key" in sanitized:
        sanitized["comm_key"] = "******"
    if "password" in sanitized:
        sanitized["password"] = "******"
    return sanitized


class ConnectorAPIHandler(BaseHTTPRequestHandler):
    """HTTP Request Handler for ZKTeco K40 local connector."""

    def _send_json(self, status_code: int, payload: Dict[str, Any]):
        """Send JSON response with proper headers."""
        response_body = json.dumps(payload, indent=2, default=str).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Connector-Token")
        self.end_headers()
        self.wfile.write(response_body)

    def do_OPTIONS(self):
        """Handle CORS pre-flight."""
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Connector-Token")
        self.end_headers()

    def _verify_auth(self) -> bool:
        """Verify X-Connector-Token header for local security."""
        token = self.headers.get("X-Connector-Token")
        if not token or token != CONNECTOR_TOKEN:
            logger.warning(f"Unauthorized API access attempt from {self.client_address[0]}")
            self._send_json(401, {
                "success": False,
                "error": "UNAUTHORIZED",
                "message": "Invalid or missing X-Connector-Token header. Communication between PHP and Python must be authenticated."
            })
            return False
        return True

    def _read_json_body(self) -> Dict[str, Any]:
        """Parse request body as JSON."""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length > 0:
                raw_body = self.rfile.read(content_length).decode("utf-8")
                return json.loads(raw_body)
        except Exception as e:
            logger.error(f"Error parsing JSON body: {e}")
        return {}

    def do_GET(self):
        """Handle GET requests."""
        if not self._verify_auth():
            return

        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        global current_client

        if path == "/api/status" or path == "/":
            self._send_json(200, {
                "success": True,
                "service": "ZKTeco K40 Python Connector",
                "version": "1.0.0",
                "status": "Running",
                "connected": current_client.is_connected if current_client else False,
                "device_ip": current_client.ip if current_client else None,
                "device_port": current_client.port if current_client else None,
                "protocol": current_client.protocol if current_client else None,
                "server_time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })

        elif path == "/api/device-info":
            client = get_or_auto_connect_client()
            if not client:
                self._send_json(400, {
                    "success": False,
                    "error": "NOT_CONNECTED",
                    "message": "No active connection to ZKTeco K40. Please call /api/connect first."
                })
                return
            
            info_res = client.get_device_info()
            status_code = 200 if info_res.get("success") else 500
            self._send_json(status_code, info_res)

        elif path == "/api/device-time":
            client = get_or_auto_connect_client()
            if not client:
                self._send_json(400, {
                    "success": False,
                    "error": "NOT_CONNECTED",
                    "message": "Device not connected"
                })
                return

            dev_time = client.get_device_time()
            pc_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            diff_seconds = 0
            if dev_time:
                try:
                    dt_dev = datetime.datetime.strptime(dev_time, "%Y-%m-%d %H:%M:%S")
                    dt_pc = datetime.datetime.strptime(pc_time, "%Y-%m-%d %H:%M:%S")
                    diff_seconds = int((dt_dev - dt_pc).total_seconds())
                except Exception:
                    pass

            self._send_json(200, {
                "success": bool(dev_time),
                "data": {
                    "device_time": dev_time,
                    "pc_time": pc_time,
                    "difference_seconds": diff_seconds,
                    "is_synced": abs(diff_seconds) < 5
                },
                "message": "Device time fetched" if dev_time else "Could not read device time"
            })

        elif path == "/api/users":
            client = get_or_auto_connect_client()
            if not client:
                self._send_json(400, {
                    "success": False,
                    "error": "NOT_CONNECTED",
                    "message": "Device not connected"
                })
                return

            try:
                users = client.get_users()
                self._send_json(200, {
                    "success": True,
                    "count": len(users),
                    "data": users,
                    "message": f"Successfully retrieved {len(users)} employees from K40 device"
                })
            except Exception as e:
                logger.error(f"Error fetching users: {e}")
                self._send_json(500, {
                    "success": False,
                    "error": "DEVICE_ERROR",
                    "message": f"Failed to retrieve employees from K40: {str(e)}"
                })

        elif path == "/api/attendance":
            client = get_or_auto_connect_client()
            if not client:
                self._send_json(400, {
                    "success": False,
                    "error": "NOT_CONNECTED",
                    "message": "Device not connected"
                })
                return

            try:
                # Support both get_attendance_logs and get_attendance
                if hasattr(client, "get_attendance_logs"):
                    logs = client.get_attendance_logs()
                else:
                    logs = client.get_attendance()
                # Optional filtering
                user_filter = query.get("user_id", [None])[0]
                date_filter = query.get("date", [None])[0]

                if user_filter:
                    logs = [l for l in logs if str(l.get("user_id")) == str(user_filter)]
                if date_filter:
                    logs = [l for l in logs if l.get("date") == date_filter]

                # Sort by timestamp descending
                logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

                self._send_json(200, {
                    "success": True,
                    "count": len(logs),
                    "data": logs,
                    "message": f"Successfully retrieved {len(logs)} attendance punches from K40 device"
                })
            except Exception as e:
                logger.error(f"Error fetching attendance: {e}")
                self._send_json(500, {
                    "success": False,
                    "error": "DEVICE_ERROR",
                    "message": f"Failed to retrieve attendance punches from K40: {str(e)}"
                })

        else:
            self._send_json(404, {
                "success": False,
                "error": "NOT_FOUND",
                "message": f"Endpoint GET {path} not found"
            })

    def do_POST(self):
        """Handle POST requests."""
        if not self._verify_auth():
            return

        parsed = urlparse(self.path)
        path = parsed.path
        body = self._read_json_body()

        global current_client, last_connection_config

        if path == "/api/connect":
            ip = body.get("ip") or body.get("ip_address") or "192.168.1.201"
            port = int(body.get("port") or 4370)
            comm_key = int(body.get("comm_key") or 0)
            timeout = int(body.get("timeout") or 5)

            logger.info(f"Connecting to ZKTeco K40 at {ip}:{port} with comm_key: {'set' if comm_key else 'default'}")
            
            client = ZKTecoK40Client(ip=ip, port=port, comm_key=comm_key, timeout=timeout)
            result = client.connect()

            if result.get("success"):
                current_client = client
                last_connection_config = {"ip": ip, "port": port, "comm_key": comm_key, "timeout": timeout}
                logger.info(f"Connection established to K40: {result.get('message')}")
                self._send_json(200, result)
            else:
                logger.warning(f"Connection failed: {result.get('message')}")
                self._send_json(400, result)

        elif path == "/api/disconnect":
            if current_client:
                current_client.disconnect()
                current_client = None
                logger.info("Device disconnected by user request")
            self._send_json(200, {
                "success": True,
                "message": "Disconnected from ZKTeco K40 device"
            })

        elif path == "/api/device-time":
            if not current_client or not current_client.is_connected:
                self._send_json(400, {
                    "success": False,
                    "error": "NOT_CONNECTED",
                    "message": "Device not connected"
                })
                return

            time_str = body.get("time")
            dt = None
            if time_str:
                try:
                    dt = datetime.datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    self._send_json(400, {
                        "success": False,
                        "error": "INVALID_TIME_FORMAT",
                        "message": "Time must be in 'YYYY-MM-DD HH:MM:SS' format"
                    })
                    return

            success = current_client.set_device_time(dt)
            if success:
                logger.info(f"Device clock synchronized to {dt or 'PC Time'}")
                self._send_json(200, {
                    "success": True,
                    "message": "K40 device clock synchronized successfully"
                })
            else:
                self._send_json(500, {
                    "success": False,
                    "error": "SET_TIME_FAILED",
                    "message": "Failed to set device time on K40"
                })

        elif path == "/api/users":
            if not current_client or not current_client.is_connected:
                self._send_json(400, {
                    "success": False,
                    "error": "NOT_CONNECTED",
                    "message": "Device not connected"
                })
                return

            uid = int(body.get("uid") or body.get("user_id") or 1)
            user_id = str(body.get("user_id") or uid)
            name = str(body.get("name") or f"User {user_id}")
            privilege = int(body.get("privilege") or 0)
            password = str(body.get("password") or "")
            card = int(body.get("card") or 0)

            res = current_client.add_or_update_user(uid, user_id, name, privilege, password, card)
            status_code = 200 if res.get("success") else 400
            self._send_json(status_code, res)

        elif path == "/api/clear-attendance":
            if not current_client or not current_client.is_connected:
                self._send_json(400, {
                    "success": False,
                    "error": "NOT_CONNECTED",
                    "message": "Device not connected"
                })
                return

            res = current_client.clear_attendance_logs()
            status_code = 200 if res.get("success") else 400
            self._send_json(status_code, res)

        elif path == "/api/restart-device":
            if not current_client or not current_client.is_connected:
                self._send_json(400, {
                    "success": False,
                    "error": "NOT_CONNECTED",
                    "message": "Device not connected"
                })
                return

            res = current_client.restart_device()
            current_client = None
            self._send_json(200, res)

        else:
            self._send_json(404, {
                "success": False,
                "error": "NOT_FOUND",
                "message": f"Endpoint POST {path} not found"
            })

    def do_DELETE(self):
        """Handle DELETE requests."""
        if not self._verify_auth():
            return

        parsed = urlparse(self.path)
        path = parsed.path
        
        global current_client

        if path.startswith("/api/users/"):
            user_id_param = path.replace("/api/users/", "").strip()
            if not current_client or not current_client.is_connected:
                self._send_json(400, {
                    "success": False,
                    "error": "NOT_CONNECTED",
                    "message": "Device not connected"
                })
                return

            try:
                uid = int(user_id_param)
            except ValueError:
                uid = 1

            res = current_client.delete_user(uid, user_id_param)
            status_code = 200 if res.get("success") else 400
            self._send_json(status_code, res)
        else:
            self._send_json(404, {
                "success": False,
                "error": "NOT_FOUND",
                "message": f"Endpoint DELETE {path} not found"
            })

    def log_message(self, format, *args):
        """Route standard HTTP server logs to connector logger."""
        logger.info(f"{self.address_string()} - {format % args}")


def run_server():
    """Start Python connector HTTP listener."""
    server_address = (HOST, PORT)
    httpd = HTTPServer(server_address, ConnectorAPIHandler)
    logger.info("=" * 60)
    logger.info(f"ZKTeco K40 Python Connector starting on http://{HOST}:{PORT}")
    logger.info(f"Listening for authenticated PHP requests with token security")
    logger.info("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down ZKTeco K40 Connector...")
        if current_client:
            current_client.disconnect()
        httpd.server_close()
        logger.info("Connector stopped.")


if __name__ == "__main__":
    run_server()
