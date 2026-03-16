from dataclasses import dataclass, field
from typing import Any


@dataclass
class ServerInfo:
    name: str
    version: str
    uptime: int
    device_count: int

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "ServerInfo":
        return cls(
            name=d["name"],
            version=d["version"],
            uptime=d["uptime"],
            device_count=d["deviceCount"],
        )


@dataclass
class SensorInfo:
    name: str
    pins: list[int]

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "SensorInfo":
        return cls(name=d["name"], pins=d["pins"])


@dataclass
class ChipInfo:
    name: str
    pins: list[int]

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "ChipInfo":
        return cls(name=d["name"], pins=d["pins"])


@dataclass
class StateSchemaEntry:
    key: str
    type: str

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "StateSchemaEntry":
        return cls(key=d["key"], type=d["type"])


@dataclass
class DeviceManifest:
    id: str
    version: str
    sensors: list[SensorInfo]
    chips: list[ChipInfo]
    actions: list[str]
    state: list[StateSchemaEntry]

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "DeviceManifest":
        return cls(
            id=d["id"],
            version=d["version"],
            sensors=[SensorInfo.from_dict(s) for s in d["sensors"]],
            chips=[ChipInfo.from_dict(c) for c in d["chips"]],
            actions=d["actions"],
            state=[StateSchemaEntry.from_dict(s) for s in d["state"]],
        )


@dataclass
class DeviceSummary:
    id: str
    version: str
    connected_at: str
    actions: list[str]
    sensor_count: int
    chip_count: int

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "DeviceSummary":
        return cls(
            id=d["id"],
            version=d["version"],
            connected_at=d["connectedAt"],
            actions=d["actions"],
            sensor_count=d["sensorCount"],
            chip_count=d["chipCount"],
        )


@dataclass
class DeviceDetail:
    id: str
    version: str
    connected_at: str
    manifest: DeviceManifest
    state: dict[str, float]
    last_updated: str | None

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "DeviceDetail":
        return cls(
            id=d["id"],
            version=d["version"],
            connected_at=d["connectedAt"],
            manifest=DeviceManifest.from_dict(d["manifest"]),
            state=d["state"],
            last_updated=d.get("lastUpdated"),
        )


@dataclass
class Webhook:
    id: str
    url: str
    events: list[str]
    created_at: str

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Webhook":
        return cls(
            id=d["id"],
            url=d["url"],
            events=d["events"],
            created_at=d["createdAt"],
        )
