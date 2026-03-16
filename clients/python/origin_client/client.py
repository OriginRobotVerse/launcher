from __future__ import annotations

from typing import Any

import requests

from origin_client.models import (
    DeviceDetail,
    DeviceSummary,
    DeviceManifest,
    ServerInfo,
    Webhook,
)
from origin_client.sse import SSESubscription


class OriginError(Exception):
    """Raised when the Origin server returns a non-2xx response."""

    def __init__(self, message: str, status: int, body: Any = None):
        super().__init__(message)
        self.status = status
        self.body = body


class OriginClient:
    """HTTP client for the Origin server API.

    Usage:
        client = OriginClient("http://localhost:3000")
        devices = client.list_devices()
        client.send_action("toy-car", "moveFwd", {"speed": 200})
    """

    def __init__(self, url: str, token: str | None = None):
        self.base_url = url.rstrip("/")
        self.token = token
        self._session = requests.Session()
        if token:
            self._session.headers["Authorization"] = f"Bearer {token}"
        self._session.headers["Content-Type"] = "application/json"

    def _request(self, method: str, path: str, json_body: Any = None) -> Any:
        url = f"{self.base_url}{path}"
        resp = self._session.request(method, url, json=json_body)
        if not resp.ok:
            try:
                body = resp.json()
            except Exception:
                body = resp.text
            raise OriginError(
                f"{method} {path} failed with status {resp.status_code}",
                resp.status_code,
                body,
            )
        return resp.json()

    # --- API methods ---

    def get_server_info(self) -> ServerInfo:
        data = self._request("GET", "/")
        return ServerInfo.from_dict(data)

    def list_devices(self) -> list[DeviceSummary]:
        data = self._request("GET", "/devices")
        return [DeviceSummary.from_dict(d) for d in data]

    def get_device(self, device_id: str) -> DeviceDetail:
        data = self._request("GET", f"/devices/{device_id}")
        return DeviceDetail.from_dict(data)

    def get_device_state(self, device_id: str) -> dict[str, float]:
        return self._request("GET", f"/devices/{device_id}/state")

    def send_action(
        self,
        device_id: str,
        name: str,
        params: dict[str, float] | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"name": name}
        if params:
            body["params"] = params
        return self._request("POST", f"/devices/{device_id}/actions", body)

    def register_webhook(
        self,
        url: str,
        events: list[str] | None = None,
        secret: str | None = None,
    ) -> Webhook:
        body: dict[str, Any] = {"url": url}
        if events:
            body["events"] = events
        if secret:
            body["secret"] = secret
        data = self._request("POST", "/webhooks", body)
        return Webhook.from_dict(data)

    def list_webhooks(self) -> list[Webhook]:
        data = self._request("GET", "/webhooks")
        return [Webhook.from_dict(w) for w in data]

    def delete_webhook(self, webhook_id: str) -> None:
        self._request("DELETE", f"/webhooks/{webhook_id}")

    # --- SSE ---

    def subscribe(
        self,
        device_id: str | None = None,
        on_event: Any = None,
        on_error: Any = None,
    ) -> SSESubscription:
        """Subscribe to SSE events. Returns an SSESubscription that runs in a background thread.

        Args:
            device_id: If provided, only receive events for this device.
            on_event: Callback(event_type: str, data: dict) called for each event.
            on_error: Callback(error: Exception) called on errors.
        """
        if device_id:
            path = f"/devices/{device_id}/events"
        else:
            path = "/events"

        url = f"{self.base_url}{path}"
        return SSESubscription(
            url=url,
            token=self.token,
            on_event=on_event,
            on_error=on_error,
        )

    def close(self) -> None:
        """Close the underlying HTTP session."""
        self._session.close()
