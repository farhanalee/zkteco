"""
ZKTeco K40 Connector Configuration
"""
import os

# Server configuration
HOST = os.getenv("CONNECTOR_HOST", "127.0.0.1")
PORT = int(os.getenv("CONNECTOR_PORT", "9000"))

# Security Token for PHP <-> Python communication
# Must match the token configured in /config/app.json
CONNECTOR_TOKEN = os.getenv("CONNECTOR_TOKEN", "zk_sec_tok_k40_9837421894a87b1c")

# Device default settings
DEFAULT_DEVICE_IP = os.getenv("DEVICE_IP", "192.168.227.180")
DEFAULT_DEVICE_PORT = int(os.getenv("DEVICE_PORT", "4370"))
DEFAULT_COMM_KEY = int(os.getenv("DEVICE_COMM_KEY", "0"))
DEFAULT_TIMEOUT = int(os.getenv("DEVICE_TIMEOUT", "5"))

# Storage paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_DIR = os.path.join(BASE_DIR, "storage", "logs")
CACHE_DIR = os.path.join(BASE_DIR, "storage", "cache")

os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

LOG_FILE = os.path.join(LOG_DIR, "connector.log")
