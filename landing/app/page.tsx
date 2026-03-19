"use client";

import { useEffect, useState } from "react";

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
  'registerSensor("ultrasonic", pins, 2, readDistance)',
  "origin.tick()",
  'await ctx.send("moveFwd")',
  "const readings = await ctx.read()",
  'registerAction("stop", stop)',
  "setTransport(new BluetoothAdapter())",
  "readings.distance < 10",
  'runModel("choreography", inputs)',
];

export default function LandingPage() {
  const [navOpen, setNavOpen] = useState(false);

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
          <a href="#appstore" onClick={() => setNavOpen(false)}>
            App Store
          </a>
          <a
            href="https://github.com"
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
            Origin is the runtime that sits between your TypeScript and any
            physical device — from Arduinos to robot dogs to humanoids. Flash
            the firmware once. Write apps forever.
          </p>
          <div className="hero-actions">
            <div className="btn-primary">
              <span>Origin App Store — Coming Soon</span>
            </div>
            <a className="btn-secondary" href="#how">
              <span>How it works</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <line x1="3" y1="7" x2="11" y2="7" stroke="currentColor" strokeWidth="1.5" />
                <line x1="8" y1="4" x2="11" y2="7" stroke="currentColor" strokeWidth="1.5" />
                <line x1="8" y1="10" x2="11" y2="7" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </a>
          </div>
        </div>

        <div className="hero-tag">
          <span>Arduino · Unitree Go2 · Unitree H1 · ESP32 · Raspberry Pi · More</span>
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
              Control anything
            </h2>
            <p className="section-desc">
              Every robot, every microcontroller, every physical device follows
              the same loop: setup, sense, act, repeat. Origin is a thin runtime
              that standardizes this loop so you can write the logic that matters
              — in TypeScript, on your machine — while the device handles the
              physics.
            </p>
          </div>

          <div className="what-grid">
            <div className="what-card reveal reveal-delay-1">
              <div className="wc-number">01</div>
              <div className="wc-title">Firmware SDK</div>
              <div className="wc-text">
                A C++ library that runs on the device. Register your sensors,
                chips, and actions. Sensors auto-poll every tick. Actions persist
                until overridden. The entire loop is one call: origin.tick()
              </div>
            </div>
            <div className="what-card reveal reveal-delay-2">
              <div className="wc-number">02</div>
              <div className="wc-title">Host Runtime</div>
              <div className="wc-text">
                A TypeScript server on your machine. Loads and runs apps that
                read sensor data and send actions to the device. The launcher
                owns the loop — your app is a clean module with setup, loop, and
                teardown.
              </div>
            </div>
            <div className="what-card reveal reveal-delay-3">
              <div className="wc-number">03</div>
              <div className="wc-title">Pluggable Transport</div>
              <div className="wc-text">
                Bluetooth, WiFi, USB Serial — swap the adapter and everything
                upstream stays identical. JSON on the wire for v1. The firmware
                doesn&apos;t care how the action arrived.
              </div>
            </div>
            <div className="what-card reveal reveal-delay-4">
              <div className="wc-number">04</div>
              <div className="wc-title">App Ecosystem</div>
              <div className="wc-text">
                Share apps with the community. An obstacle avoider, a gesture
                controller, an ML choreography engine — install it, point it at
                your device, run it. Origin App Store coming soon.
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
            <h2 className="section-title">One runtime. Any device.</h2>
            <p className="section-desc">
              Origin isn&apos;t just for Arduinos. Any device that can run a
              firmware loop and communicate over a transport adapter is an Origin
              device. From microcontrollers to quadruped robots to full
              humanoids.
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
              <div className="dc-type">Microcontroller</div>
              <div className="dc-status live">v1</div>
            </div>

            <div className="device-card reveal reveal-delay-2">
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
              <div className="dc-name">ESP32</div>
              <div className="dc-type">Microcontroller + WiFi</div>
              <div className="dc-status live">v1</div>
            </div>

            <div className="device-card reveal reveal-delay-3">
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
              <div className="dc-type">Quadruped Robot</div>
              <div className="dc-status soon">Coming</div>
            </div>

            <div className="device-card reveal reveal-delay-4">
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
              <div className="dc-name">Unitree H1</div>
              <div className="dc-type">Humanoid Robot</div>
              <div className="dc-status soon">Coming</div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how">
        <div className="container">
          <div className="reveal">
            <div className="section-label">03 — How</div>
            <h2 className="section-title">Flash once. Build forever.</h2>
            <p className="section-desc">
              Origin separates the hardware loop from your application logic. The
              device runs the physics — your code runs the brain.
            </p>
          </div>

          <div className="flow-steps reveal">
            <div className="flow-step">
              <div className="fs-number">01</div>
              <div className="fs-title">Flash the firmware</div>
              <div className="fs-text">
                Register your sensors, chips, and actions. Set a transport
                adapter. The device runs origin.tick() in a loop forever. You
                never touch the firmware again.
              </div>
            </div>
            <div className="flow-arrow">
              <ArrowIcon />
            </div>
            <div className="flow-step">
              <div className="fs-number">02</div>
              <div className="fs-title">Write your app</div>
              <div className="fs-text">
                A TypeScript module with a loop function. Read sensor data, make
                decisions, send actions. Use ML, call APIs, run inference —
                anything your host machine can do.
              </div>
            </div>
            <div className="flow-arrow">
              <ArrowIcon />
            </div>
            <div className="flow-step">
              <div className="fs-number">03</div>
              <div className="fs-title">Launch</div>
              <div className="fs-text">
                The launcher connects to your device, starts your app loop, and
                relays readings and actions in real time. Swap apps on the fly —
                no reflashing.
              </div>
            </div>
          </div>

          {/* Code sample */}
          <div className="code-section reveal" style={{ marginTop: 64 }}>
            <div className="code-panel">
              <div className="code-header">
                <div className="code-dot" style={{ background: "var(--phosphor)" }} />
                <div className="code-filename">obstacle-avoider.ts</div>
              </div>
              <div className="code-body">
                <span className="kw">import</span> {"{ OriginApp }"}{" "}
                <span className="kw">from</span>{" "}
                <span className="str">&quot;@origin/core&quot;</span>
                <br /><br />
                <span className="kw">const</span>{" "}
                <span className="fn">app</span>: OriginApp = {"{"}
                <br />
                &nbsp;&nbsp;name:{" "}
                <span className="str">&quot;obstacle-avoider&quot;</span>,
                <br /><br />
                &nbsp;&nbsp;<span className="kw">async</span>{" "}
                <span className="fn">loop</span>(ctx) {"{"}
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">const</span> readings ={" "}
                <span className="kw">await</span> ctx.<span className="fn">read</span>()
                <br /><br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">if</span> (readings.distance &lt;{" "}
                <span className="num">10</span>) {"{"}
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">await</span> ctx.
                <span className="fn">send</span>(<span className="str">&quot;moveBkwd&quot;</span>)
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">await</span> ctx.
                <span className="fn">send</span>(<span className="str">&quot;turnRight&quot;</span>)
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;{"}"} <span className="kw">else</span> {"{"}
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="kw">await</span> ctx.
                <span className="fn">send</span>(<span className="str">&quot;moveFwd&quot;</span>)
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;{"}"}
                <br />
                &nbsp;&nbsp;{"}"}
                <br />
                {"}"}
                <br /><br />
                <span className="kw">export default</span> app
              </div>
            </div>
            <div className="code-desc">
              <div className="cd-title">This is the whole app.</div>
              <div className="cd-text">
                No C++. No firmware. No pin configurations. Just read the
                sensors, make a decision, send an action. The device handles the
                rest.
              </div>
              <div className="cd-text">
                This same app runs against an Arduino with an ultrasonic sensor,
                a Unitree Go2 with LIDAR, or anything else that exposes a
                distance reading through Origin.
              </div>
              <div className="cd-highlight">
                The app doesn&apos;t know or care what device it&apos;s
                controlling. It just reads and acts.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* APP STORE */}
      <section id="appstore" className="appstore">
        <div className="appstore-grid-bg" />
        <div className="appstore-glow" />

        <div className="appstore-content reveal">
          <div className="as-pretitle">Coming Soon</div>
          <h2>
            The <span>Origin</span> App Store
          </h2>
          <p className="as-desc">
            Share apps with the community. Install an obstacle avoider, a
            gesture controller, an ML choreography engine — point it at your
            device and run it. Build once, run on any Origin-compatible device.
          </p>

          <div className="appstore-btn">
            <div className="btn-dot" />
            Origin App Store — Coming Soon
          </div>

          <div className="appstore-apps reveal reveal-delay-2">
            <div className="app-preview">
              <div className="ap-icon">
                <div className="inner" style={{ background: "var(--phosphor)", opacity: 0.6 }} />
              </div>
              <div className="ap-name">obstacle-avoider</div>
              <div className="ap-author">origin/core</div>
            </div>
            <div className="app-preview">
              <div className="ap-icon">
                <div className="inner" style={{ background: "#93C5FD", opacity: 0.6 }} />
              </div>
              <div className="ap-name">gesture-driver</div>
              <div className="ap-author">origin/core</div>
            </div>
            <div className="app-preview">
              <div className="ap-icon">
                <div className="inner" style={{ background: "#86EFAC", opacity: 0.6 }} />
              </div>
              <div className="ap-name">patrol-route</div>
              <div className="ap-author">community</div>
            </div>
            <div className="app-preview">
              <div className="ap-icon">
                <div className="inner" style={{ background: "#FCA5A5", opacity: 0.6 }} />
              </div>
              <div className="ap-name">ml-choreography</div>
              <div className="ap-author">community</div>
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
        <div className="footer-right">
          Control anything.
        </div>
      </footer>
    </>
  );
}
