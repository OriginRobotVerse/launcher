# Developing Origin Apps

## Overview

An Origin app is a directory containing an `origin-app.json` manifest file. Origin uses this manifest to install, configure, and launch the app to control robots.

Apps are typically built with a Next.js frontend that communicates with the Origin server over HTTP and Server-Sent Events (SSE). They can optionally include a backend process (Python, Node, etc.) for tasks like running inference, processing sensor data, or coordinating multi-step control policies.

The Origin CLI and dashboard handle the full lifecycle: installing dependencies, resolving secrets, checking device compatibility, spawning processes, and monitoring health.

## App Structure

A minimal Origin app looks like this:

```
my-app/
├── origin-app.json        # manifest (required)
├── package.json           # frontend dependencies
├── app/                   # Next.js pages
│   ├── layout.tsx
│   └── page.tsx
├── public/
│   └── icon.png           # app icon shown in dashboard
└── backend/               # optional backend process
    ├── main.py
    └── requirements.txt
```

The only required file is `origin-app.json`. Everything else depends on your runtime type and whether you need a backend.

## The Manifest (origin-app.json)

The manifest declares your app's identity, device requirements, runtime configuration, and secrets. Add the `$schema` field at the top to get autocomplete and validation in your editor:

```json
{
  "$schema": "https://originrobot.dev/schemas/origin-app.json",
  "name": "My Robot App",
  "id": "my-robot-app",
  "version": "0.1.0"
}
```

### Identity Fields

| Field         | Type   | Required | Description                                                  |
| ------------- | ------ | -------- | ------------------------------------------------------------ |
| `name`        | string | yes      | Human-readable name displayed in the dashboard and CLI.      |
| `id`          | string | yes      | Unique identifier in kebab-case (e.g. `my-robot-app`). Used in CLI commands and API routes. Must match `^[a-z0-9][a-z0-9-]*$`. |
| `version`     | string | yes      | Semantic version (e.g. `0.1.0`).                             |
| `author`      | string | no       | Author name or handle.                                       |
| `description` | string | no       | Short description of what the app does.                      |
| `icon`        | string | no       | Relative path to an icon image (e.g. `icon.png`).            |

### Top-Level Setup

| Field   | Type   | Required | Description                                                                 |
| ------- | ------ | -------- | --------------------------------------------------------------------------- |
| `setup` | string | no       | Shell command run during `origin install` before runtime and backend setup. Use for shared dependencies (e.g. `pnpm install`). |

### Device Requirements

The `device` object declares what hardware capabilities your app needs. Origin checks these before allowing launch.

```json
{
  "device": {
    "type": "quadruped",
    "requiredActions": ["set_pos", "reset"],
    "requiredState": ["base_pos_z"],
    "optionalActions": ["pause", "set_ctrl"],
    "optionalState": ["base_angvel_x", "base_angvel_y", "base_angvel_z"],
    "minActuators": 12,
    "maxActuators": 12
  }
}
```

| Field              | Type           | Required | Description                                                                                     |
| ------------------ | -------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `type`             | string         | yes      | One of `wheeled`, `quadruped`, `humanoid`, `arm`, or `generic`. Use `generic` to support any device type. |
| `requiredActions`  | string[]       | no       | Actions the device must support. Launch is blocked if any are missing.                          |
| `requiredState`    | string[]       | no       | State keys the device must report. Launch is blocked if any are missing.                        |
| `optionalActions`  | string[]       | no       | Actions the app can use if available. Missing ones produce warnings, not errors.                |
| `optionalState`    | string[]       | no       | State keys the app can use if available. Missing ones produce warnings, not errors.             |
| `minActuators`     | integer\|null  | no       | Minimum number of actuators required.                                                           |
| `maxActuators`     | integer\|null  | no       | Maximum number of actuators supported.                                                          |

### Runtime (Frontend)

The `runtime` object configures the frontend process that Origin spawns when the app is launched.

```json
{
  "runtime": {
    "type": "nextjs",
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
    "healthCheck": "/api/health"
  }
}
```

