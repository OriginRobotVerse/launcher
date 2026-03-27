# originrobot

CLI and server for the [Origin](https://github.com/OriginRobotVerse/launcher) robotics platform. Connect hardware devices, install robot control apps, launch simulators, and manage everything from a built-in dashboard.

## Install

```bash
npm install -g originrobot
```

Or run directly with npx:

```bash
npx originrobot up
```

Requires Node.js ≥ 20.

## Quick Start

```bash
# Start the server (API + dashboard on port 5050)
origin up

# Connect a serial device
origin up --serial /dev/ttyUSB0

# Connect via Bluetooth
origin up --bluetooth /dev/rfcomm0

# Open a TCP port for MuJoCo simulators
origin up --tcp 5051

# Install a robot control app
origin install https://github.com/user/my-robot-app

# Launch it on a connected device
origin launch my-robot-app --device toy-car
```

Open **http://localhost:5050** to access the dashboard.

## Commands

```
origin up [options]                       Start server + dashboard
  --port, -p <number>                     Server port (default: 5050)
  --serial, -s <path>                     Serial port (repeatable)
  --bluetooth, -b <path>                  Bluetooth port (repeatable)
  --tcp <port>                            TCP listener for simulators (repeatable)
  --baud <number>                         Baud rate (default: 9600)
  --token, -t <string>                    Bearer token for API auth
  --no-dashboard                          Skip the dashboard
  --open                                  Auto-open dashboard in browser

origin devices                            List connected devices
origin devices info <device-id>           Device detail + profile

origin apps                               List installed apps

origin install <source>                   Install an app (GitHub URL, local path, or tarball)
  --name <id>                             Override the app ID

origin uninstall <app-id>                 Remove an installed app

origin launch <app-id>                    Launch an app on a device
  --device, -d <device-id>               Target device (required)
  --mode <dev|prod>                       Run mode (default: dev)
  --open                                  Auto-open frontend in browser

origin stop <app-id>                      Stop a running app

origin secrets set <app-id> <key> <value> Set a secret
origin secrets list <app-id>              Show secret status

origin status                             Server info, devices, running apps
origin discover                           Scan for devices across all ports
origin profiles                           List device profiles
origin profiles show <device-id>          Show profile detail
```

## Configuration

Create a `config.ts` (or `config.js`) in the directory where you run `origin up`:

```typescript
import { defineConfig } from "originrobot"
import { SqliteStorageAdapter } from "originrobot/storage-sqlite"

export default defineConfig({
  port: 5050,
  tcp: 5051,
  baudRate: 9600,
  storage: new SqliteStorageAdapter("./data/origin.db"),
  appsDir: "./apps",
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `5050` | Server port (API + dashboard) |
| `serial` | `string \| string[]` | — | Serial port path(s) |
| `bluetooth` | `string \| string[]` | — | Bluetooth port path(s) |
| `tcp` | `number \| number[]` | — | TCP listener port(s) for simulators |
| `baudRate` | `number` | `9600` | Baud rate for serial/bluetooth |
| `token` | `string` | — | Bearer token for API auth |
| `storage` | `StorageAdapter` | In-memory | Storage backend |
| `appsDir` | `string` | `"./apps"` | Directory for installed apps |

CLI flags override config file values.

## Apps

Origin apps are directories with an `origin-app.json` manifest. Install from GitHub, a local path, or a tarball:

```bash
origin install https://github.com/user/robot-teleop
origin install ./my-local-app
origin install https://example.com/app-v1.tar.gz
```

Browse and request apps from the [Origin Marketplace](https://store.origin-industries.systems).

### Manifest

```json
{
  "name": "My Robot App",
  "id": "my-robot-app",
  "version": "1.0.0",
  "device": {
    "type": "quadruped",
    "requiredActions": ["set_pos", "reset"],
    "requiredState": ["base_pos_z"]
  },
  "runtime": {
    "type": "nextjs",
    "port": 3001,
    "devCmd": "pnpm dev",
    "startCmd": "pnpm start",
    "env": {
      "NEXT_PUBLIC_ORIGIN_URL": "{{origin.url}}",
      "NEXT_PUBLIC_DEVICE_ID": "{{device.id}}"
    }
  }
}
```

Device types: `wheeled`, `quadruped`, `humanoid`, `arm`, `generic`

Template variables resolved at launch: `{{origin.url}}`, `{{device.id}}`, `{{backend.port}}`, `{{app.port}}`

## REST API

The server exposes a REST API on port 5050 (default). All endpoints return JSON.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/devices` | List connected devices |
| `GET` | `/devices/:id` | Device detail |
| `GET` | `/devices/:id/state` | Current state |
| `POST` | `/devices/:id/actions` | Send an action |
| `GET` | `/devices/:id/events` | SSE event stream |
| `GET` | `/api/apps` | List installed apps |
| `POST` | `/api/apps/install` | Install an app |
| `POST` | `/api/apps/:id/launch` | Launch an app |
| `POST` | `/api/apps/:id/stop` | Stop an app |
| `GET` | `/api/apps/:id/logs` | App logs |
| `POST` | `/api/simulators/launch` | Launch a simulator |
| `GET` | `/events` | Global SSE stream |

## Simulators

Origin supports MuJoCo robot simulators over TCP. Start the server with `--tcp` and launch simulators from the dashboard or API:

```bash
origin up --tcp 5051
```

Simulators appear as regular devices once connected.

## License

MIT
