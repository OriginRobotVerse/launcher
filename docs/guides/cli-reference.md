# Origin CLI Reference

Origin is a platform for managing robots, simulators, and robotics applications. The `origin` CLI provides commands to start the server, connect hardware, install and launch apps, and manage device profiles.

---

## Installation

Install globally with npm:

```bash
npm install -g originrobot-server
```

Or add it to a project with pnpm:

```bash
pnpm add originrobot-server
```

This installs two executables:

- **`origin`** -- the CLI tool documented here
- **`origin-server`** -- starts the server directly (equivalent to `node dist/index.js`)

---

## Quick Start

```bash
# Start the server and dashboard
origin up

# Install a robotics app from GitHub
origin install https://github.com/user/my-robot-app

# Launch the app on a connected device
origin launch my-robot-app -d toy-car
```

Once the server is running, open **http://localhost:5051** in your browser to access the dashboard.

---

## Command Reference

### origin up

Start the Origin core server and the Next.js dashboard.

```
origin up [options]
```

**Flags:**

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--port <number>` | `-p` | `5050` | Core server port |
| `--dashboard-port <number>` | | `5051` | Dashboard port |
| `--serial <path>` | `-s` | | Serial port path (repeatable) |
| `--bluetooth <path>` | `-b` | | Bluetooth port path (repeatable) |
| `--tcp <port>` | | | TCP listener port for simulators (repeatable) |
| `--baud <number>` | | `9600` | Baud rate for serial/bluetooth connections |
| `--token <string>` | `-t` | | Bearer token for API authentication |
| `--no-dashboard` | | | Skip starting the dashboard |
| `--open` | | | Auto-open the dashboard in your browser |

**Startup output:**

```
  origin v0.2.0

  core server  -> http://localhost:5050
  dashboard    -> http://localhost:5051

  ports        -> /dev/ttyUSB0 (connected)
  apps         -> 3 installed
```

The server loads configuration from `config.ts` or `config.js` in the current working directory if either file exists. Command-line flags take precedence over file configuration.

**Examples:**

```bash
# Start with a serial device
origin up --serial /dev/ttyUSB0

# Start with a TCP listener for simulators, no dashboard
origin up --tcp 5051 --no-dashboard

# Start on custom ports with authentication
origin up --port 8080 --dashboard-port 8081 --token my-secret-token

# Multiple serial ports with a custom baud rate
origin up -s /dev/ttyUSB0 -s /dev/ttyACM0 --baud 115200
```

Press `Ctrl+C` to gracefully shut down. The server stops all running apps, disconnects simulators, closes hardware transports, and terminates the dashboard process.

---

### origin devices

List all connected devices.

```
origin devices [--json]
```

**Flags:**

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

**Example output:**

```
  ID                TYPE        ACTIONS                                   STATE KEYS
  unitree-go2       quadruped   set_position, set_velocity, stand, ...    37
  toy-car           wheeled     moveFwd, moveLeft, moveRight, stop        3
```

When no devices are connected:

```
  No devices connected.
  Run 'origin discover' to scan for devices.
```

---

### origin devices info \<device-id\>

Show detailed information about a specific device.

```
origin devices info <device-id> [--json]
```

**Example output:**

```
  Device: toy-car
  Version: 1.0.0
  Connected: 2026-03-24T10:30:00.000Z
  Last Updated: 2026-03-24T10:30:05.123Z

  Actions:
    - moveFwd
    - moveLeft
    - moveRight
    - stop

  Sensors:
    - ultrasonic (pins: 9, 10)

  State:
    distance: 42.5
    speed: 0
    angle: 90
```

---

### origin apps

List all installed apps.

```
origin apps [--json]
```

**Flags:**

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

**Example output:**

```
  ID                            VERSION   DEVICE TYPE   STATUS
  mujoco-policy-controller      0.1.0     quadruped     installed
  remote-teleop                 1.2.0     generic       ▶ running (toy-car)
```

When no apps are installed:

```
  No apps installed.
  Install one with: origin install <github-url>
```

---

### origin install \<source\>

Install a robotics app into Origin.

```
origin install <source> [--name <override-id>]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `source` | GitHub URL, local path, or tarball URL |

**Flags:**

| Flag | Description |
|------|-------------|
| `--name <id>` | Override the app ID from the manifest |

**Source types:**

- **GitHub URL** -- cloned via `git clone` into the apps directory
- **Local path** -- symlinked into the apps directory (the original directory is not copied)
- **Tarball URL** -- downloaded and extracted into the apps directory

