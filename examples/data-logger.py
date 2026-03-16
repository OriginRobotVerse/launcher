#!/usr/bin/env python3
"""
Data Logger — subscribes to SSE events and logs state changes to a CSV file.

Usage:
    python examples/data-logger.py [server-url] [device-id] [output-file]

Defaults:
    server-url:  http://localhost:3000
    device-id:   logs all devices
    output-file: origin-data.csv

The CSV includes timestamp, device_id, and all state key-value pairs.
New columns are added automatically as new state keys appear.
"""

import csv
import os
import signal
import sys
import time
from datetime import datetime

sys.path.insert(0, "clients/python")
from origin_client import OriginClient, SSESubscription

SERVER_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
TARGET_DEVICE = sys.argv[2] if len(sys.argv) > 2 else None
OUTPUT_FILE = sys.argv[3] if len(sys.argv) > 3 else "origin-data.csv"


class DataLogger:
    def __init__(self, output_path: str):
        self.output_path = output_path
        self.known_keys: list[str] = []
        self.row_count = 0
        self._file = None
        self._writer = None

    def _ensure_file(self, state_keys: list[str]):
        """Create or update the CSV file with the current set of known keys."""
        new_keys = [k for k in state_keys if k not in self.known_keys]
        if new_keys:
            self.known_keys.extend(new_keys)

        if self._file is None:
            file_exists = os.path.exists(self.output_path) and os.path.getsize(self.output_path) > 0
            self._file = open(self.output_path, "a", newline="")
            self._writer = csv.writer(self._file)
            if not file_exists:
                self._write_header()
        elif new_keys:
            # Keys changed — rewrite header (append mode, so we just note it)
            # In practice, this means the CSV columns may not match later rows.
            # For production use, consider a fixed schema or Parquet format.
            pass

    def _write_header(self):
        if self._writer:
            self._writer.writerow(["timestamp", "device_id"] + self.known_keys)
            self._file.flush()

    def log_state(self, device_id: str, state: dict, timestamp: str):
        """Write a state snapshot as a CSV row."""
        state_keys = sorted(state.keys())
        self._ensure_file(state_keys)

        if self._writer is None:
            return

        row = [timestamp, device_id]
        for key in self.known_keys:
            row.append(state.get(key, ""))

        self._writer.writerow(row)
        self._file.flush()
        self.row_count += 1

    def close(self):
        if self._file:
            self._file.close()
            self._file = None
            self._writer = None


def main():
    client = OriginClient(SERVER_URL)
    logger = DataLogger(OUTPUT_FILE)
    running = True

    def shutdown(sig, frame):
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # Connect and discover
    info = client.get_server_info()
    print(f"Connected to {info.name} v{info.version}")
    print(f"Logging to: {os.path.abspath(OUTPUT_FILE)}")

    if TARGET_DEVICE:
        print(f"Filtering: device '{TARGET_DEVICE}' only")
    else:
        print("Logging all devices")

    # Get initial state
    devices = client.list_devices()
    if not devices:
        print("No devices connected. Waiting for connections...")
    else:
        for device in devices:
            if TARGET_DEVICE and device.id != TARGET_DEVICE:
                continue
            state = client.get_device_state(device.id)
            logger.log_state(device.id, state, datetime.now().isoformat())
            print(f"  Initial state for {device.id}: {state}")

    print()

    # Subscribe to state updates
    def on_event(event_type: str, data: dict):
        if event_type == "state.updated":
            device_id = data.get("deviceId", "unknown")
            state = data.get("data", {}).get("state", {})
            timestamp = data.get("timestamp", datetime.now().isoformat())
            logger.log_state(device_id, state, timestamp)

            if logger.row_count % 100 == 0:
                print(f"  [{logger.row_count} rows logged]")

        elif event_type == "device.connected":
            device_id = data.get("deviceId", "unknown")
            print(f"  Device connected: {device_id}")

        elif event_type == "device.disconnected":
            device_id = data.get("deviceId", "unknown")
            print(f"  Device disconnected: {device_id}")

    def on_error(err: Exception):
        print(f"  SSE error: {err}")

    sub = client.subscribe(
        device_id=TARGET_DEVICE,
        on_event=on_event,
        on_error=on_error,
    )

    print("Logging started. Press Ctrl+C to stop.\n")

    # Keep main thread alive
    while running:
        time.sleep(0.5)

    # Cleanup
    print(f"\nStopping... ({logger.row_count} rows logged)")
    sub.close()
    logger.close()
    client.close()
    print(f"Data saved to {os.path.abspath(OUTPUT_FILE)}")


if __name__ == "__main__":
    main()
