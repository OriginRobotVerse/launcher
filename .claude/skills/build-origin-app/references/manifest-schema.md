# Origin App Manifest — Complete Schema Reference

The JSON schema lives at `schemas/origin-app.schema.json`. This document explains every field.

## Identity

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | string | No | Schema URL for editor validation. Use `"https://originrobot.dev/schemas/origin-app.json"` |
| `name` | string | Yes | Human-readable name shown in dashboard and CLI |
| `id` | string | Yes | Kebab-case unique identifier. Pattern: `^[a-z0-9][a-z0-9-]*$` |
| `version` | string | Yes | Semver string, e.g. `"0.1.0"` |
| `author` | string | No | Author name or handle |
| `description` | string | No | Short description of what the app does |
| `icon` | string | No | Relative path to icon image file |
| `setup` | string | No | Top-level setup command run during install, before runtime/backend setup |

## Device Requirements

The `device` object defines what hardware the app needs.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | enum | Yes | One of: `wheeled`, `quadruped`, `humanoid`, `arm`, `generic` |
| `requiredActions` | string[] | No | Actions the device must support. Launch blocked if missing. |
| `requiredState` | string[] | No | State keys the device must report. Launch blocked if missing. |
| `optionalActions` | string[] | No | Actions used if available. Missing = warning only. |
| `optionalState` | string[] | No | State keys used if available. |
| `minActuators` | int\|null | No | Minimum actuator count required |
| `maxActuators` | int\|null | No | Maximum actuator count supported |

### Common Actions by Device Type

**Quadruped** (Go2, ANYmal C): `set_pos`, `set_ctrl`, `reset`, `pause`, plus per-joint names
**Humanoid** (G1, H1): `set_pos`, `set_ctrl`, `reset`, `pause`, plus per-joint names
**Wheeled** (Arduino car): `moveFwd`, `moveLeft`, `moveRight`, `stop`
**Arm/Hand** (Shadow Hand): `set_pos`, `set_ctrl`, `reset`, `pause`, plus per-actuator names

### Common State Keys

**All MuJoCo robots**: `base_pos_x/y/z`, `base_quat_w/x/y/z`, `base_linvel_x/y/z`, `base_angvel_x/y/z`, `gravity_x/y/z`, `{joint_name}_pos`, `{joint_name}_vel`

**Arduino car**: `distance`, `speed`, `angle`

## Runtime (Frontend)

The `runtime` object defines the frontend process.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Runtime type: `"nextjs"`, `"vite"`, `"static"` |
| `entry` | string | Yes | Entry directory relative to app root (usually `"."`) |
| `setupCmd` | string | No | Install frontend dependencies (e.g. `"pnpm install"`) |
| `buildCmd` | string | No | Production build command (e.g. `"pnpm build"`) |
| `devCmd` | string | No | Dev mode command (e.g. `"pnpm dev"`). Used with `--mode dev` |
| `startCmd` | string | No | Production start (e.g. `"pnpm start"`). Used with `--mode prod` |
| `port` | integer | Yes | Port the frontend listens on (1-65535) |
| `env` | object | No | Environment variables. Supports template variables. |
| `healthCheck` | string | No | HTTP path to poll after startup (e.g. `"/api/health"`). If omitted, Origin waits for port. |

## Backend (Optional)

The `backend` object defines an optional backend process spawned before the frontend.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Runtime type: `"python"`, `"node"` |
| `entry` | string | Yes | Entry file relative to app root (e.g. `"backend/main.py"`) |
| `setupCmd` | string | No | Backend environment setup |
| `installCmd` | string | No | Dependency install (e.g. `"pip install -r backend/requirements.txt"`) |
| `args` | string[] | No | CLI arguments. Supports template variables. |
| `port` | integer | Yes | Port the backend listens on |
| `env` | object | No | Environment variables for backend. |
| `healthCheck` | string | No | HTTP path to poll (e.g. `"/api/status"`) |

## Secrets

Array of secrets the app needs. Users configure via `origin secrets set` or the dashboard.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string | Yes | Environment variable name (e.g. `"OPENROUTER_API_KEY"`) |
| `description` | string | Yes | Human-readable description |
| `required` | boolean | Yes | If `true`, app cannot launch without this secret |

## Launch Sequence

When `origin launch <app-id> --device <device-id>` runs:

1. Read manifest from installed app
2. Check device exists and is connected
3. Check compatibility (requiredActions/requiredState)
4. Check required secrets are configured
5. Resolve template variables
6. If `backend` defined: spawn backend, pipe logs, poll healthCheck (30s timeout)
7. Spawn frontend, pipe logs, poll healthCheck or wait for port (30s timeout)
8. Mark status = "running"

## Full Example (Frontend + Backend)

```json
{
  "$schema": "https://originrobot.dev/schemas/origin-app.json",
  "name": "MuJoCo Policy Controller",
  "id": "mujoco-policy-controller",
  "version": "0.2.0",
  "author": "dterminal",
  "description": "AI-powered control policies for robots in MuJoCo simulation",
  "setup": "pnpm install",
  "device": {
    "type": "generic",
    "requiredActions": ["set_pos", "reset"],
    "requiredState": ["base_pos_z"],
    "optionalActions": ["pause", "set_ctrl"]
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
    "args": ["--origin", "{{origin.url}}", "--device", "{{device.id}}", "--port", "{{backend.port}}"],
    "port": 8000,
    "healthCheck": "/api/status"
  },
  "secrets": [
    { "key": "OPENROUTER_API_KEY", "description": "LLM API key", "required": true }
  ]
}
```
