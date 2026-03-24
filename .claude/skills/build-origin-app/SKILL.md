---
name: build-origin-app
description: This skill should be used when the user asks to "build an origin app", "create a robot app", "make an origin-app.json", "scaffold an origin app", or wants to create a new application for the Origin robotics platform. Guides through manifest creation, frontend/backend setup, device compatibility, and testing with simulators.
argument-hint: [app-name]
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent
---

# Build an Origin Robot App

Origin apps are directories with an `origin-app.json` manifest that Origin can install, configure, and launch to control robots. This skill walks through creating one from scratch.

## Manifest Quick Reference

Create `origin-app.json` at the app root. The JSON schema is at `schemas/origin-app.schema.json`.

### Required Fields

```json
{
  "$schema": "https://originrobot.dev/schemas/origin-app.json",
  "name": "My Robot App",
  "id": "my-robot-app",
  "version": "0.1.0",
  "device": {
    "type": "quadruped"
  },
  "runtime": {
    "type": "nextjs",
    "entry": ".",
    "port": 3000
  }
}
```

### Device Types

| Type | Examples |
|------|---------|
| `wheeled` | Arduino car, differential drive |
| `quadruped` | Unitree Go2, ANYmal C |
| `humanoid` | Unitree G1, H1 |
| `arm` | Shadow Hand, robot arms |
| `generic` | Any device (no type filtering) |

### Template Variables

Use these in `runtime.env`, `backend.env`, and `backend.args`:

| Variable | Resolved To |
|----------|-------------|
| `{{origin.url}}` | `http://localhost:5050` |
| `{{device.id}}` | Target device ID |
| `{{backend.port}}` | Backend port from manifest |
| `{{app.port}}` | Frontend port from manifest |

### Setup Commands

Origin runs these during `origin install` in order:

1. `setup` (top-level) — shared dependencies, e.g. `"pnpm install"`
2. `runtime.setupCmd` — frontend-specific setup
3. `backend.setupCmd` — backend environment setup
4. `backend.installCmd` — backend dependency install
5. `runtime.buildCmd` — production build

### Secrets

Declare API keys the app needs. Users configure them before launch:

```json
"secrets": [
  { "key": "OPENROUTER_API_KEY", "description": "LLM API key", "required": true }
]
```

Secrets are injected as environment variables at launch time.

## App Structure

### Frontend-Only App

```
my-app/
├── origin-app.json
├── package.json
├── app/
│   ├── layout.tsx
│   └── page.tsx
└── components/
```

### Full App with Backend

```
my-app/
├── origin-app.json
├── package.json
├── app/
│   └── page.tsx
├── components/
└── backend/
    ├── main.py
    └── requirements.txt
```

## Communicating with Devices

The frontend talks to the Origin server at `NEXT_PUBLIC_ORIGIN_URL`:

```typescript
const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN_URL ?? "http://localhost:5050";

// Read device state
const state = await fetch(`${ORIGIN}/devices/${deviceId}/state`).then(r => r.json());

// Send an action
await fetch(`${ORIGIN}/devices/${deviceId}/actions`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "set_pos", params: { ctrl_0: 0.5 } }),
});

// SSE for live state
const es = new EventSource(`${ORIGIN}/devices/${deviceId}/events`);
es.addEventListener("state.updated", (e) => {
  const data = JSON.parse(e.data);
  // data.data.state = { key: value, ... }
});
```

## Device Compatibility

Define what the device must support:

```json
"device": {
  "type": "quadruped",
  "requiredActions": ["set_pos", "reset"],
  "requiredState": ["base_pos_z"],
  "optionalActions": ["pause", "set_ctrl"]
}
```

Origin blocks launch if required actions/state are missing. The dashboard shows a compatibility matrix per device.

## Testing Workflow

```bash
# Terminal 1: Start Origin
cd server && origin up --no-dashboard

# Terminal 2: Launch a simulator (if needed)
# Via API: curl -X POST localhost:5050/api/simulators/launch -d '{"model":"unitree_go2","headless":true}'

# Terminal 3: Install and run your app
origin install ./my-app
origin secrets set my-app SOME_KEY value
origin launch my-app --device unitree-go2
```

## Detailed References

- **`references/manifest-schema.md`** — Complete field-by-field manifest documentation
- **`references/api-endpoints.md`** — All Origin server REST API endpoints

## Scaffolding Steps

When creating a new app from $ARGUMENTS:

1. Create the directory structure (Next.js app with Tailwind)
2. Generate `origin-app.json` based on the target device type
3. Create a minimal `page.tsx` that connects to Origin and displays device state
4. If a backend is needed, scaffold a Python FastAPI server
5. Add the `setup` field for dependency installation
6. Test with `origin install` and `origin launch`
