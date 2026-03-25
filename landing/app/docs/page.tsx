"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function OriginLogo({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
      <line x1="12" y1="1" x2="12" y2="9" stroke="#F59E0B" strokeWidth="1.5" />
      <line x1="12" y1="15" x2="12" y2="23" stroke="#F59E0B" strokeWidth="1.5" />
      <line x1="1" y1="12" x2="9" y2="12" stroke="#F59E0B" strokeWidth="1.5" />
      <line x1="15" y1="12" x2="23" y2="12" stroke="#F59E0B" strokeWidth="1.5" />
      <rect x="10.5" y="10.5" width="3" height="3" fill="#F59E0B" />
    </svg>
  );
}

const sections = [
  { id: "cli", label: "CLI" },
  { id: "commands", label: "Commands" },
  { id: "manifest", label: "Manifest" },
  { id: "marketplace", label: "Marketplace" },
  { id: "api", label: "API" },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("cli");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { threshold: 0.2, rootMargin: "-80px 0px -60% 0px" }
    );

    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* NAV */}
      <nav className="docs-nav">
        <Link href="/" className="docs-nav-brand">
          <OriginLogo />
          <span className="docs-nav-name">origin</span>
          <span className="docs-nav-separator">/</span>
          <span className="docs-nav-section">docs</span>
        </Link>
        <div className="docs-nav-links">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={activeSection === s.id ? "active" : ""}
            >
              {s.label}
            </a>
          ))}
          <a
            href="https://github.com/OriginRobotVerse/launcher"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </nav>

      <div className="docs-layout">
        {/* SIDEBAR */}
        <aside className="docs-sidebar">
          <div className="docs-sidebar-group">
            <div className="docs-sidebar-heading">Getting Started</div>
            <a href="#cli" className={activeSection === "cli" ? "active" : ""}>Installation</a>
            <a href="#cli-quickstart" className={activeSection === "cli" ? "active" : ""}>Quick Start</a>
          </div>
          <div className="docs-sidebar-group">
            <div className="docs-sidebar-heading">CLI Reference</div>
            <a href="#commands">Commands</a>
            <a href="#cmd-up">origin up</a>
            <a href="#cmd-install">origin install</a>
            <a href="#cmd-launch">origin launch</a>
            <a href="#cmd-devices">origin devices</a>
            <a href="#cmd-secrets">origin secrets</a>
            <a href="#cmd-status">origin status</a>
          </div>
          <div className="docs-sidebar-group">
            <div className="docs-sidebar-heading">App Platform</div>
            <a href="#manifest">App Manifest</a>
            <a href="#manifest-device">Device Requirements</a>
            <a href="#manifest-runtime">Runtime Config</a>
            <a href="#manifest-backend">Backend Config</a>
            <a href="#manifest-secrets">Secrets</a>
            <a href="#manifest-templates">Template Variables</a>
          </div>
          <div className="docs-sidebar-group">
            <div className="docs-sidebar-heading">Marketplace</div>
            <a href="#marketplace">Overview</a>
            <a href="#marketplace-install">Installing Apps</a>
            <a href="#marketplace-publish">Publishing Apps</a>
            <a href="#marketplace-request">Requesting Apps</a>
          </div>
          <div className="docs-sidebar-group">
            <div className="docs-sidebar-heading">REST API</div>
            <a href="#api">Endpoints</a>
            <a href="#api-devices">Devices</a>
            <a href="#api-apps">Apps</a>
            <a href="#api-simulators">Simulators</a>
            <a href="#api-sse">SSE Events</a>
          </div>
        </aside>

        {/* CONTENT */}
        <main className="docs-content">

          {/* ======== CLI ======== */}
          <section id="cli">
            <div className="docs-section-label">01 — Getting Started</div>
            <h1>Origin CLI</h1>
            <p className="docs-lead">
              Origin is an open-source platform for controlling robots and hardware devices.
              The <code>origin</code> CLI provides commands to start the server, connect hardware,
              install apps, and launch control interfaces.
            </p>

            <h2>Installation</h2>
            <div className="docs-code">
              <div className="docs-code-header">
                <div className="docs-code-dot" />
                <span>terminal</span>
              </div>
              <pre>{`npm install -g originrobot`}</pre>
            </div>
            <p>Or run directly with npx:</p>
            <div className="docs-code">
              <div className="docs-code-header">
                <div className="docs-code-dot" />
                <span>terminal</span>
              </div>
              <pre>{`npx originrobot up`}</pre>
            </div>
            <p>
              This installs the <code>origin</code> CLI globally. You can then run{" "}
              <code>origin up</code> to start the server.
            </p>

            <h2 id="cli-quickstart">Quick Start</h2>
            <div className="docs-code">
              <div className="docs-code-header">
                <div className="docs-code-dot" />
                <span>terminal</span>
              </div>
              <pre>{`# Start the server and dashboard
origin up

# Install a robotics app from GitHub
origin install https://github.com/user/my-robot-app

# Launch the app on a connected device
origin launch my-robot-app -d toy-car`}</pre>
            </div>
            <p>
              Once the server is running, open <code>http://localhost:5050</code> to access
              the dashboard.
            </p>
          </section>

          {/* ======== COMMANDS ======== */}
          <section id="commands">
            <div className="docs-section-label">02 — CLI Reference</div>
            <h1>Commands</h1>

            <div className="docs-command" id="cmd-up">
              <h2>origin up</h2>
              <p>Start the Origin server and dashboard.</p>
              <div className="docs-code">
                <div className="docs-code-header">
                  <div className="docs-code-dot" />
                  <span>usage</span>
                </div>
                <pre>{`origin up [options]`}</pre>
              </div>

              <table className="docs-table">
                <thead>
                  <tr><th>Flag</th><th>Default</th><th>Description</th></tr>
                </thead>
                <tbody>
                  <tr><td><code>--port &lt;number&gt;</code></td><td>5050</td><td>Server port (serves API and dashboard)</td></tr>
                  <tr><td><code>--serial &lt;path&gt;</code></td><td>—</td><td>Serial port path (repeatable)</td></tr>
                  <tr><td><code>--bluetooth &lt;path&gt;</code></td><td>—</td><td>Bluetooth port path (repeatable)</td></tr>
                  <tr><td><code>--tcp &lt;port&gt;</code></td><td>—</td><td>TCP listener port for simulators</td></tr>
                  <tr><td><code>--baud &lt;number&gt;</code></td><td>9600</td><td>Baud rate for serial/bluetooth</td></tr>
                  <tr><td><code>--token &lt;string&gt;</code></td><td>—</td><td>Bearer token for API auth</td></tr>
                  <tr><td><code>--no-dashboard</code></td><td>—</td><td>Skip starting the dashboard</td></tr>
                  <tr><td><code>--open</code></td><td>—</td><td>Auto-open dashboard in browser</td></tr>
                </tbody>
              </table>

              <div className="docs-code">
                <div className="docs-code-header">
                  <div className="docs-code-dot" />
                  <span>examples</span>
                </div>
                <pre>{`# Start with a serial device
origin up --serial /dev/ttyUSB0

# Start with TCP for simulators, no dashboard
origin up --tcp 5051 --no-dashboard

# Custom port with authentication
origin up --port 8080 --token my-secret`}</pre>
              </div>
            </div>

            <div className="docs-command" id="cmd-install">
              <h2>origin install</h2>
              <p>Install a robotics app into Origin.</p>
              <div className="docs-code">
                <div className="docs-code-header">
                  <div className="docs-code-dot" />
                  <span>usage</span>
                </div>
                <pre>{`origin install <source> [--name <override-id>]`}</pre>
              </div>
              <p>
                <strong>Source types:</strong> GitHub URL (cloned via git), local path (symlinked),
                or tarball URL (downloaded and extracted).
              </p>
              <p>
                The install process validates the <code>origin-app.json</code> manifest,
                runs any setup commands defined in the manifest, and registers the app.
              </p>
              <div className="docs-code">
                <div className="docs-code-header">
                  <div className="docs-code-dot" />
                  <span>examples</span>
                </div>
                <pre>{`# Install from GitHub
origin install https://github.com/user/robot-teleop

# Install from a local directory (symlink)
origin install ./my-local-app

# Install with a custom ID
origin install https://github.com/user/app --name my-custom-id`}</pre>
              </div>
            </div>

            <div className="docs-command" id="cmd-launch">
              <h2>origin launch</h2>
              <p>Launch an installed app on a connected device.</p>
              <div className="docs-code">
                <div className="docs-code-header">
                  <div className="docs-code-dot" />
                  <span>usage</span>
                </div>
                <pre>{`origin launch <app-id> --device <device-id> [--mode dev|prod] [--open]`}</pre>
              </div>
              <p>
                Launch verifies secrets are configured, resolves template variables,
                starts backend (if configured), waits for health checks, then starts the frontend.
              </p>
              <div className="docs-code">
                <div className="docs-code-header">
                  <div className="docs-code-dot" />
                  <span>example</span>
                </div>
                <pre>{`origin launch mujoco-policy-controller -d unitree-go2 --open
  Launching mujoco-policy-controller on device unitree-go2 (dev)...
  ✓ mujoco-policy-controller is running
    frontend -> http://localhost:3001
    backend  -> http://localhost:8000`}</pre>
              </div>
            </div>

            <div className="docs-command" id="cmd-devices">
              <h2>origin devices</h2>
              <p>List all connected devices, or inspect a specific device.</p>
              <div className="docs-code">
                <div className="docs-code-header">
                  <div className="docs-code-dot" />
                  <span>usage</span>
                </div>
                <pre>{`origin devices [--json]
origin devices info <device-id> [--json]`}</pre>
              </div>
              <div className="docs-code">
                <div className="docs-code-header">
                  <div className="docs-code-dot" />
                  <span>output</span>
                </div>
                <pre>{`  ID                TYPE        ACTIONS                              STATE KEYS
  unitree-go2       quadruped   set_position, set_velocity, stand    37
  toy-car           wheeled     moveFwd, moveLeft, moveRight, stop   3`}</pre>
              </div>
            </div>

            <div className="docs-command" id="cmd-secrets">
              <h2>origin secrets</h2>
              <p>Manage app secrets. Secrets are injected as environment variables at launch time.</p>
              <div className="docs-code">
                <div className="docs-code-header">
                  <div className="docs-code-dot" />
                  <span>usage</span>
                </div>
                <pre>{`origin secrets set <app-id> <key> <value>
origin secrets list <app-id>`}</pre>
              </div>
              <div className="docs-code">
                <div className="docs-code-header">
                  <div className="docs-code-dot" />
                  <span>example</span>
                </div>
                <pre>{`origin secrets set remote-teleop OPENAI_API_KEY sk-abc123...
  ✓ Secret OPENAI_API_KEY set for remote-teleop

origin secrets list remote-teleop
  ✓ OPENAI_API_KEY        required   OpenAI API key for language commands
  ✗ CUSTOM_MODEL_URL      optional   URL to a custom model endpoint`}</pre>
              </div>
            </div>

            <div className="docs-command" id="cmd-status">
              <h2>origin status</h2>
              <p>Display full system status: server info, connected devices, and running apps.</p>
              <div className="docs-code">
                <div className="docs-code-header">
                  <div className="docs-code-dot" />
                  <span>usage</span>
                </div>
                <pre>{`origin status [--json]`}</pre>
              </div>
              <p>
                Also available: <code>origin stop &lt;app-id&gt;</code>,{" "}
                <code>origin uninstall &lt;app-id&gt;</code>,{" "}
                <code>origin discover</code>,{" "}
                <code>origin profiles</code>.
              </p>
            </div>
          </section>

          {/* ======== MANIFEST ======== */}
          <section id="manifest">
            <div className="docs-section-label">03 — App Platform</div>
            <h1>App Manifest</h1>
            <p className="docs-lead">
              Every Origin app contains an <code>origin-app.json</code> manifest at its root.
              This file declares the app&apos;s identity, device requirements, runtime configuration,
              and secrets.
            </p>

            <div className="docs-code docs-code-wide">
              <div className="docs-code-header">
                <div className="docs-code-dot" />
                <span>origin-app.json</span>
              </div>
              <pre>{`{
  "name": "My Robot Controller",
  "id": "my-controller",
  "version": "0.1.0",
  "author": "yourname",
  "description": "AI-powered robot controller",

  "device": {
    "type": "quadruped",
    "requiredActions": ["set_pos", "reset"],
    "requiredState": ["base_pos_z"]
  },

  "runtime": {
    "type": "nextjs",
    "port": 3001,
    "devCmd": "pnpm dev",
    "env": {
      "NEXT_PUBLIC_ORIGIN_URL": "{{origin.url}}",
      "NEXT_PUBLIC_DEVICE_ID": "{{device.id}}"
    }
  },

  "backend": {
    "type": "python",
    "entry": "backend/main.py",
    "port": 8000,
    "healthCheck": "/api/status"
  },

  "secrets": [{
    "key": "OPENROUTER_API_KEY",
    "description": "API key for LLM inference",
    "required": true
  }]
}`}</pre>
            </div>

            <h2 id="manifest-device">Device Requirements</h2>
            <p>
              The <code>device</code> object declares what hardware capabilities your app needs.
              Origin checks these against connected devices before allowing launch.
            </p>
            <table className="docs-table">
              <thead>
                <tr><th>Field</th><th>Type</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td><code>type</code></td><td>string</td><td><code>wheeled</code>, <code>quadruped</code>, <code>humanoid</code>, <code>arm</code>, or <code>generic</code></td></tr>
                <tr><td><code>requiredActions</code></td><td>string[]</td><td>Actions the device must support. Launch blocked if missing.</td></tr>
                <tr><td><code>requiredState</code></td><td>string[]</td><td>State keys the device must report. Launch blocked if missing.</td></tr>
                <tr><td><code>optionalActions</code></td><td>string[]</td><td>Actions used if available. Missing ones produce warnings.</td></tr>
                <tr><td><code>optionalState</code></td><td>string[]</td><td>State keys used if available. Missing ones produce warnings.</td></tr>
              </tbody>
            </table>

            <h2 id="manifest-runtime">Runtime Config</h2>
            <p>
              The <code>runtime</code> object configures the frontend process Origin spawns at launch.
            </p>
            <table className="docs-table">
              <thead>
                <tr><th>Field</th><th>Type</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td><code>type</code></td><td>string</td><td>Runtime type: <code>nextjs</code>, <code>vite</code>, <code>static</code></td></tr>
                <tr><td><code>port</code></td><td>number</td><td>Port the frontend listens on</td></tr>
                <tr><td><code>devCmd</code></td><td>string</td><td>Dev mode start command (e.g. <code>pnpm dev</code>)</td></tr>
                <tr><td><code>startCmd</code></td><td>string</td><td>Production start command</td></tr>
                <tr><td><code>setupCmd</code></td><td>string</td><td>Dependency install command</td></tr>
                <tr><td><code>buildCmd</code></td><td>string</td><td>Build command for production</td></tr>
                <tr><td><code>env</code></td><td>object</td><td>Environment variables (supports template variables)</td></tr>
                <tr><td><code>healthCheck</code></td><td>string</td><td>HTTP path to poll after startup</td></tr>
              </tbody>
            </table>

            <h2 id="manifest-backend">Backend Config</h2>
            <p>
              The optional <code>backend</code> object configures a secondary process (e.g. Python FastAPI)
              spawned before the frontend.
            </p>
            <table className="docs-table">
              <thead>
                <tr><th>Field</th><th>Type</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td><code>type</code></td><td>string</td><td><code>python</code> (uses python3) or <code>node</code></td></tr>
                <tr><td><code>entry</code></td><td>string</td><td>Entry point file (e.g. <code>backend/main.py</code>)</td></tr>
                <tr><td><code>port</code></td><td>number</td><td>Port the backend listens on</td></tr>
                <tr><td><code>args</code></td><td>string[]</td><td>CLI arguments (supports template variables)</td></tr>
                <tr><td><code>installCmd</code></td><td>string</td><td>Dependency install command</td></tr>
                <tr><td><code>healthCheck</code></td><td>string</td><td>HTTP path Origin polls before starting frontend</td></tr>
              </tbody>
            </table>

            <h2 id="manifest-secrets">Secrets</h2>
            <p>
              Declare API keys or credentials your app needs. Users configure these via the CLI
              or dashboard before launching. Secrets are injected as environment variables at runtime.
            </p>
            <div className="docs-code">
              <div className="docs-code-header">
                <div className="docs-code-dot" />
                <span>manifest excerpt</span>
              </div>
              <pre>{`"secrets": [
  {
    "key": "OPENROUTER_API_KEY",
    "description": "OpenRouter API key for LLM inference",
    "required": true
  }
]`}</pre>
            </div>

            <h2 id="manifest-templates">Template Variables</h2>
            <p>
              Origin resolves these placeholders at launch time in <code>env</code>,{" "}
              <code>args</code>, and other string fields:
            </p>
            <table className="docs-table">
              <thead>
                <tr><th>Variable</th><th>Resolved To</th></tr>
              </thead>
              <tbody>
                <tr><td><code>{"{{origin.url}}"}</code></td><td>Core server URL (e.g. <code>http://localhost:5050</code>)</td></tr>
                <tr><td><code>{"{{device.id}}"}</code></td><td>Target device ID passed at launch</td></tr>
                <tr><td><code>{"{{backend.port}}"}</code></td><td>Backend port from the manifest</td></tr>
                <tr><td><code>{"{{app.port}}"}</code></td><td>Frontend runtime port</td></tr>
              </tbody>
            </table>
          </section>

          {/* ======== MARKETPLACE ======== */}
          <section id="marketplace">
            <div className="docs-section-label">04 — Marketplace</div>
            <h1>Origin Marketplace</h1>
            <p className="docs-lead">
              The{" "}
              <a href="https://origin-appstore.vercel.app/" target="_blank" rel="noopener noreferrer">
                Origin Marketplace
              </a>{" "}
              is a community hub for discovering, installing, and sharing robot control apps.
              Browse ready-made apps for supported devices, or publish your own for others to use.
            </p>

            <div className="docs-callout">
              <div className="docs-callout-dot" />
              <div>
                <strong>Visit the Marketplace</strong>
                <p>
                  <a href="https://origin-appstore.vercel.app/" target="_blank" rel="noopener noreferrer">
                    origin-appstore.vercel.app
                  </a>
                </p>
              </div>
            </div>

            <h2 id="marketplace-install">Installing Apps from the Marketplace</h2>
            <p>
              Each app on the marketplace has a GitHub repository URL. Copy it and install
              with one command:
            </p>
            <div className="docs-code">
              <div className="docs-code-header">
                <div className="docs-code-dot" />
                <span>terminal</span>
              </div>
              <pre>{`# Install from a marketplace app's GitHub URL
origin install https://github.com/OriginRobotVerse/mujoco-policy-controller

# Or install from the dashboard
# Navigate to Apps > Install App and paste the URL`}</pre>
            </div>
            <p>
              Origin clones the repository, reads the manifest, runs setup commands, and
              registers the app. You can then configure secrets and launch it against any
              compatible device.
            </p>

            <h3>From the Dashboard</h3>
            <p>
              The dashboard&apos;s Apps section has an <strong>Install App</strong> button and a
              banner linking to the marketplace. Paste a GitHub URL into the source field
              and click Install. The dashboard shows installation progress and lets you
              view the app once complete.
            </p>

            <h2 id="marketplace-publish">Publishing to the Marketplace</h2>
            <p>
              Any Origin app with a public GitHub repository can be listed on the marketplace.
              To prepare your app for publishing:
            </p>

            <div className="docs-steps">
              <div className="docs-step">
                <div className="docs-step-num">01</div>
                <div>
                  <strong>Add <code>origin-app.json</code> at the repo root</strong>
                  <p>
                    Include all required fields: <code>name</code>, <code>id</code>,{" "}
                    <code>version</code>, <code>device</code>, and <code>runtime</code>.
                    Add <code>author</code>, <code>description</code>, and <code>icon</code> for
                    the marketplace listing.
                  </p>
                </div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">02</div>
                <div>
                  <strong>Declare all setup commands in the manifest</strong>
                  <p>
                    Use <code>setup</code>, <code>runtime.setupCmd</code>,{" "}
                    <code>runtime.buildCmd</code>, and <code>backend.installCmd</code> so that{" "}
                    <code>origin install</code> handles everything automatically.
                  </p>
                </div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">03</div>
                <div>
                  <strong>Document required secrets</strong>
                  <p>
                    Add entries to the <code>secrets</code> array with clear descriptions so
                    users know what API keys or credentials they need.
                  </p>
                </div>
              </div>
              <div className="docs-step">
                <div className="docs-step-num">04</div>
                <div>
                  <strong>Submit to the marketplace</strong>
                  <p>
                    Visit the{" "}
                    <a href="https://origin-appstore.vercel.app/" target="_blank" rel="noopener noreferrer">
                      Origin Marketplace
                    </a>{" "}
                    and submit your repository URL. Your app will be reviewed and listed
                    for the community.
                  </p>
                </div>
              </div>
            </div>

            <h2 id="marketplace-request">Requesting New Apps</h2>
            <p>
              Don&apos;t see an app for your use case? The marketplace accepts community requests.
              Visit the{" "}
              <a href="https://origin-appstore.vercel.app/" target="_blank" rel="noopener noreferrer">
                marketplace
              </a>{" "}
              to submit a request describing:
            </p>
            <ul className="docs-list">
              <li>The device type you&apos;re targeting (e.g. Unitree Go2, Arduino)</li>
              <li>What the app should do (e.g. teleoperation, gait training, data logging)</li>
              <li>Any specific requirements (backend inference, specific sensors, etc.)</li>
            </ul>
            <p>
              The community and Origin team review requests and may build apps to fill gaps
              in the ecosystem.
            </p>

            <h3>App Categories</h3>
            <div className="docs-grid-cards">
              <div className="docs-grid-card">
                <div className="docs-grid-card-title">Controllers</div>
                <div className="docs-grid-card-text">
                  Joystick, keyboard, and touch-based interfaces for direct robot control.
                </div>
              </div>
              <div className="docs-grid-card">
                <div className="docs-grid-card-title">AI / Policy</div>
                <div className="docs-grid-card-text">
                  Apps that run inference models to autonomously control robots.
                </div>
              </div>
              <div className="docs-grid-card">
                <div className="docs-grid-card-title">Monitoring</div>
                <div className="docs-grid-card-text">
                  Real-time dashboards for viewing device state, sensor data, and logs.
                </div>
              </div>
              <div className="docs-grid-card">
                <div className="docs-grid-card-title">Simulation</div>
                <div className="docs-grid-card-text">
                  Apps designed for MuJoCo simulation environments and virtual testing.
                </div>
              </div>
            </div>
          </section>

          {/* ======== API ======== */}
          <section id="api">
            <div className="docs-section-label">05 — REST API</div>
            <h1>API Reference</h1>
            <p className="docs-lead">
              The Origin server exposes a REST API on port 5050 (default). All endpoints
              accept and return JSON. If authentication is enabled, include an{" "}
              <code>Authorization: Bearer &lt;token&gt;</code> header.
            </p>

            <h2 id="api-devices">Devices</h2>
            <table className="docs-table">
              <thead>
                <tr><th>Method</th><th>Path</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td><code>GET</code></td><td><code>/devices</code></td><td>List all connected devices</td></tr>
                <tr><td><code>GET</code></td><td><code>/devices/:id</code></td><td>Device detail: manifest, state, timestamps</td></tr>
                <tr><td><code>GET</code></td><td><code>/devices/:id/state</code></td><td>Current state readings</td></tr>
                <tr><td><code>POST</code></td><td><code>/devices/:id/actions</code></td><td>Send an action to a device</td></tr>
                <tr><td><code>GET</code></td><td><code>/devices/:id/events</code></td><td>SSE stream for a single device</td></tr>
              </tbody>
            </table>

            <div className="docs-code">
              <div className="docs-code-header">
                <div className="docs-code-dot" />
                <span>send an action</span>
              </div>
              <pre>{`curl -X POST http://localhost:5050/devices/toy-car/actions \\
  -H "Content-Type: application/json" \\
  -d '{"name": "moveFwd", "params": {"speed": 100}}'`}</pre>
            </div>

            <h2 id="api-apps">Apps</h2>
            <table className="docs-table">
              <thead>
                <tr><th>Method</th><th>Path</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td><code>GET</code></td><td><code>/api/apps</code></td><td>List installed apps</td></tr>
                <tr><td><code>POST</code></td><td><code>/api/apps/install</code></td><td>Install an app</td></tr>
                <tr><td><code>GET</code></td><td><code>/api/apps/:id</code></td><td>App detail with compatibility matrix</td></tr>
                <tr><td><code>POST</code></td><td><code>/api/apps/:id/launch</code></td><td>Launch an app on a device</td></tr>
                <tr><td><code>POST</code></td><td><code>/api/apps/:id/stop</code></td><td>Stop a running app</td></tr>
                <tr><td><code>GET</code></td><td><code>/api/apps/:id/logs</code></td><td>Fetch app logs</td></tr>
                <tr><td><code>POST</code></td><td><code>/api/apps/:id/secrets</code></td><td>Set secrets for an app</td></tr>
                <tr><td><code>DELETE</code></td><td><code>/api/apps/:id</code></td><td>Uninstall an app</td></tr>
              </tbody>
            </table>

            <h2 id="api-simulators">Simulators</h2>
            <table className="docs-table">
              <thead>
                <tr><th>Method</th><th>Path</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td><code>POST</code></td><td><code>/api/simulators/launch</code></td><td>Launch a simulator</td></tr>
                <tr><td><code>POST</code></td><td><code>/api/simulators/:id/stop</code></td><td>Stop a running simulator</td></tr>
                <tr><td><code>GET</code></td><td><code>/api/simulators</code></td><td>List available models and running sims</td></tr>
                <tr><td><code>GET</code></td><td><code>/api/simulators/:id/logs</code></td><td>Fetch simulator logs</td></tr>
              </tbody>
            </table>

            <h2 id="api-sse">SSE Events</h2>
            <p>
              Subscribe to real-time events via <code>/events</code> (global) or{" "}
              <code>/devices/:id/events</code> (per-device).
            </p>
            <table className="docs-table">
              <thead>
                <tr><th>Event</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td><code>state.updated</code></td><td>Device state readings changed</td></tr>
                <tr><td><code>action.sent</code></td><td>An action was dispatched to a device</td></tr>
                <tr><td><code>device.connected</code></td><td>A device announced itself</td></tr>
                <tr><td><code>device.disconnected</code></td><td>A device transport closed</td></tr>
              </tbody>
            </table>

            <div className="docs-code">
              <div className="docs-code-header">
                <div className="docs-code-dot" />
                <span>subscribe to events</span>
              </div>
              <pre>{`const es = new EventSource("http://localhost:5050/devices/toy-car/events");

es.addEventListener("state.updated", (e) => {
  const data = JSON.parse(e.data);
  console.log("State:", data.data);
});`}</pre>
            </div>
          </section>

          {/* FOOTER */}
          <div className="docs-footer">
            <div className="docs-footer-links">
              <Link href="/">Home</Link>
              <a href="https://origin-appstore.vercel.app/" target="_blank" rel="noopener noreferrer">Marketplace</a>
              <a href="https://github.com/OriginRobotVerse/launcher" target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>
            <div className="docs-footer-tagline">Origin — Control anything.</div>
          </div>
        </main>
      </div>
    </>
  );
}
