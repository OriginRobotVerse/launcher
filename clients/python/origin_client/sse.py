from __future__ import annotations

import json
import threading
from typing import Any, Callable

import requests
import sseclient


class SSESubscription:
    """Subscribes to Origin SSE events in a background thread.

    Usage:
        def handle_event(event_type, data):
            print(f"{event_type}: {data}")

        sub = SSESubscription(
            url="http://localhost:3000/events",
            on_event=handle_event,
        )
        # ... later ...
        sub.close()
    """

    def __init__(
        self,
        url: str,
        token: str | None = None,
        on_event: Callable[[str, dict[str, Any]], None] | None = None,
        on_error: Callable[[Exception], None] | None = None,
    ):
        self.url = url
        self.token = token
        self.on_event = on_event
        self.on_error = on_error
        self._stop_event = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self) -> None:
        headers: dict[str, str] = {"Accept": "text/event-stream"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        while not self._stop_event.is_set():
            try:
                resp = requests.get(
                    self.url,
                    headers=headers,
                    stream=True,
                    timeout=None,
                )
                resp.raise_for_status()

                client = sseclient.SSEClient(resp)

                for event in client.events():
                    if self._stop_event.is_set():
                        break

                    if not event.event or not event.data:
                        continue

                    try:
                        data = json.loads(event.data)
                    except json.JSONDecodeError:
                        continue

                    if self.on_event:
                        try:
                            self.on_event(event.event, data)
                        except Exception:
                            pass  # Don't let callback errors kill the thread

            except Exception as e:
                if self._stop_event.is_set():
                    break
                if self.on_error:
                    try:
                        self.on_error(e)
                    except Exception:
                        pass
                # Brief pause before reconnecting
                self._stop_event.wait(timeout=2.0)

    def close(self) -> None:
        """Stop the SSE subscription and wait for the background thread to finish."""
        self._stop_event.set()
        self._thread.join(timeout=5.0)

    @property
    def is_active(self) -> bool:
        return self._thread.is_alive() and not self._stop_event.is_set()
