#!/usr/bin/env python3
"""
Walk the simulated Unitree Go2 and log IMU data.

Usage:
    python examples/robot-walker.py [server-url] [device-id]
"""

import sys
import time
import signal

sys.path.insert(0, "clients/python")
from origin_client import OriginClient

SERVER_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
DEVICE_ID = sys.argv[2] if len(sys.argv) > 2 else "unitree-go2"

YAW_THRESHOLD = 15


def main():
    client = OriginClient(SERVER_URL)
    running = True

    def shutdown(sig, frame):
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    info = client.get_server_info()
    print(f"Connected to {info.name} v{info.version}")

    device = client.get_device(DEVICE_ID)
    print(f"Device: {device.id} (v{device.version})")
    print(f"Actions: {', '.join(device.manifest.actions)}")
    print()

    last_action = ""

    while running:
        state = client.get_device_state(DEVICE_ID)
        pitch = state.get("pitch", 0)
        yaw = state.get("yaw", 0)
        pos_z = state.get("pos_z", 0)
        vel_x = state.get("vel_x", 0)

        # Status line
        print(
            f"\r  pitch={pitch:6.1f}°  yaw={yaw:6.1f}°  "
            f"z={pos_z:.2f}m  vel_x={vel_x:.2f}m/s  "
            f"action={last_action:<12s}",
            end="",
            flush=True,
        )

        # Fallen check
        if abs(pitch) > 60 or pos_z < 0.15:
            if last_action != "stand":
                print(f"\n  Fallen — standing up")
                client.send_action(DEVICE_ID, "stand")
                last_action = "stand"
        elif yaw > YAW_THRESHOLD:
            if last_action != "turn_left":
                print(f"\n  Yaw drift — turning left")
                client.send_action(DEVICE_ID, "turn_left", {"speed": 0.3})
                last_action = "turn_left"
        elif yaw < -YAW_THRESHOLD:
            if last_action != "turn_right":
                print(f"\n  Yaw drift — turning right")
                client.send_action(DEVICE_ID, "turn_right", {"speed": 0.3})
                last_action = "turn_right"
        else:
            if last_action != "walk_fwd":
                print(f"\n  Walking forward")
                client.send_action(DEVICE_ID, "walk_fwd", {"speed": 0.5})
                last_action = "walk_fwd"

        time.sleep(0.2)

    print("\n\nStopping...")
    client.send_action(DEVICE_ID, "stand")
    client.close()


if __name__ == "__main__":
    main()
