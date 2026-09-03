#!/usr/bin/env python3
"""
ZKTeco K40 Python Connector - Main Launcher
Entry point for starting the local connector daemon on Windows / Linux / macOS.
"""

import sys
import os

# Add connector dir to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api import run_server

if __name__ == "__main__":
    print("""
======================================================
     ZKTeco K40 Attendance Python Connector v1.0      
======================================================
  Mode: Direct TCP/IP & UDP ZKTeco Standalone Driver
  Source of Truth: Physical ZKTeco K40 Terminal
  Database: None required (Direct Device Querying)
======================================================
""")
    try:
        run_server()
    except Exception as e:
        print(f"\n[FATAL ERROR] Failed to run connector: {e}", file=sys.stderr)
        sys.exit(1)