**Install process:**

1. Clone, symlink, or extract the source into the apps directory
2. Validate the `origin-app.json` manifest (must contain `id`, `name`, and `runtime`)
3. Run setup commands if defined in the manifest: `setup`, `runtime.setupCmd`, `backend.setupCmd`, `backend.installCmd`, `runtime.buildCmd`
4. Register the app in storage

**Examples:**

```bash
# Install from GitHub
origin install https://github.com/user/robot-teleop
  Installing from https://github.com/user/robot-teleop...
  ✓ Installed Robot Teleop (robot-teleop) v1.0.0
  Launch with: origin launch robot-teleop --device <device-id>

# Install from a local directory (creates a symlink)
origin install ./my-local-app

# Install with a custom ID
origin install https://github.com/user/app --name my-custom-id

# Install from a tarball
origin install https://registry.example.com/app-v1.0.0.tar.gz
```

---

### origin uninstall \<app-id\>

Remove an installed app. If the app is currently running, it is stopped first. Symlinked local apps have only their symlink removed; the original directory is preserved.

```
origin uninstall <app-id>
```

**Example:**

```bash
origin uninstall robot-teleop
  ✓ Uninstalled robot-teleop
```

---

### origin launch \<app-id\>

Launch an installed app on a connected device.

```
origin launch <app-id> --device <device-id> [options]
```

**Flags:**

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--device <device-id>` | `-d` | | Target device (required) |
| `--mode <dev\|prod>` | | `dev` | Run mode: `dev` uses `devCmd`, `prod` uses `startCmd` |
| `--open` | | | Auto-open the frontend URL in your browser |

**Launch sequence:**

1. Verify the app is installed and not already running
2. Check that all required secrets are configured
3. Resolve template variables (`{{origin.url}}`, `{{device.id}}`, `{{backend.port}}`, `{{app.port}}`)
4. Start the backend process if one is defined in the manifest
5. Wait for backend health check to pass (if configured)
6. Start the frontend process
7. Wait for frontend health check or port availability
8. Report the running URLs

**Example:**

```bash
origin launch mujoco-policy-controller -d unitree-go2 --open
  Launching mujoco-policy-controller on device unitree-go2 (dev)...
  ✓ mujoco-policy-controller is running
    frontend -> http://localhost:3001
    backend  -> http://localhost:8000
```

If required secrets are missing, the launch fails with a message listing the missing keys. Use `origin secrets set` to configure them before retrying.

---

### origin stop \<app-id\>

Stop a running app. Sends SIGTERM to both frontend and backend processes, with a SIGKILL fallback after 5 seconds.

```
origin stop <app-id>
```

**Example:**

```bash
origin stop mujoco-policy-controller
  ✓ Stopped mujoco-policy-controller
```

---

### origin secrets set \<app-id\> \<key\> \<value\>

Set a secret for an app. Secrets are persisted in storage and injected as environment variables when the app is launched.

```
origin secrets set <app-id> <key> <value>
```

**Example:**

```bash
origin secrets set remote-teleop OPENAI_API_KEY sk-abc123...
  ✓ Secret OPENAI_API_KEY set for remote-teleop
```

---

### origin secrets list \<app-id\>

Show the status of all secrets defined in an app's manifest.

```
origin secrets list <app-id>
```

**Example output:**

```
  Secrets for remote-teleop:
    ✓ OPENAI_API_KEY                    required   OpenAI API key for language commands
    ✗ CUSTOM_MODEL_URL                  optional   URL to a custom model endpoint
```

- **✓** indicates the secret has a value configured
- **✗** indicates the secret is missing

---

### origin status

Display full system status: server info, connected devices, and running apps.

```
origin status [--json]
```

**Flags:**

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

**Example output:**

```
  origin v0.2.0

  core server  -> http://localhost:5050
  dashboard    -> http://localhost:5051

  devices
    ● unitree-go2       quadruped   37 state keys    4 actions
    ● toy-car           wheeled     3 state keys     4 actions

  apps
    mujoco-policy-controller              ▶ running -> http://localhost:3001
                                          device: unitree-go2 | uptime: 12m
    1 installed (not running)
