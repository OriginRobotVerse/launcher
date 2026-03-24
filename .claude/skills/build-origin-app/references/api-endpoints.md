# Origin Server REST API Reference

Base URL: `http://localhost:5050` (configurable via `--port`)

## Devices

| Method | Path | Description |
|--------|------|-------------|
| GET | `/devices` | List all connected devices |
| GET | `/devices/:id` | Device detail (manifest, state, timestamps) |
| GET | `/devices/:id/state` | Current state as `Record<string, number>` |
| POST | `/devices/:id/actions` | Send action: `{ name, params? }` |
| GET | `/devices/:id/events` | SSE stream for live state updates |
| POST | `/discover` | Trigger device discovery |

### SSE Event Types

- `state.updated` — device state changed
- `action.sent` — action was sent to device
- `device.connected` — new device connected
- `device.disconnected` — device disconnected

### Action Request

```json
POST /devices/unitree-go2/actions
{
  "name": "set_pos",
  "params": { "ctrl_0": 0.5, "ctrl_1": 0.9 }
}
```

## Apps

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/apps` | List installed apps with running status |
| GET | `/api/apps/:id` | App detail (manifest, compatibility, secrets) |
| POST | `/api/apps/install` | Install: `{ source, name? }` |
| POST | `/api/apps/scan` | Rescan apps directory |
| POST | `/api/apps/:id/launch` | Launch: `{ deviceId, mode? }` |
| POST | `/api/apps/:id/stop` | Stop running app |
| GET | `/api/apps/:id/logs` | Get logs: `?lines=200` |
| POST | `/api/apps/:id/secrets` | Save secrets: `{ secrets: {} }` |
| DELETE | `/api/apps/:id` | Uninstall app |

## Simulators

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/simulators` | List available models + running simulators |
| POST | `/api/simulators/launch` | Launch: `{ model, deviceId?, headless?, hz? }` |
| POST | `/api/simulators/:deviceId/stop` | Stop simulator |
| GET | `/api/simulators/:deviceId/logs` | Get simulator logs |

### Available Models

`unitree_go2`, `unitree_g1`, `unitree_h1`, `anymal_c`, `shadow_hand`

## Profiles

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/profiles` | List all device profiles |
| GET | `/api/profiles/:deviceId` | Get profile for device |
| PUT | `/api/profiles/:deviceId` | Save/update profile |
| DELETE | `/api/profiles/:deviceId` | Delete custom profile |

## Status

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Full system status (devices, apps, simulators) |
| GET | `/` | Server info (name, version, uptime, device count) |

## Webhooks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/webhooks` | List registered webhooks |
| POST | `/webhooks` | Register: `{ url, events?, secret? }` |
| DELETE | `/webhooks/:id` | Remove webhook |