| Field         | Type              | Required | Description                                                                                                |
| ------------- | ----------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `type`        | string            | yes      | Runtime type (e.g. `nextjs`, `vite`, `static`).                                                            |
| `entry`       | string            | yes      | Entry point directory relative to app root. Usually `"."`.                                                 |
| `setupCmd`    | string            | no       | Installs frontend dependencies during `origin install` (e.g. `pnpm install`).                              |
| `buildCmd`    | string            | no       | Builds for production during `origin install` (e.g. `pnpm build`).                                        |
| `devCmd`      | string            | no       | Starts the frontend in dev mode (e.g. `pnpm dev`). Used with `--mode dev` (the default).                  |
| `startCmd`    | string            | no       | Starts the frontend in production mode (e.g. `pnpm start`). Used with `--mode prod`.                      |
| `port`        | integer           | yes      | Port the frontend listens on.                                                                              |
| `env`         | object            | no       | Environment variables passed to the process. Values support template variables (see below).                |
| `healthCheck` | string            | no       | HTTP path to poll after startup (e.g. `/api/health`). Origin waits for a 200 response before marking the app as running. If omitted, Origin waits for the port to accept TCP connections. |

### Backend

The optional `backend` object configures a secondary process (e.g. a Python FastAPI server) that is spawned before the frontend.

```json
{
  "backend": {
    "type": "python",
    "entry": "backend/main.py",
    "setupCmd": "python -m venv .venv && .venv/bin/pip install -r requirements.txt",
    "installCmd": "pip install -r backend/requirements.txt",
    "args": ["--origin", "{{origin.url}}", "--device", "{{device.id}}", "--port", "{{backend.port}}"],
    "port": 8000,
    "env": {
      "ORIGIN_URL": "{{origin.url}}"
    },
    "healthCheck": "/api/status"
  }
}
```

| Field         | Type     | Required | Description                                                                                       |
| ------------- | -------- | -------- | ------------------------------------------------------------------------------------------------- |
| `type`        | string   | yes      | Backend runtime type. `python` uses `python3` as the interpreter; `node` uses `node`.             |
| `entry`       | string   | yes      | Entry point file relative to app root (e.g. `backend/main.py`).                                  |
| `setupCmd`    | string   | no       | Sets up the backend environment (e.g. creating a virtualenv). Run during `origin install`.        |
| `installCmd`  | string   | no       | Installs backend dependencies (e.g. `pip install -r backend/requirements.txt`). Run during `origin install`. |
| `args`        | string[] | no       | Arguments passed to the entry point. Values support template variables.                           |
| `port`        | integer  | yes      | Port the backend listens on.                                                                      |
| `env`         | object   | no       | Environment variables for the backend process. Values support template variables.                 |
| `healthCheck` | string   | no       | HTTP path to poll after startup (e.g. `/api/status`). Origin waits for a 200 before starting the frontend. |

### Secrets

The `secrets` array declares API keys or credentials the app needs. Users configure these via the CLI or the dashboard before launching.

```json
{
  "secrets": [
    {
      "key": "OPENROUTER_API_KEY",
      "description": "OpenRouter API key for LLM inference",
      "required": true
    },
    {
      "key": "CUSTOM_MODEL_ENDPOINT",
      "description": "URL for a custom model server",
      "required": false
    }
  ]
}
```

| Field         | Type    | Required | Description                                                      |
| ------------- | ------- | -------- | ---------------------------------------------------------------- |
| `key`         | string  | yes      | Environment variable name (e.g. `OPENROUTER_API_KEY`).           |
| `description` | string  | yes      | Human-readable description shown in the dashboard and CLI.       |
| `required`    | boolean | yes      | If `true`, the app cannot launch without this secret configured. |

### Template Variables

Several manifest fields support template variables that Origin resolves at launch time:

| Variable           | Resolves To                                             |
| ------------------ | ------------------------------------------------------- |
| `{{origin.url}}`   | The Origin server URL (e.g. `http://localhost:5050`).   |
| `{{device.id}}`    | The ID of the device the app is launched against.       |
| `{{backend.port}}` | The backend port from the manifest (e.g. `8000`).       |
| `{{app.port}}`     | The frontend port from the manifest (e.g. `3001`).      |

Template variables can be used in:
- `runtime.env` values
- `backend.env` values
- `backend.args` values

## Device Compatibility

Every connected device announces its capabilities: the actions it supports and the state keys it reports. When you launch an app, Origin compares the app's `device.requiredActions` and `device.requiredState` against the target device.

- If any required action or state key is missing, **launch is blocked** and the CLI or dashboard shows the missing items.
- If any optional action or state key is missing, a **warning** is shown but launch proceeds.
- The dashboard displays a compatibility matrix for all installed apps and connected devices, making it easy to see which apps work with which hardware.

Setting `device.type` to `generic` allows your app to target any device type, but you should still declare your required actions and state to ensure the device has the capabilities your app needs.

## Frontend Development

Your frontend communicates with the Origin server to read device state, send actions, and receive real-time updates. The server URL is injected as the `NEXT_PUBLIC_ORIGIN_URL` environment variable.

### Key API Endpoints

