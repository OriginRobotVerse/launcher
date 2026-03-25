"use client";

import { useEffect, useState, FormEvent } from "react";

function OriginLogo({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" width={size} height={size}>
      <line x1="12" y1="1" x2="12" y2="9" stroke="#F59E0B" strokeWidth="1.5" />
      <line
        x1="12"
        y1="15"
        x2="12"
        y2="23"
        stroke="#F59E0B"
        strokeWidth="1.5"
      />
      <line x1="1" y1="12" x2="9" y2="12" stroke="#F59E0B" strokeWidth="1.5" />
      <line
        x1="15"
        y1="12"
        x2="23"
        y2="12"
        stroke="#F59E0B"
        strokeWidth="1.5"
      />
      <rect x="10.5" y="10.5" width="3" height="3" fill="#F59E0B" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <line
        x1="4"
        y1="12"
        x2="20"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="14"
        y1="6"
        x2="20"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="14"
        y1="18"
        x2="20"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

const tickerItems = [
  'npx originrobot up',
  'origin install github.com/user/app',
  'origin launch agent-ctrl --device toy-car',
  "origin devices",
  'origin status',
  "origin secrets set app KEY value",
  "GET /devices/:id/state",
  "POST /devices/:id/actions",
];

export default function LandingPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [waitlistMsg, setWaitlistMsg] = useState("");

  async function handleWaitlist(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setWaitlistStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setWaitlistStatus("success");
        setWaitlistMsg("You're on the list.");
        setEmail("");
      } else {
        setWaitlistStatus("error");
        setWaitlistMsg(data.error || "Something went wrong.");
      }
    } catch {
      setWaitlistStatus("error");
      setWaitlistMsg("Something went wrong.");
    }
  }

  useEffect(() => {
    const reveals = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="scanlines" />

      {/* NAV */}
      <nav>
        <div className="nav-brand">
          <OriginLogo />
          <span className="nav-name">origin</span>
        </div>
        <button
          className="nav-toggle"
          onClick={() => setNavOpen(!navOpen)}
          aria-label="Toggle navigation"
        >
          <span />
          <span />
          <span />
        </button>
        <div className={`nav-links${navOpen ? " open" : ""}`}>
          <a href="#what" onClick={() => setNavOpen(false)}>
            What
          </a>
          <a href="#devices" onClick={() => setNavOpen(false)}>
            Devices
          </a>
          <a href="#how" onClick={() => setNavOpen(false)}>
            How
          </a>
          <a href="#apps" onClick={() => setNavOpen(false)}>
            Apps
          </a>
          <a href="/docs" onClick={() => setNavOpen(false)}>
            Docs
          </a>
          <a
            href="https://github.com/OriginRobotVerse/launcher"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setNavOpen(false)}
          >
            GitHub
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" style={{ borderTop: "none" }}>
        <div className="hero-grid" />
        <div className="hero-axis-v" />
        <div className="hero-axis-h" />

        <div className="hero-bot">
          <div className="bot-float">
            <svg viewBox="0 0 160 180" fill="none" width="140" height="158">
              {/* Treads */}
              <rect x="20" y="140" width="32" height="18" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
              <rect x="108" y="140" width="32" height="18" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
              <line x1="28" y1="140" x2="28" y2="158" stroke="#4A4A4A" strokeWidth="0.75" />
              <line x1="36" y1="140" x2="36" y2="158" stroke="#4A4A4A" strokeWidth="0.75" />
              <line x1="44" y1="140" x2="44" y2="158" stroke="#4A4A4A" strokeWidth="0.75" />
              <line x1="116" y1="140" x2="116" y2="158" stroke="#4A4A4A" strokeWidth="0.75" />
              <line x1="124" y1="140" x2="124" y2="158" stroke="#4A4A4A" strokeWidth="0.75" />
              <line x1="132" y1="140" x2="132" y2="158" stroke="#4A4A4A" strokeWidth="0.75" />
              {/* Body */}
              <rect x="30" y="86" width="100" height="54" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
              <line x1="30" y1="106" x2="130" y2="106" stroke="#4A4A4A" strokeWidth="0.75" />
              <rect x="40" y="112" width="12" height="6" stroke="#4A4A4A" strokeWidth="0.75" fill="none" />
              <rect x="60" y="112" width="6" height="6" fill="#F59E0B" opacity="0.4" />
              {/* Neck */}
              <line x1="70" y1="86" x2="70" y2="68" stroke="#E8E8E8" strokeWidth="1.5" />
              <line x1="90" y1="86" x2="90" y2="68" stroke="#E8E8E8" strokeWidth="1.5" />
              {/* Head */}
              <rect x="54" y="40" width="52" height="30" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
              {/* Eye stalks & eyes */}
              <line x1="67" y1="40" x2="64" y2="26" stroke="#E8E8E8" strokeWidth="1.5" />
              <rect x="54" y="10" width="16" height="17" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
              <rect x="58" y="12" width="8" height="5" fill="#F59E0B" className="eye-glow" />
              <line x1="93" y1="40" x2="96" y2="26" stroke="#E8E8E8" strokeWidth="1.5" />
              <rect x="90" y="10" width="16" height="17" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
              <rect x="94" y="12" width="8" height="5" fill="#F59E0B" className="eye-glow" />
              {/* Arms */}
              <line x1="30" y1="96" x2="16" y2="110" stroke="#E8E8E8" strokeWidth="1.5" />
              <rect x="10" y="108" width="8" height="5" stroke="#E8E8E8" strokeWidth="1" fill="none" />
              <line x1="130" y1="96" x2="144" y2="110" stroke="#E8E8E8" strokeWidth="1.5" />
              <rect x="142" y="108" width="8" height="5" stroke="#E8E8E8" strokeWidth="1" fill="none" />
            </svg>
          </div>
        </div>

        <div className="hero-content">
          <h1 className="hero-title">
            Write code.
            <br />
            <span>Control anything.</span>
          </h1>
          <p className="hero-sub">
            Origin is the open-source platform for controlling robots and hardware devices.
            One CLI to manage devices, install apps, and launch control interfaces — from
            Arduinos to simulated quadrupeds to humanoids.
          </p>
          <div className="hero-actions">
            <a className="btn-primary" href="#how">
              <span>Get Started</span>
            </a>
            <a
              className="btn-secondary"
              href="https://github.com/OriginRobotVerse/launcher"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>GitHub</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <line x1="3" y1="7" x2="11" y2="7" stroke="currentColor" strokeWidth="1.5" />
                <line x1="8" y1="4" x2="11" y2="7" stroke="currentColor" strokeWidth="1.5" />
                <line x1="8" y1="10" x2="11" y2="7" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </a>
          </div>
        </div>

        <div className="hero-tag">
          <span>Arduino · Unitree Go2 · Unitree G1 · MuJoCo Simulator · ESP32 · More</span>
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker-wrap">
        <div className="ticker">
          {tickerItems.map((item, i) => (
            <div key={i} className="ticker-item">
              <div className="t-dot" />
              {item}
            </div>
          ))}
          {tickerItems.map((item, i) => (
            <div key={`dup-${i}`} className="ticker-item">
              <div className="t-dot" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* WHAT IS ORIGIN */}
      <section id="what">
        <div className="container">
          <div className="reveal">
            <div className="section-label">01 — What</div>
            <h2 className="section-title">
              One platform for all your robots
            </h2>
            <p className="section-desc">
              Origin is a CLI + dashboard for managing hardware devices and the
              apps that control them. Connect over Bluetooth, Serial, or TCP.
              Install apps from GitHub. Launch control interfaces with one command.
              Everything goes through a unified REST API.
            </p>
          </div>

          <div className="what-grid">
            <div className="what-card reveal reveal-delay-1">
              <div className="wc-number">01</div>
              <div className="wc-title">CLI + Dashboard</div>
              <div className="wc-text">
                One command — <code>origin up</code> — starts the core server and a
                full Next.js dashboard. Manage devices, install apps, configure
                secrets, and launch controllers from the terminal or the browser.
              </div>
            </div>
            <div className="what-card reveal reveal-delay-2">
              <div className="wc-number">02</div>
              <div className="wc-title">Device Management</div>
              <div className="wc-text">
                Connect hardware over Bluetooth, USB Serial, or TCP. Each device
                auto-registers its sensors, actions, and state schema. Built-in
                profiles for Unitree Go2, G1, and Arduino. Live state via SSE.
              </div>
            </div>
            <div className="what-card reveal reveal-delay-3">
              <div className="wc-number">03</div>
              <div className="wc-title">App Platform</div>
              <div className="wc-text">
                Apps are directories with an origin-app.json manifest. They declare
                device requirements, frontend runtime, optional backend, and secrets.
                Install from GitHub, launch against any compatible device.
              </div>
            </div>
            <div className="what-card reveal reveal-delay-4">
              <div className="wc-number">04</div>
              <div className="wc-title">Simulator Support</div>
              <div className="wc-text">
                Built-in MuJoCo simulator integration. Start simulated quadrupeds
                and humanoids from the dashboard. Test your apps against physics
                simulations before deploying to real hardware.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEVICES */}
      <section id="devices">
        <div className="container">
          <div className="reveal">
            <div className="section-label">02 — Devices</div>
            <h2 className="section-title">From microcontrollers to humanoids.</h2>
            <p className="section-desc">
              Any device that communicates over a transport adapter is an Origin
              device. Connect real hardware or launch MuJoCo simulations — your
              apps work with both.
            </p>
          </div>

          <div className="devices-strip">
            <div className="device-card reveal reveal-delay-1">
              <div className="dc-icon">
                <svg viewBox="0 0 64 64" fill="none" width="56" height="56">
                  <rect x="8" y="16" width="48" height="32" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
                  <rect x="14" y="22" width="8" height="8" stroke="#4A4A4A" strokeWidth="1" fill="none" />
                  <rect x="14" y="22" width="8" height="8" fill="rgba(245,158,11,0.15)" />
                  <line x1="16" y1="16" x2="16" y2="12" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="24" y1="16" x2="24" y2="12" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="32" y1="16" x2="32" y2="12" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="40" y1="16" x2="40" y2="12" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="48" y1="16" x2="48" y2="12" stroke="#E8E8E8" strokeWidth="1.5" />
                  <rect x="42" y="36" width="8" height="6" stroke="#4A4A4A" strokeWidth="1" fill="none" />
                </svg>
              </div>
              <div className="dc-name">Arduino</div>
              <div className="dc-type">Bluetooth / Serial</div>
              <div className="dc-status live">Live</div>
            </div>

            <div className="device-card reveal reveal-delay-2">
              <div className="dc-icon">
                <svg viewBox="0 0 64 64" fill="none" width="56" height="56">
                  <rect x="14" y="20" width="36" height="16" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
                  <rect x="42" y="14" width="14" height="12" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
                  <rect x="50" y="17" width="4" height="3" fill="#F59E0B" />
                  <line x1="18" y1="36" x2="14" y2="52" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="14" y1="52" x2="10" y2="52" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="30" y1="36" x2="26" y2="52" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="26" y1="52" x2="22" y2="52" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="36" y1="36" x2="40" y2="52" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="40" y1="52" x2="44" y2="52" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="46" y1="36" x2="50" y2="52" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="50" y1="52" x2="54" y2="52" stroke="#E8E8E8" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="dc-name">Unitree Go2</div>
              <div className="dc-type">12-DOF Quadruped</div>
              <div className="dc-status live">Live</div>
            </div>

            <div className="device-card reveal reveal-delay-3">
              <div className="dc-icon">
                <svg viewBox="0 0 64 64" fill="none" width="56" height="56">
                  <rect x="24" y="4" width="16" height="12" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
                  <rect x="28" y="7" width="3" height="3" fill="#F59E0B" />
                  <rect x="34" y="7" width="3" height="3" fill="#F59E0B" />
                  <line x1="32" y1="16" x2="32" y2="20" stroke="#E8E8E8" strokeWidth="1.5" />
                  <rect x="22" y="20" width="20" height="20" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
                  <line x1="22" y1="30" x2="42" y2="30" stroke="#4A4A4A" strokeWidth="0.75" />
                  <line x1="22" y1="22" x2="12" y2="34" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="12" y1="34" x2="12" y2="42" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="42" y1="22" x2="52" y2="34" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="52" y1="34" x2="52" y2="42" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="28" y1="40" x2="24" y2="56" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="24" y1="56" x2="20" y2="58" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="36" y1="40" x2="40" y2="56" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="40" y1="56" x2="44" y2="58" stroke="#E8E8E8" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="dc-name">Unitree G1</div>
              <div className="dc-type">23-DOF Humanoid</div>
              <div className="dc-status live">Live</div>
            </div>

            <div className="device-card reveal reveal-delay-4">
              <div className="dc-icon">
                <svg viewBox="0 0 64 64" fill="none" width="56" height="56">
                  <rect x="12" y="18" width="40" height="28" stroke="#E8E8E8" strokeWidth="1.5" fill="none" />
                  <rect x="22" y="26" width="20" height="12" stroke="#4A4A4A" strokeWidth="1" fill="none" />
                  <rect x="28" y="30" width="8" height="4" fill="#F59E0B" opacity="0.3" />
                  <line x1="32" y1="14" x2="32" y2="10" stroke="#F59E0B" strokeWidth="1" opacity="0.4" />
                  <line x1="26" y1="12" x2="32" y2="8" stroke="#F59E0B" strokeWidth="1" opacity="0.3" />
                  <line x1="38" y1="12" x2="32" y2="8" stroke="#F59E0B" strokeWidth="1" opacity="0.3" />
                  <line x1="16" y1="46" x2="16" y2="50" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="24" y1="46" x2="24" y2="50" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="40" y1="46" x2="40" y2="50" stroke="#E8E8E8" strokeWidth="1.5" />
                  <line x1="48" y1="46" x2="48" y2="50" stroke="#E8E8E8" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="dc-name">MuJoCo Sim</div>
              <div className="dc-type">Physics Simulator</div>
              <div className="dc-status live">Live</div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how">
        <div className="container">
          <div className="reveal">
            <div className="section-label">03 — How</div>
            <h2 className="section-title">Three commands to control a robot.</h2>
            <p className="section-desc">
              Origin separates device management from application logic. The
              server manages connections — your apps provide the brains.
            </p>
          </div>

          <div className="flow-steps reveal">
            <div className="flow-step">
              <div className="fs-number">01</div>
              <div className="fs-title">Start Origin</div>
              <div className="fs-text">
                Run <code>npx originrobot up</code> to start the core server and
                dashboard. Devices connect over Bluetooth, Serial, or TCP. The
                MuJoCo simulator can be launched from the dashboard.
              </div>
            </div>
            <div className="flow-arrow">
              <ArrowIcon />
            </div>
            <div className="flow-step">
              <div className="fs-number">02</div>
              <div className="fs-title">Install an app</div>
              <div className="fs-text">
                Run <code>origin install github.com/user/app</code> or install
                from the dashboard. Apps are directories with an origin-app.json
                manifest — they declare what devices they support and what they need
                to run.
              </div>
            </div>
            <div className="flow-arrow">
              <ArrowIcon />
            </div>
            <div className="flow-step">
              <div className="fs-number">03</div>
              <div className="fs-title">Launch</div>
              <div className="fs-text">
                Run <code>origin launch my-app --device go2</code> or click Launch
                in the dashboard. Origin spawns the app, connects it to the device,
                and you get a live control interface.
              </div>
            </div>
          </div>

          {/* Code sample — origin-app.json manifest */}
          <div className="code-section reveal" style={{ marginTop: 64 }}>
            <div className="code-panel">
              <div className="code-header">
                <div className="code-dot" style={{ background: "var(--phosphor)" }} />
                <div className="code-filename">origin-app.json</div>
              </div>
              <div className="code-body">
                {"{"}
                <br />
                &nbsp;&nbsp;<span className="str">&quot;name&quot;</span>:{" "}
                <span className="str">&quot;My Robot Controller&quot;</span>,
                <br />
                &nbsp;&nbsp;<span className="str">&quot;id&quot;</span>:{" "}
                <span className="str">&quot;my-controller&quot;</span>,
                <br />
                &nbsp;&nbsp;<span className="str">&quot;version&quot;</span>:{" "}
                <span className="str">&quot;0.1.0&quot;</span>,
                <br /><br />
                &nbsp;&nbsp;<span className="str">&quot;device&quot;</span>: {"{"}
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="str">&quot;type&quot;</span>:{" "}
                <span className="str">&quot;quadruped&quot;</span>,
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="str">&quot;requiredActions&quot;</span>:{" "}
                [<span className="str">&quot;set_pos&quot;</span>,{" "}
                <span className="str">&quot;reset&quot;</span>],
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="str">&quot;requiredState&quot;</span>:{" "}
                [<span className="str">&quot;body_z&quot;</span>]
                <br />
                &nbsp;&nbsp;{"}"},
                <br /><br />
                &nbsp;&nbsp;<span className="str">&quot;runtime&quot;</span>: {"{"}
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="str">&quot;type&quot;</span>:{" "}
                <span className="str">&quot;nextjs&quot;</span>,
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="str">&quot;port&quot;</span>:{" "}
                <span className="num">3001</span>
                <br />
                &nbsp;&nbsp;{"}"},
                <br /><br />
                &nbsp;&nbsp;<span className="str">&quot;secrets&quot;</span>: [{"{"}
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="str">&quot;key&quot;</span>:{" "}
                <span className="str">&quot;OPENROUTER_API_KEY&quot;</span>,
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="str">&quot;required&quot;</span>:{" "}
                <span className="kw">true</span>
                <br />
                &nbsp;&nbsp;{"}"}]
                <br />
                {"}"}
              </div>
            </div>
            <div className="code-desc">
              <div className="cd-title">This is the whole manifest.</div>
              <div className="cd-text">
                Your app declares what type of device it needs, what actions and
                state keys it requires, and how to run its frontend. Origin handles
                compatibility checking, secret management, process lifecycle, and
                health monitoring.
              </div>
              <div className="cd-text">
                The same app runs against a real Unitree Go2 over TCP
                or a MuJoCo simulation — Origin provides the same API for both.
              </div>
              <div className="cd-highlight">
                Your app doesn&apos;t know or care if the robot is real or
                simulated. It just reads state and sends actions.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* APPS */}
      <section id="apps" className="appstore">
        <div className="appstore-grid-bg" />
        <div className="appstore-glow" />

        <div className="appstore-content reveal">
          <div className="as-pretitle">Install from GitHub</div>
          <h2>
            The <span>Origin</span> App Platform
          </h2>
          <p className="as-desc">
            Share robot apps with the community. Install from any GitHub repo,
            configure secrets, and launch against your device. Each app gets a
            full control interface with live telemetry and logs.
          </p>

          {waitlistStatus === "success" ? (
            <div className="waitlist-success">
              <div className="ws-dot" />
              {waitlistMsg}
            </div>
          ) : (
            <form className="waitlist-form" onSubmit={handleWaitlist}>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="waitlist-input"
                disabled={waitlistStatus === "loading"}
              />
              <button
                type="submit"
                className="waitlist-btn"
                disabled={waitlistStatus === "loading"}
              >
                {waitlistStatus === "loading" ? "..." : "Join Waitlist"}
              </button>
            </form>
          )}
          {waitlistStatus === "error" && (
            <div className="waitlist-error">{waitlistMsg}</div>
          )}

          <div className="appstore-apps reveal reveal-delay-2">
            <div className="app-preview">
              <div className="ap-icon">
                <div className="inner" style={{ background: "var(--phosphor)", opacity: 0.6 }} />
              </div>
              <div className="ap-name">agent-controller</div>
              <div className="ap-author">origin / wheeled</div>
            </div>
            <div className="app-preview">
              <div className="ap-icon">
                <div className="inner" style={{ background: "#93C5FD", opacity: 0.6 }} />
              </div>
              <div className="ap-name">mujoco-policy-ctrl</div>
              <div className="ap-author">origin / quadruped</div>
            </div>
            <div className="app-preview">
              <div className="ap-icon">
                <div className="inner" style={{ background: "#86EFAC", opacity: 0.6 }} />
              </div>
              <div className="ap-name">patrol-route</div>
              <div className="ap-author">community / wheeled</div>
            </div>
            <div className="app-preview">
              <div className="ap-icon">
                <div className="inner" style={{ background: "#FCA5A5", opacity: 0.6 }} />
              </div>
              <div className="ap-name">gait-trainer</div>
              <div className="ap-author">community / humanoid</div>
            </div>
            <div className="app-preview">
              <div className="ap-icon">
                <div className="inner" style={{ border: "1px solid var(--wire-bright)" }} />
              </div>
              <div className="ap-name">your-app</div>
              <div className="ap-author">you</div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-left">
          <OriginLogo size={20} />
          <span>origin</span>
        </div>
        <div className="footer-links">
          <a
            href="https://github.com/OriginRobotVerse/launcher"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-social"
            aria-label="GitHub"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
          <a
            href="https://x.com/use_origin"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-social"
            aria-label="Follow on X"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
        <div className="footer-right">
          Control anything.
        </div>
      </footer>
    </>
  );
}
