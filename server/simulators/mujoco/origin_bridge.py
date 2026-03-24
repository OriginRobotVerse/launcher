"""
TCP client that speaks the Origin wire protocol.

Connects to the Origin server, sends announce + readings,
and receives discover/ack/action messages.
"""

import json
import socket
import threading
import queue
from typing import Callable


class OriginBridge:
    def __init__(self, host: str, port: int):
        self.host = host
        self.port = port
        self.sock: socket.socket | None = None
        self._recv_buffer = ""
        self._action_queue: queue.Queue[dict] = queue.Queue()
        self._on_discover: Callable[[], None] | None = None
        self._running = False
        self._recv_thread: threading.Thread | None = None

    def connect(self) -> None:
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.connect((self.host, self.port))
        self._running = True
        self._recv_thread = threading.Thread(target=self._recv_loop, daemon=True)
        self._recv_thread.start()

    def send_announce(self, manifest: dict) -> None:
        self._send({"type": "announce", **manifest})

    def send_readings(self, data: dict[str, float]) -> None:
        self._send({"type": "readings", "data": data})

    def get_pending_actions(self) -> list[dict]:
        """Drain all queued action messages (non-blocking)."""
        actions = []
        while True:
            try:
                actions.append(self._action_queue.get_nowait())
            except queue.Empty:
                break
        return actions

    def on_discover(self, callback: Callable[[], None]) -> None:
        self._on_discover = callback

    def close(self) -> None:
        self._running = False
        if self.sock:
            try:
                self.sock.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            self.sock.close()
            self.sock = None

    def _send(self, msg: dict) -> None:
        if not self.sock:
            return
        line = json.dumps(msg) + "\n"
        try:
            self.sock.sendall(line.encode("utf-8"))
        except (BrokenPipeError, ConnectionResetError, OSError):
            self._running = False

    def _recv_loop(self) -> None:
        while self._running and self.sock:
            try:
                chunk = self.sock.recv(4096)
                if not chunk:
                    break
                self._recv_buffer += chunk.decode("utf-8")
                while "\n" in self._recv_buffer:
                    line, self._recv_buffer = self._recv_buffer.split("\n", 1)
                    line = line.strip()
                    if not line:
                        continue
                    self._handle_message(line)
            except (ConnectionResetError, OSError):
                break

        self._running = False

    def _handle_message(self, line: str) -> None:
        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            return

        msg_type = msg.get("type")
        if msg_type == "ack":
            print("[bridge] Received ack from server")
        elif msg_type == "discover":
            print("[bridge] Received discover from server")
            if self._on_discover:
                self._on_discover()
        elif msg_type == "action":
            self._action_queue.put(msg)
