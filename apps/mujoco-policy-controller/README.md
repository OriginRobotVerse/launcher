# MuJoCo Policy Controller

A web app for controlling simulated robots through Origin. Select from different control policies, see live state, and send manual actions.

## Setup

Three processes run in parallel:

### 1. Origin server (with TCP transport)

```bash
cd server
pnpm run dev -- --tcp 5051
```

### 2. MuJoCo simulator

```bash
pip install mujoco robot_descriptions
python -m simulators.mujoco --model unitree_go2 --server localhost:5051
```

### 3. Policy controller

**Backend** (Python):
```bash
cd apps/mujoco-policy-controller/backend
pip install -r requirements.txt
python main.py --origin http://localhost:3000 --device unitree-go2
```

**Frontend** (React):
```bash
pnpm --filter @aorigin/mujoco-policy-controller dev
```

Open http://localhost:5173. The frontend proxies `/api` to the Python backend on port 8000.

## Policies

| Policy | Description |
|--------|-------------|
| Stand | Hold neutral position (all controls zeroed) |
| Sine Wave | Smooth oscillation across all actuators |
| Trot | Diagonal trot gait for quadrupeds |
| Crouch | Smooth transition to crouched pose |
| Wave | Raise and wave one front leg |
| Bounce | Rhythmic vertical bouncing |

Click **Run** to start a policy. Click **Stop** to halt. Use the state filter to find specific joints or sensors.

## Architecture

```
React frontend (Vite, :5173)
    ↓ /api proxy
Python backend (FastAPI, :8000)
    ↓ HTTP
Origin server (:3000)
    ↓ TCP
MuJoCo simulator (:5051)
```

The backend runs the active policy in a loop: read state from Origin, compute controls, send actions back. The frontend polls the backend for status and lets you switch policies.