All device endpoints use the device ID in the path. The Origin server runs on port 5050 by default.

**Get device state:**

```
GET /devices/:deviceId/state
```

Returns the current state as a JSON object with numeric values:

```json
{
  "distance": 42.5,
  "speed": 1.2,
  "angle": 90.0,
  "base_pos_z": 0.35
}
```

**Send an action:**

```
POST /devices/:deviceId/actions
Content-Type: application/json

{
  "name": "set_pos",
  "params": { "x": 1.0, "y": 0.0, "z": 0.35 }
}
```

Returns `{ "ok": true, "action": "set_pos" }` on success.

**Subscribe to real-time events (SSE):**

```
GET /devices/:deviceId/events
```

Opens a Server-Sent Events stream. Events are emitted when state updates, actions are sent, or the device connects/disconnects:

```
event: state.updated
data: {"deviceId":"mujoco-quadruped","data":{"base_pos_z":0.35},"timestamp":"2026-03-24T10:00:00Z"}

event: action.sent
data: {"deviceId":"mujoco-quadruped","data":{"name":"set_pos","params":{"x":1.0}},"timestamp":"2026-03-24T10:00:01Z"}
```

**Get full device detail:**

```
GET /devices/:deviceId
```

Returns the device manifest including all supported actions, state keys, sensors, and chips.

### TypeScript Client Example

```typescript
const ORIGIN_URL = process.env.NEXT_PUBLIC_ORIGIN_URL ?? "http://localhost:5050";
const DEVICE_ID = process.env.NEXT_PUBLIC_DEFAULT_DEVICE;

// Read current state
async function getState(): Promise<Record<string, number>> {
  const res = await fetch(`${ORIGIN_URL}/devices/${DEVICE_ID}/state`);
  if (!res.ok) throw new Error(`Failed to get state: ${res.statusText}`);
  return res.json();
}

// Send an action
async function sendAction(name: string, params?: Record<string, number>): Promise<void> {
  const res = await fetch(`${ORIGIN_URL}/devices/${DEVICE_ID}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, params }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Action failed: ${err.error}`);
  }
}

// Subscribe to real-time state updates
function subscribeToEvents(onEvent: (event: string, data: unknown) => void): EventSource {
  const es = new EventSource(`${ORIGIN_URL}/devices/${DEVICE_ID}/events`);

  es.addEventListener("state.updated", (e) => {
    onEvent("state.updated", JSON.parse(e.data));
  });

  es.addEventListener("action.sent", (e) => {
    onEvent("action.sent", JSON.parse(e.data));
  });

  es.addEventListener("device.disconnected", (e) => {
    onEvent("device.disconnected", JSON.parse(e.data));
  });

  es.onerror = () => {
    console.error("SSE connection lost, reconnecting...");
  };

  return es;
}
```

### React Hook Example

```typescript
import { useEffect, useState, useCallback } from "react";

const ORIGIN_URL = process.env.NEXT_PUBLIC_ORIGIN_URL ?? "http://localhost:5050";

export function useDeviceState(deviceId: string) {
  const [state, setState] = useState<Record<string, number>>({});

  useEffect(() => {
    // Initial fetch
    fetch(`${ORIGIN_URL}/devices/${deviceId}/state`)
      .then((res) => res.json())
      .then(setState)
      .catch(console.error);

    // SSE subscription
    const es = new EventSource(`${ORIGIN_URL}/devices/${deviceId}/events`);
    es.addEventListener("state.updated", (e) => {
      const payload = JSON.parse(e.data);
      setState((prev) => ({ ...prev, ...payload.data }));
    });

    return () => es.close();
  }, [deviceId]);

  const sendAction = useCallback(
    async (name: string, params?: Record<string, number>) => {
      await fetch(`${ORIGIN_URL}/devices/${deviceId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, params }),
      });
    },
    [deviceId],
  );

  return { state, sendAction };
}
```

## Backend Development

The backend is an optional process that Origin spawns before the frontend. It receives the Origin server URL, device ID, and its own port as template-resolved arguments or environment variables.

### Lifecycle

1. Origin resolves all template variables in `backend.args` and `backend.env`.
2. Origin spawns the backend process using the configured interpreter (`python3` for `type: "python"`, `node` for `type: "node"`).
3. If `backend.healthCheck` is set, Origin polls that HTTP endpoint every 500ms for up to 30 seconds. The frontend does not start until a 200 response is received.
4. Once the backend is healthy, the frontend is started.
5. When the app is stopped, both processes receive `SIGTERM` followed by `SIGKILL` after 5 seconds if they have not exited.

### Secrets as Environment Variables

All configured secrets are injected into both the backend and frontend process environments. If your manifest declares a secret with key `OPENROUTER_API_KEY`, the backend can read it from `os.environ["OPENROUTER_API_KEY"]`.

### Example: Python FastAPI Backend

```python
import argparse
import httpx
from fastapi import FastAPI
from contextlib import asynccontextmanager

