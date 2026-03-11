import { OriginMark } from "./components/icons";
import {
  Hero,
  HowItWorks,
  Architecture,
  FirmwareSDK,
  HostRuntime,
  WritingApps,
  QuickStart,
} from "./components/sections";

const navStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 100,
  background: "rgba(10, 10, 10, 0.9)",
  backdropFilter: "blur(12px)",
  borderBottom: "1px solid var(--wire)",
  padding: "0 48px",
  height: 56,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const navBrandStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
};

const navTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: "0.05em",
  color: "var(--signal)",
};

const navLinksStyle: React.CSSProperties = {
  display: "flex",
  gap: 32,
};

const navLinkStyle: React.CSSProperties = {
  color: "var(--dim)",
  textDecoration: "none",
  fontSize: 12,
  letterSpacing: "0.04em",
  transition: "color 0.2s",
};

const footerStyle: React.CSSProperties = {
  borderTop: "1px solid var(--wire)",
  padding: "48px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

function App() {
  return (
    <>
      <nav style={navStyle}>
        <div style={navBrandStyle}>
          <OriginMark width={24} height={24} />
          <div style={navTitleStyle}>
            origin <span style={{ color: "var(--dim)" }}>docs</span>
          </div>
        </div>
        <div style={navLinksStyle}>
          {[
            ["#how-it-works", "How It Works"],
            ["#architecture", "Architecture"],
            ["#firmware", "Firmware"],
            ["#host", "Host Runtime"],
            ["#apps", "Writing Apps"],
            ["#quickstart", "Quick Start"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              style={navLinkStyle}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--phosphor)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--dim)")
              }
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <main>
        <Hero />
        <div id="how-it-works">
          <HowItWorks />
        </div>
        <div id="architecture">
          <Architecture />
        </div>
        <div id="firmware">
          <FirmwareSDK />
        </div>
        <div id="host">
          <HostRuntime />
        </div>
        <div id="apps">
          <WritingApps />
        </div>
        <div id="quickstart">
          <QuickStart />
        </div>
      </main>

      <footer style={footerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <OriginMark width={16} height={16} />
          <span style={{ fontSize: 12, color: "var(--dim)" }}>origin</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--dim-dark)" }}>
          The zero point between hardware and code
        </div>
      </footer>
    </>
  );
}

export default App;