```

**Status indicators:**

| Symbol | Meaning |
|--------|---------|
| `●` | Device connected |
| `○` | Device offline |
| `▶` | App running |

---

### origin discover

Trigger a device discovery scan across all configured ports (serial, bluetooth, TCP). Sends a `discover` message to each transport and reports which devices responded.

```
origin discover
```

**Example output:**

```
  Discovering devices...

  ✓ toy-car (v1.0.0) -- 4 actions, 3 state keys

  ✗ /dev/ttyUSB1: Timeout waiting for announce
```

If no ports are configured:

```
  No ports configured. Add --serial, --bluetooth, or --tcp to 'origin up'.
```

---

### origin profiles

List device profiles. Profiles describe a device's type, capabilities, and state group layout.

```
origin profiles [--json]
```

**Example output:**

```
  DEVICE ID           TYPE          DISPLAY NAME            GROUPS
  unitree-go2         quadruped     Unitree Go2             Body, Velocity, Gravity, Front-Left Leg, ...
  unitree-g1          humanoid      Unitree G1              Body, Left Leg, Right Leg, Torso, Left Arm, ...
  toy-car             wheeled       Origin Toy Car          Sensors
```

---

### origin profiles show \<device-id\>

Show the full profile for a device, including capabilities, state groups, and action aliases.

```
origin profiles show <device-id> [--json]
```

**Example output:**

```
  Device: unitree-go2
  Type: quadruped
  Display Name: Unitree Go2
  Description: 12-DOF quadruped with hip/thigh/calf joints per leg

  Capabilities:
    Position Control: ✓
    Torque Control: ✓
    Locomotion: ✓
    Manipulation: ✗

  State Groups:
    Body: base_pos_x, base_pos_y, base_pos_z, base_quat_w, ...
    Velocity: base_linvel_x, base_linvel_y, base_linvel_z, ...
    Front-Left Leg: FL_hip_joint_pos, FL_thigh_joint_pos, FL_calf_joint_pos, ...
    Front-Right Leg: FR_hip_joint_pos, FR_thigh_joint_pos, FR_calf_joint_pos, ...
    Rear-Left Leg: RL_hip_joint_pos, RL_thigh_joint_pos, RL_calf_joint_pos, ...
    Rear-Right Leg: RR_hip_joint_pos, RR_thigh_joint_pos, RR_calf_joint_pos, ...
```

---

### origin help

Print the full command summary.

```
origin help
origin --help
origin -h
```

---

## Configuration File

Create a `config.ts` (or `config.js`) in the directory where you run `origin up`. The server loads this file automatically at startup.

```typescript
import { defineConfig } from "originrobot-server"
import { SqliteStorageAdapter } from "originrobot-server/storage-sqlite"

export default defineConfig({
  port: 5050,
  dashboardPort: 5052,
  tcp: 5051,
  baudRate: 9600,
  storage: new SqliteStorageAdapter("./data/origin.db"),
  appsDir: "./apps",
})
```

**Configuration options:**

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `port` | `number` | `5050` | Core server port |
| `dashboardPort` | `number` | `5051` | Dashboard port |
| `serial` | `string \| string[]` | | Serial port path(s) |
| `bluetooth` | `string \| string[]` | | Bluetooth port path(s) |
| `tcp` | `number \| number[]` | | TCP listener port(s) for simulators |
| `baudRate` | `number` | `9600` | Baud rate for serial/bluetooth |
| `token` | `string` | | Bearer token for API authentication |
| `webhooks` | `WebhookRegistration[]` | | Webhook URLs to notify on events |
| `storage` | `StorageAdapter` | In-memory | Storage backend (use `SqliteStorageAdapter` for persistence) |
| `appsDir` | `string` | `"./apps"` | Directory where apps are installed |

Command-line flags always take precedence over values in the config file.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ORIGIN_URL` | Base URL of the Origin core server. Used by CLI commands and by apps at launch time. Defaults to `http://localhost:5050`. |

---

## Dashboard

When you run `origin up`, the dashboard starts automatically at **http://localhost:5051** (unless `--no-dashboard` is passed).

### Pages

**Home** -- Overview of connected devices, running apps, and system health at a glance.

**Devices** -- Browse connected devices. Select a device to see its manifest, live state readings, available actions, and profile configuration.

**Apps** -- Gallery of installed apps. From here you can:
- Install new apps (via URL or local path)
- View app details and compatibility with connected devices
- Configure secrets
- Launch and stop apps
- View live app logs

**Simulators** -- Launch and manage MuJoCo robot simulators. Each simulator connects to the server over TCP and appears as a standard device.

---

## Simulators

