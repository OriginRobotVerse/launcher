#!/usr/bin/env python3
"""
Gesture Controller — simulated ML gesture recognition controlling a device.

This example simulates hand gesture detection and maps gestures to device actions.
In production, replace the simulated gestures with a real ML pipeline
(e.g., MediaPipe hand tracking + a trained classifier).

Usage:
    python examples/gesture-controller.py [server-url] [device-id]

Defaults:
    server-url: http://localhost:3000
    device-id:  uses first connected device
"""

import random
import signal
import sys
import time

sys.path.insert(0, "clients/python")
from origin_client import OriginClient, OriginError

SERVER_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
TARGET_DEVICE = sys.argv[2] if len(sys.argv) > 2 else None

# Gesture-to-action mapping
GESTURE_MAP = {
    "open_hand": "stop",
    "fist": "moveFwd",
    "point_left": "moveLeft",
    "point_right": "moveRight",
    "thumbs_up": "moveFwd",
    "thumbs_down": "moveBkwd",
}

# Simulated gesture probabilities (weighted toward forward movement)
GESTURE_WEIGHTS = {
    "open_hand": 0.1,
    "fist": 0.35,
    "point_left": 0.15,
    "point_right": 0.15,
    "thumbs_up": 0.15,
    "thumbs_down": 0.1,
}

GESTURES = list(GESTURE_WEIGHTS.keys())
WEIGHTS = list(GESTURE_WEIGHTS.values())


def simulate_gesture_detection() -> str:
    """Simulate ML gesture detection. Replace this with real ML inference."""
    return random.choices(GESTURES, weights=WEIGHTS, k=1)[0]


def main():
    client = OriginClient(SERVER_URL)
    running = True

    def shutdown(sig, frame):
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # Discover device
    info = client.get_server_info()
    print(f"Connected to {info.name} v{info.version} ({info.device_count} device(s))")

    devices = client.list_devices()
    if not devices:
        print("No devices connected.")
        sys.exit(1)

    device_id = TARGET_DEVICE or devices[0].id
    device = client.get_device(device_id)
    print(f"Using device: {device.id} (v{device.version})")
    print(f"  Actions: {', '.join(device.manifest.actions)}")
    print()

    # Validate that the gesture map actions exist on the device
    available = set(device.manifest.actions)
    for gesture, action in GESTURE_MAP.items():
        if action not in available:
            print(f"  Warning: action '{action}' (for gesture '{gesture}') not available on device")

    print("Starting gesture control loop (simulated)...")
    print("Press Ctrl+C to stop.\n")

    last_action = None
    gesture_count = 0

    while running:
        gesture = simulate_gesture_detection()
        action = GESTURE_MAP.get(gesture, "stop")

        # Only send if the action changed (avoid spamming the same command)
        if action != last_action:
            try:
                params = {"speed": 180} if action in ("moveFwd", "moveBkwd") else {}
                result = client.send_action(device_id, action, params or None)
                gesture_count += 1
                print(f"  [{gesture_count:4d}] Gesture: {gesture:<15s} -> Action: {action}")
                last_action = action
            except OriginError as e:
                print(f"  Error sending action: {e}")

        time.sleep(0.3)  # ~3 Hz gesture detection rate

    # Cleanup
    print("\nStopping device...")
    try:
        client.send_action(device_id, "stop")
    except Exception:
        pass
    client.close()
    print("Done.")


if __name__ == "__main__":
    main()