parser = argparse.ArgumentParser()
parser.add_argument("--origin", required=True, help="Origin server URL")
parser.add_argument("--device", required=True, help="Device ID")
parser.add_argument("--port", type=int, default=8000, help="Port to listen on")
args = parser.parse_args()

app = FastAPI()

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient(base_url=args.origin)
    yield
    await app.state.http.aclose()

app = FastAPI(lifespan=lifespan)

@app.get("/api/status")
async def status():
    return {"status": "ready", "device": args.device}

@app.get("/api/device-state")
async def get_device_state():
    res = await app.state.http.get(f"/devices/{args.device}/state")
    return res.json()

@app.post("/api/send-action")
async def send_action(name: str, params: dict = {}):
    res = await app.state.http.post(
        f"/devices/{args.device}/actions",
        json={"name": name, "params": params},
    )
    return res.json()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=args.port)
```

The corresponding `backend/requirements.txt`:

```
fastapi>=0.104.0
uvicorn>=0.24.0
httpx>=0.25.0
```

## Secrets Management

Secrets are API keys, tokens, or credentials your app needs at runtime. They are declared in the manifest, configured by the user, stored securely by Origin, and injected as environment variables at launch time.

### Declaring Secrets

Add a `secrets` array to your manifest:

```json
{
  "secrets": [
    {
      "key": "OPENROUTER_API_KEY",
      "description": "OpenRouter API key for LLM inference",
      "required": true
    }
  ]
}
```

### Configuring Secrets

**Via the CLI:**

```bash
origin secrets set my-robot-app OPENROUTER_API_KEY sk-or-v1-abc123
```

**Check status:**

```bash
origin secrets list my-robot-app
```

This shows which secrets are configured and which are still missing.

**Via the dashboard:** The app detail page shows a secrets panel where users can enter values through the UI.

### How Secrets Are Injected

At launch time, Origin reads all configured secrets for the app and injects them into both the frontend and backend process environments. Your code accesses them as standard environment variables:

- **Node.js / Next.js:** `process.env.OPENROUTER_API_KEY`
- **Python:** `os.environ["OPENROUTER_API_KEY"]`

Secrets are never written to disk in your app directory. They are stored in Origin's internal database and only exist in process memory at runtime.

## Testing Locally

### 1. Start the Origin Server

```bash
origin up --no-dashboard
```

This starts the core server on port 5050. Add `--serial /dev/ttyUSB0` or `--tcp 5555` to connect to physical or simulated devices.

### 2. Install Your App

For a local app directory:

```bash
origin install ./my-app
```

This creates a symlink in Origin's apps directory, reads the manifest, and runs the setup/install/build commands. Your original directory is used for running the app, so code changes take effect immediately in dev mode.

### 3. Check Connected Devices

```bash
origin devices
```

Note the device ID you want to target.

### 4. Configure Secrets (if needed)

```bash
origin secrets set my-robot-app OPENROUTER_API_KEY sk-or-v1-abc123
```

### 5. Launch

```bash
origin launch my-robot-app --device mujoco-quadruped
```

By default this uses dev mode. For production mode:

```bash
origin launch my-robot-app --device mujoco-quadruped --mode prod
```

Add `--open` to automatically open the frontend in your browser.

### 6. View Logs

The CLI prints frontend and backend logs to stdout. You can also query logs via the API:

```
GET /api/apps/my-robot-app/logs?lines=100
```

### 7. Stop

```bash
origin stop my-robot-app
```

### Development Workflow Tips

- In dev mode, Next.js hot-reloads on file changes. You do not need to restart the app after editing frontend code.
- If you change `origin-app.json`, stop and relaunch the app for changes to take effect.
- If you add new dependencies, run `origin install ./my-app` again or install them manually.
- Use `origin status` to see the full system state: server info, connected devices, and running apps.

## Publishing

Origin apps can be shared as Git repositories. Users install them directly from a GitHub URL:

```bash
origin install https://github.com/user/my-robot-app
```

This clones the repository into Origin's apps directory, reads the manifest, and runs setup commands.

### Preparing Your App for Publishing

1. Ensure `origin-app.json` is at the repository root.
2. Include a `.gitignore` that excludes `node_modules/`, `.next/`, `.venv/`, and other build artifacts.
3. Declare all setup steps in the manifest (`setup`, `runtime.setupCmd`, `runtime.buildCmd`, `backend.installCmd`) so that `origin install` handles everything automatically.
4. Document any required secrets in the manifest's `secrets` array with clear descriptions.
5. Set the `$schema` field so other developers get editor validation when contributing to your app.

### Versioning

Use semantic versioning in the `version` field. Origin displays the version in the dashboard and CLI but does not currently enforce version constraints. Users update by pulling the latest changes from the Git repository.

## Example Manifests

### Simple Frontend-Only App (Wheeled Robot Controller)

A basic app that sends movement commands to a wheeled robot. No backend, no secrets.

```json
{
  "$schema": "https://originrobot.dev/schemas/origin-app.json",
  "name": "Wheeled Robot Controller",
  "id": "wheeled-controller",
  "version": "1.0.0",
  "author": "originrobot",
  "description": "Joystick-style controller for wheeled robots with directional movement",
  "icon": "icon.png",
  "setup": "pnpm install",
  "device": {
    "type": "wheeled",
    "requiredActions": ["moveFwd", "moveRight", "moveLeft", "stop"],
    "requiredState": ["distance", "speed", "angle"]
  },
  "runtime": {
    "type": "nextjs",
    "entry": ".",
    "devCmd": "pnpm dev",
    "startCmd": "pnpm start",
    "port": 3000,
    "env": {
      "NEXT_PUBLIC_ORIGIN_URL": "{{origin.url}}",
      "NEXT_PUBLIC_DEFAULT_DEVICE": "{{device.id}}"
    }
  }
}
```

### Full App with Python Backend (Quadruped Policy Controller)

An app that runs a Python inference server alongside a Next.js dashboard. The backend reads device state, runs a control policy, and sends position commands back to the robot.

```json
{
  "$schema": "https://originrobot.dev/schemas/origin-app.json",
  "name": "MuJoCo Policy Controller",
  "id": "mujoco-policy-controller",
  "version": "0.2.0",
  "author": "dterminal",
  "description": "AI-powered control policies for quadruped, humanoid, and dexterous robots in MuJoCo simulation",
  "icon": "icon.png",
  "device": {
    "type": "generic",
    "requiredActions": ["set_pos", "reset"],
    "requiredState": ["base_pos_z"],
    "optionalActions": ["pause", "set_ctrl"],
    "optionalState": ["base_angvel_x", "base_angvel_y", "base_angvel_z"]
  },
  "runtime": {
    "type": "nextjs",
    "entry": ".",
    "devCmd": "pnpm dev",
    "startCmd": "pnpm start",
    "port": 3001,
    "env": {
      "NEXT_PUBLIC_ORIGIN_URL": "{{origin.url}}",
      "NEXT_PUBLIC_BACKEND_URL": "http://localhost:{{backend.port}}"
    }
  },
  "backend": {
    "type": "python",
    "entry": "backend/main.py",
    "installCmd": "pip install -r backend/requirements.txt",
    "args": [
      "--origin", "{{origin.url}}",
      "--device", "{{device.id}}",
      "--port", "{{backend.port}}"
    ],
    "port": 8000,
    "env": {
      "NEXT_PUBLIC_BACKEND_URL": "http://localhost:{{backend.port}}"
    },
    "healthCheck": "/api/status"
  },
  "secrets": [
    {
      "key": "OPENROUTER_API_KEY",
      "description": "OpenRouter API key for LLM inference",
      "required": true
    }
  ]
}
```

### Generic App (Works with Any Device)

A monitoring dashboard that displays raw state and lets users send arbitrary actions. Works with any device connected to Origin.

```json
{
  "$schema": "https://originrobot.dev/schemas/origin-app.json",
  "name": "Device Monitor",
  "id": "device-monitor",
  "version": "0.1.0",
  "author": "originrobot",
  "description": "Real-time state viewer and action sender for any Origin device",
  "device": {
    "type": "generic"
  },
  "runtime": {
    "type": "nextjs",
    "entry": ".",
    "setupCmd": "pnpm install",
    "buildCmd": "pnpm build",
    "devCmd": "pnpm dev",
    "startCmd": "pnpm start",
    "port": 3002,
    "env": {
      "NEXT_PUBLIC_ORIGIN_URL": "{{origin.url}}",
      "NEXT_PUBLIC_DEVICE_ID": "{{device.id}}"
    },
    "healthCheck": "/api/health"
  }
}
```

This app has no `requiredActions` or `requiredState`, so it is compatible with every device. The frontend discovers available actions and state keys at runtime by calling `GET /devices/:deviceId`.