Origin supports MuJoCo-based robot simulators that connect to the server over TCP. A simulator appears as a regular device, allowing you to develop and test apps without physical hardware.

### From the Dashboard

1. Navigate to the **Simulators** page at `/simulators`
2. Select a model from the available list (e.g., Unitree Go2, Unitree G1)
3. Click **Launch** to start the simulator
4. The simulator connects via TCP and registers as a device
5. Click **Stop** to shut it down

### From the API

Launch a simulator:

```bash
curl -X POST http://localhost:5050/api/simulators/launch \
  -H "Content-Type: application/json" \
  -d '{"model": "unitree-go2", "headless": false, "hz": 50}'
```

Stop a simulator:

```bash
curl -X POST http://localhost:5050/api/simulators/<device-id>/stop
```

List available models and running simulators:

```bash
curl http://localhost:5050/api/simulators
```

### TCP Connection

When using `origin up`, pass the `--tcp` flag to open a TCP listener port. Simulators connect to this port and communicate using the same JSON wire protocol as hardware devices.

```bash
origin up --tcp 5051
```

---

## REST API Reference

The Origin server exposes a REST API at the core server port (default `5050`). All endpoints accept and return JSON. If authentication is enabled (via `--token` or `config.token`), include a `Authorization: Bearer <token>` header.

### Server

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Server info: name, version, uptime, device count |
| `GET` | `/api/status` | Full system status: server URLs, devices, running apps, running simulators |
| `POST` | `/discover` | Trigger device discovery across all transports |
| `GET` | `/ports` | List configured port statuses |
| `GET` | `/events` | Global SSE stream for all device events |

### Devices

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/devices` | List all connected devices (summary) |
| `GET` | `/devices/:id` | Device detail: manifest, state, timestamps |
| `GET` | `/devices/:id/state` | Current state readings |
| `POST` | `/devices/:id/actions` | Send an action to a device |
| `GET` | `/devices/:id/events` | SSE stream for a single device |

**Send an action:**

```bash
curl -X POST http://localhost:5050/devices/toy-car/actions \
  -H "Content-Type: application/json" \
  -d '{"name": "moveFwd", "params": {"speed": 100}}'
```

### Apps

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/apps` | List installed apps with running status and secret status |
| `POST` | `/api/apps/install` | Install an app from a source URL or path |
| `POST` | `/api/apps/scan` | Rescan the apps directory for new manifests |
| `GET` | `/api/apps/:id` | App detail: manifest, compatibility matrix, secrets, running status |
| `POST` | `/api/apps/:id/launch` | Launch an app on a device |
| `POST` | `/api/apps/:id/stop` | Stop a running app |
| `GET` | `/api/apps/:id/logs` | Fetch app logs (query: `?lines=200`) |
| `POST` | `/api/apps/:id/secrets` | Set secrets for an app |
| `DELETE` | `/api/apps/:id` | Uninstall an app |

**Install an app:**

```bash
curl -X POST http://localhost:5050/api/apps/install \
  -H "Content-Type: application/json" \
  -d '{"source": "https://github.com/user/app", "name": "my-app"}'
```

**Launch an app:**

```bash
curl -X POST http://localhost:5050/api/apps/my-app/launch \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "toy-car", "mode": "dev"}'
```

