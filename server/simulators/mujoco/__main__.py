"""
Entry point for the MuJoCo Origin simulator.

Usage:
  python -m simulators.mujoco --model path/to/robot.xml --server localhost:5051
  python -m simulators.mujoco --model unitree_go2 --server localhost:5051

If --model is a bare name (no path separators), resolution order:
  1. robot_descriptions package (pip install robot_descriptions)
  2. Local mujoco_menagerie clone (git clone the repo, pass --menagerie-path)
"""

import argparse
import os
import sys

from .origin_bridge import OriginBridge
from .sim_runner import SimRunner

# robot_descriptions name mapping: model arg → robot_descriptions key
_ROBOT_DESCRIPTIONS_MAP: dict[str, str] = {
    "unitree_go2": "go2_mj_description",
    "unitree_g1": "g1_mj_description",
    "unitree_h1": "h1_mj_description",
    "anymal_c": "anymal_c_mj_description",
    "shadow_hand": "shadow_hand_mj_description",
}


def resolve_model_path(model: str, menagerie_path: str | None = None) -> str:
    """Resolve a model name or path to an MJCF file path."""
    # Direct path — absolute or relative to cwd
    if os.path.exists(model):
        return os.path.abspath(model)

    # Try robot_descriptions package (auto-downloads menagerie models)
    rd_key = _ROBOT_DESCRIPTIONS_MAP.get(model)
    if rd_key:
        try:
            import importlib
            desc_module = importlib.import_module(f"robot_descriptions.{rd_key}")
            if hasattr(desc_module, "MJCF_PATH"):
                robot_xml = desc_module.MJCF_PATH
                # Prefer scene.xml (includes ground plane + lighting) over bare robot xml
                scene_xml = os.path.join(os.path.dirname(robot_xml), "scene.xml")
                path = scene_xml if os.path.exists(scene_xml) else robot_xml
                if os.path.exists(path):
                    return path
        except ImportError:
            pass

    # Try local menagerie clone
    search_dirs: list[str] = []
    if menagerie_path:
        search_dirs.append(menagerie_path)
    # Also check common locations relative to this project
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    search_dirs.append(os.path.join(project_root, "mujoco_menagerie"))

    for base_dir in search_dirs:
        if not os.path.isdir(base_dir):
            continue
        for filename in ["scene.xml", f"{model}.xml"]:
            candidate = os.path.join(base_dir, model, filename)
            if os.path.exists(candidate):
                return candidate

    # Nothing worked
    print(f"Error: Could not find model '{model}'")
    print()
    print("To get robot models, either:")
    print("  pip install robot_descriptions          # auto-downloads models")
    print("  git clone https://github.com/google-deepmind/mujoco_menagerie.git")
    print("    then pass --menagerie-path ./mujoco_menagerie")
    print()
    print("Or pass a direct path to an MJCF file:")
    print("  --model ./path/to/robot/scene.xml")
    sys.exit(1)


def parse_server_addr(addr: str) -> tuple[str, int]:
    """Parse 'host:port' string."""
    parts = addr.rsplit(":", 1)
    host = parts[0] if len(parts) == 2 else "localhost"
    port = int(parts[-1])
    return host, port


def derive_device_id(model_path: str) -> str:
    """Derive a device ID from the model path.

    e.g. /path/to/unitree_go2/scene.xml → unitree-go2
    """
    # Use the parent directory name if the file is scene.xml or similar
    dirname = os.path.basename(os.path.dirname(model_path))
    if dirname:
        return dirname.replace("_", "-")
    # Fall back to filename without extension
    basename = os.path.splitext(os.path.basename(model_path))[0]
    return basename.replace("_", "-")


def main():
    parser = argparse.ArgumentParser(
        description="MuJoCo simulator for Origin",
        prog="python -m simulators.mujoco",
    )
    parser.add_argument(
        "--model", "-m", required=True,
        help="Path to MJCF file or model name (e.g. unitree_go2)",
    )
    parser.add_argument(
        "--server", "-s", default="localhost:5051",
        help="Origin server TCP address (default: localhost:5051)",
    )
    parser.add_argument(
        "--device-id", "-d", default=None,
        help="Device ID (default: derived from model name)",
    )
    parser.add_argument(
        "--menagerie-path", default=None,
        help="Path to local mujoco_menagerie clone",
    )
    parser.add_argument(
        "--hz", type=float, default=30.0,
        help="Readings send rate in Hz (default: 30)",
    )
    parser.add_argument(
        "--headless", action="store_true",
        help="Run without viewer (physics + protocol only)",
    )

    args = parser.parse_args()

    model_path = resolve_model_path(args.model, args.menagerie_path)
    host, port = parse_server_addr(args.server)
    device_id = args.device_id or derive_device_id(model_path)

    print(f"[mujoco] Model: {model_path}")
    print(f"[mujoco] Server: {host}:{port}")
    print(f"[mujoco] Device ID: {device_id}")
    print(f"[mujoco] Readings rate: {args.hz} Hz")

    bridge = OriginBridge(host, port)
    runner = SimRunner(model_path, bridge, device_id, readings_hz=args.hz, headless=args.headless)
    runner.start()


if __name__ == "__main__":
    main()
