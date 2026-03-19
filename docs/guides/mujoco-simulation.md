# MuJoCo Simulation (v0.2)

Origin can control simulated robots through MuJoCo. The simulator connects to the server over TCP and speaks the same wire protocol as physical hardware — clients never know they're talking to a simulation.

---

## Architecture

```
Your App (TS/Python)          Origin Server              MuJoCo Process
                                                         (Python)
  client.sendAction() ------> POST /devices/:id/actions
                                  |
                               {"type":"action"} -----> sim applies ctrl[]
                                                        mj_step()
                               {"type":"readings"} <--- sim extracts state
                                  |
  client.getDeviceState() <-- GET /devices/:id/state
  client.subscribe()   <----- SSE /events
```

The MuJoCo process replaces the Arduino. It:
1. Loads an MJCF model (any robot from MuJoCo Menagerie or your own)
2. Connects to the Origin server via TCP
3. Sends an `announce` message with a manifest built from the model's actuators, sensors, and joints
4. Runs the physics loop, streaming `readings` and accepting `actions`
5. Opens the MuJoCo viewer for visual feedback

---

## Setup

### Prerequisites

```bash
pip install mujoco robot_descriptions
```

`mujoco` is the physics engine. `robot_descriptions` auto-downloads MJCF models from [MuJoCo Menagerie](https://github.com/google-deepmind/mujoco_menagerie) (Unitree Go2, G1, etc.).

Alternatively, clone the menagerie repo directly:

```bash
git clone https://github.com/google-deepmind/mujoco_menagerie.git
pip install mujoco
```

### Start the server with TCP

```bash
cd server
pnpm run dev -- --tcp 5051
```

The `--tcp 5051` flag opens a TCP listener on port 5051. Simulators connect here. You can combine it with serial/BT:

```bash
pnpm run dev -- --tcp 5051 --bluetooth /dev/tty.HC-05
```

Or use a config file:

```ts
import { defineConfig } from "origin-server";

export default defineConfig({
  tcp: [5051],
  port: 3000,
});
```

### Start the simulator

```bash
# From the project root — uses robot_descriptions to auto-download the model
python -m simulators.mujoco --model unitree_go2 --server localhost:5051

# Or point to a local menagerie clone
python -m simulators.mujoco --model unitree_go2 --menagerie-path ./mujoco_menagerie --server localhost:5051

# Or pass a direct MJCF path
python -m simulators.mujoco --model ./path/to/robot/scene.xml --server localhost:5051
```

This will:
- Load the Unitree Go2 MJCF (with ground plane and lighting)
- Connect to the Origin server on port 5051
- Send an announce with the robot's full manifest
- Open the MuJoCo viewer window
- Begin streaming readings at 30 Hz

#### CLI options

```
python -m simulators.mujoco [options]

  --model, -m <path|name>      MJCF file path or model name (required)
  --server, -s <host:port>     Origin server TCP address (default: localhost:5051)
  --device-id, -d <id>         Device ID (default: derived from model name)
  --menagerie-path <path>      Path to local mujoco_menagerie clone
  --hz <number>                Readings rate in Hz (default: 30)
```

Model resolution order for bare names (e.g. `unitree_go2`):
1. `robot_descriptions` package (auto-downloads, prefers `scene.xml`)
2. Local menagerie clone (via `--menagerie-path` or `./mujoco_menagerie/`)
3. Direct file path

---

## How It Works

### Protocol Mapping

The simulator translates MuJoCo concepts into Origin's wire protocol:

| MuJoCo Concept | Origin Concept | Example |
|----------------|----------------|---------|
| `model.actuator_*` | Actions | `set_ctrl`, per-actuator names |
| `model.sensor_*` | Sensors + state schema | `accelerometer_0`, `gyro_1` |
| `model.jnt_*` | State schema entries | `left_hip_pos`, `left_hip_vel` |
| MJCF model name | Device ID | `unitree-go2` |
| `mj_resetData` | `reset` action | Resets sim to initial state |
| Step loop toggle | `pause` action | Pauses/resumes physics |

### Announce manifest

At startup, the simulator parses the MuJoCo model and builds an announce message:

```json
{
  "type": "announce",
  "id": "unitree-go2",
  "version": "mujoco-sim/0.1",
  "sensors": [
    {"name": "accelerometer", "pins": []},
    {"name": "gyro", "pins": []}
  ],
  "chips": [{"name": "mujoco", "pins": []}],
  "actions": ["set_ctrl", "reset", "pause", "FR_hip", "FR_thigh", "FR_calf", ...],
  "state": [
    {"key": "accelerometer_0", "type": "float"},
    {"key": "accelerometer_1", "type": "float"},
    {"key": "FR_hip_pos", "type": "float"},
    {"key": "FR_hip_vel", "type": "float"},
    ...
  ]
}
```

### Sending actions

Actions work the same way as physical devices:

```bash
# Set multiple actuator controls at once
curl -X POST http://localhost:3000/devices/unitree-go2/actions \
  -H "Content-Type: application/json" \
  -d '{"name": "set_ctrl", "params": {"ctrl_0": 1.5, "ctrl_3": -0.8}}'

# Set a named actuator
curl -X POST http://localhost:3000/devices/unitree-go2/actions \
  -H "Content-Type: application/json" \
  -d '{"name": "FR_hip", "params": {"value": 0.5}}'

# Reset simulation
curl -X POST http://localhost:3000/devices/unitree-go2/actions \
  -H "Content-Type: application/json" \
  -d '{"name": "reset"}'

# Pause/resume
curl -X POST http://localhost:3000/devices/unitree-go2/actions \
  -H "Content-Type: application/json" \
  -d '{"name": "pause"}'
```

Using the Python client:

```python
from origin_client import OriginClient

client = OriginClient("http://localhost:3000")

# Read joint states
state = client.get_device_state("unitree-go2")
print(state["FR_hip_pos"])  # joint position
print(state["FR_hip_vel"])  # joint velocity

# Send control
client.send_action("unitree-go2", "set_ctrl", {"ctrl_0": 0.5, "ctrl_1": -0.3})

# Reset
client.send_action("unitree-go2", "reset")
```

---

## Internals

### Sim loop threading

The MuJoCo process uses three threads:

| Thread | Role |
|--------|------|
| Main | MuJoCo viewer (required by the rendering API) |
| Sim | Physics loop — `mj_step` at simulation Hz, sends readings at configured Hz |
| Recv | TCP receive loop — parses incoming JSON, queues actions |

The sim thread drains the action queue before each `mj_step`, applies controls to `data.ctrl[]`, steps physics, extracts state, and (at the configured rate) sends a readings message.

### Rate limiting

The sim might step at 500-2000 Hz depending on the model's timestep, but readings are rate-limited to the configured Hz (default 30). A frame counter skips sends between intervals. This matches what a real device would produce.

### Control flow

```
action arrives via TCP
  → queued in OriginBridge._action_queue
  → sim thread calls bridge.get_pending_actions()
  → "set_ctrl" → writes to data.ctrl[idx]
  → "reset"   → mj_resetData(model, data)
  → "pause"   → toggles step loop
  → named actuator → resolves to ctrl index, writes value
```

---

## Custom Models

You can use any MJCF model, not just menagerie robots:

```bash
python -m simulators.mujoco --model ./my_robot/robot.xml --server localhost:5051
```

The device ID defaults to the parent directory name (`my-robot`). Override with `--device-id`:

```bash
python -m simulators.mujoco --model ./my_robot/robot.xml --device-id custom-bot
```

### Model requirements

Any valid MJCF model works. The manifest builder extracts whatever the model defines:

- **Actuators** → controllable actions (motors, tendons, etc.)
- **Sensors** → readable state (accelerometers, gyros, touch, etc.)
- **Joints** → position and velocity state entries

Models with no sensors still work — joint positions and velocities are always included in the state.

---

## File Structure

```
simulators/mujoco/
  __main__.py           CLI entry point
  origin_bridge.py      TCP client (connect, announce, readings, actions)
  sim_runner.py         Physics loop + viewer
  manifest_builder.py   MJCF model → Origin manifest
```

```
server/src/
  transport-tcp.ts      TCP transport (accepts simulator connections)
  device-manager.ts     Updated with addTcpListener()
  index.ts              --tcp CLI flag
```