### Profiles

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/profiles` | List all device profiles (builtin + stored + auto-generated) |
| `GET` | `/api/profiles/:deviceId` | Get a device profile |
| `PUT` | `/api/profiles/:deviceId` | Save or update a device profile |
| `DELETE` | `/api/profiles/:deviceId` | Delete a stored profile (reverts to builtin or auto-generated) |

### Simulators

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/simulators` | List available models and running simulators |
| `POST` | `/api/simulators/launch` | Launch a simulator |
| `POST` | `/api/simulators/:deviceId/stop` | Stop a running simulator |
| `GET` | `/api/simulators/:deviceId/logs` | Fetch simulator logs (query: `?lines=200`) |

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/webhooks` | List registered webhooks |
| `POST` | `/webhooks` | Register a new webhook |
| `DELETE` | `/webhooks/:id` | Remove a webhook |

**Register a webhook:**

```bash
curl -X POST http://localhost:5050/webhooks \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/hook", "events": ["state.updated", "device.connected"]}'
```

### SSE Event Types

The SSE endpoints (`/events` and `/devices/:id/events`) emit the following event types:

| Event | Description |
|-------|-------------|
| `state.updated` | Device state readings changed |
| `action.sent` | An action was dispatched to a device |
| `device.connected` | A device announced itself |
| `device.disconnected` | A device transport closed |

---

## App Manifest (origin-app.json)

Every Origin app must include an `origin-app.json` file at its root. This manifest describes the app's metadata, device requirements, runtime configuration, and optional backend.

```json
{
  "name": "My Robot App",
  "id": "my-robot-app",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "A brief description of what this app does",
  "icon": "/icon.png",
  "device": {
    "type": "quadruped",
    "requiredActions": ["set_position"],
    "requiredState": ["base_pos_x", "base_pos_y"],
    "optionalActions": ["set_velocity"],
    "optionalState": ["base_linvel_x"]
  },
  "runtime": {
    "type": "next",
    "entry": ".",
    "setupCmd": "pnpm install",
    "buildCmd": "pnpm build",
    "devCmd": "pnpm dev",
    "startCmd": "pnpm start",
    "port": 3001,
    "env": {
      "NEXT_PUBLIC_ORIGIN_URL": "{{origin.url}}",
      "NEXT_PUBLIC_DEVICE_ID": "{{device.id}}"
    },
    "healthCheck": "/"
  },
  "backend": {
    "type": "python",
    "entry": "server.py",
    "setupCmd": "pip install -r requirements.txt",
    "installCmd": "pip install -e .",
    "args": ["--device-id", "{{device.id}}", "--origin-url", "{{origin.url}}"],
    "port": 8000,
    "env": {
      "ORIGIN_URL": "{{origin.url}}",
      "DEVICE_ID": "{{device.id}}"
    },
    "healthCheck": "/health"
  },
  "secrets": [
    {
      "key": "OPENAI_API_KEY",
      "description": "OpenAI API key for language commands",
      "required": true
    }
  ]
}
```

**Device types:** `wheeled`, `quadruped`, `humanoid`, `arm`, `generic`

**Template variables** available in `env`, `args`, and other string fields:

| Variable | Resolved to |
|----------|-------------|
| `{{origin.url}}` | Core server URL (e.g., `http://localhost:5050`) |
| `{{device.id}}` | Target device ID passed at launch |
| `{{backend.port}}` | Backend port from the manifest |
| `{{app.port}}` | Frontend runtime port from the manifest |

---

## Troubleshooting

### "Origin server is not running"

The CLI could not connect to the server at `http://localhost:5050` (or `ORIGIN_URL`).

**Fix:** Start the server first:

```bash
origin up
```

If you are running the server on a non-default port, set the environment variable:

```bash
ORIGIN_URL=http://localhost:8080 origin status
```

### Port conflicts

If port 5050 or 5051 is already in use, you will see an `EADDRINUSE` error.

**Fix:** Use the `--port` and `--dashboard-port` flags, or set them in your `config.ts`:

```bash
origin up --port 6060 --dashboard-port 6061
```

### Missing secrets

If `origin launch` fails with "Missing required secrets", the app requires environment variables that have not been configured.

**Fix:** Check which secrets are missing and set them:

```bash
origin secrets list my-app
origin secrets set my-app OPENAI_API_KEY sk-abc123...
```

### Incompatible device

If an app launch fails with a compatibility error, the target device does not provide the actions or state keys required by the app manifest.

**Fix:** Check what the app requires vs. what the device provides:

```bash
origin devices info <device-id>
origin apps --json
```

Compare the device's actions and state keys against the `requiredActions` and `requiredState` arrays in the app's `origin-app.json`.

### Device not discovered

If `origin discover` finds no devices, ensure that:

1. The device is physically connected and powered on
2. You passed the correct port path to `origin up` (e.g., `--serial /dev/ttyUSB0`)
3. The baud rate matches the device firmware (default: 9600, override with `--baud`)
4. You have permission to access the serial port (on Linux, your user may need to be in the `dialout` group)

### Dashboard not starting

If the dashboard shows "not found" in the startup output, the dashboard build files are not present.

**Fix:** Navigate to the `server/dashboard` directory and install dependencies:

```bash
cd server/dashboard
pnpm install
```

Then restart Origin with `origin up`.

### App health check timeout

If an app launch fails with "Health check timeout" or "Port did not become available", the app's frontend or backend process is not starting correctly.

**Fix:** Check the app logs for errors:

```bash
curl http://localhost:5050/api/apps/<app-id>/logs
```

Common causes include missing dependencies (run the app's setup command manually), incorrect `entry` paths in the manifest, or port conflicts with another process.
