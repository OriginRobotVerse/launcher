import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BotIdle, BotMoving, BotError } from "../icons";

const sectionStyle: React.CSSProperties = {
  padding: "120px 24px",
  maxWidth: "1200px",
  margin: "0 auto",
};

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--dim)",
  fontFamily: "'JetBrains Mono', monospace",
  marginBottom: "16px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "36px",
  fontWeight: 700,
  color: "var(--signal)",
  fontFamily: "'JetBrains Mono', monospace",
  marginBottom: "8px",
  lineHeight: 1.2,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "var(--dim)",
  fontFamily: "'JetBrains Mono', monospace",
  marginBottom: "64px",
};

const pipelineRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0",
  marginBottom: "64px",
};

const packageBoxStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--wire)",
  padding: "16px 24px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "13px",
  color: "var(--signal)",
  textAlign: "center",
};

const packageBoxHighlightStyle: React.CSSProperties = {
  ...packageBoxStyle,
  borderColor: "var(--phosphor-dim)",
  color: "var(--phosphor)",
};

const arrowConnectorStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "0 4px",
};

const contextCardStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--wire)",
  padding: "28px 24px",
  marginBottom: "64px",
};

const contextTitleStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--signal)",
  fontFamily: "'JetBrains Mono', monospace",
  marginBottom: "20px",
};

const contextRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: "16px",
  padding: "12px 0",
  borderBottom: "1px solid var(--wire)",
};

const contextRowLastStyle: React.CSSProperties = {
  ...contextRowStyle,
  borderBottom: "none",
};

const contextPropStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "13px",
  color: "var(--phosphor)",
  fontWeight: 600,
  minWidth: "160px",
  flexShrink: 0,
};

const contextDescStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "12px",
  color: "var(--dim)",
  lineHeight: 1.6,
};

const timelineSectionStyle: React.CSSProperties = {
  marginTop: "16px",
};

const timelineLabelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--signal)",
  fontFamily: "'JetBrains Mono', monospace",
  marginBottom: "32px",
};

const timelineRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0",
};

const timelineStepStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "10px",
  padding: "16px 20px",
  border: "1px solid var(--wire)",
  background: "var(--panel)",
  minWidth: "90px",
  transition: "border-color 0.3s, background 0.3s",
};

const timelineStepActiveStyle: React.CSSProperties = {
  borderColor: "var(--phosphor)",
  background: "var(--phosphor-glow)",
};

const timelineStepLabelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 600,
};

const timelineArrowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "0 2px",
};

const ellipsisStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "0 8px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "16px",
  color: "var(--dim-dark)",
  letterSpacing: "4px",
};

const contextItems = [
  {
    prop: "ctx.readings",
    desc: "Latest sensor data, auto-updated",
  },
  {
    prop: "ctx.send(action)",
    desc: "Send commands to the device",
  },
  {
    prop: "ctx.read()",
    desc: "Force a fresh sensor read",
  },
];

function SmallArrow() {
  return (
    <div style={arrowConnectorStyle}>
      <svg width="28" height="10" viewBox="0 0 28 10" fill="none">
        <line x1="0" y1="5" x2="22" y2="5" stroke="var(--wire-bright)" strokeWidth="1" />
        <path d="M20 2L26 5L20 8" stroke="var(--wire-bright)" strokeWidth="1" fill="none" />
      </svg>
    </div>
  );
}

function TimelineArrow() {
  return (
    <div style={timelineArrowStyle}>
      <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
        <line x1="0" y1="5" x2="14" y2="5" stroke="var(--wire-bright)" strokeWidth="1" />
        <path d="M12 2L18 5L12 8" stroke="var(--wire-bright)" strokeWidth="1" fill="none" />
      </svg>
    </div>
  );
}

interface TimelineStep {
  label: string;
  icon: React.ReactNode;
}

const timelineSteps: TimelineStep[] = [
  { label: "setup()", icon: <BotIdle width={28} height={33} /> },
  { label: "loop()", icon: <BotMoving width={28} height={33} /> },
  { label: "loop()", icon: <BotMoving width={28} height={33} /> },
  { label: "loop()", icon: <BotMoving width={28} height={33} /> },
  { label: "teardown()", icon: <BotError width={28} height={33} /> },
];

function AppLifecycle() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % timelineSteps.length);
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      style={timelineSectionStyle}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div style={timelineLabelStyle}>App Lifecycle</div>
      <div style={timelineRowStyle}>
        {timelineSteps.map((step, i) => (
          <div key={`${step.label}-${i}`} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                ...timelineStepStyle,
                ...(activeIndex === i ? timelineStepActiveStyle : {}),
              }}
            >
              {step.icon}
              <span
                style={{
                  ...timelineStepLabelStyle,
                  color: activeIndex === i ? "var(--phosphor)" : "var(--dim)",
                }}
              >
                {step.label}
              </span>
            </div>
            {i < timelineSteps.length - 1 && (
              i === 2 ? (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <TimelineArrow />
                  <span style={ellipsisStyle}>...</span>
                  <TimelineArrow />
                </div>
              ) : (
                <TimelineArrow />
              )
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function HostRuntime() {
  return (
    <section style={sectionStyle}>
      <motion.p
        style={labelStyle}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        04 &mdash; Host Runtime
      </motion.p>

      <motion.h2
        style={titleStyle}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        The TypeScript Side
      </motion.h2>

      <motion.p
        style={subtitleStyle}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        Write your logic where you have the whole Node.js ecosystem.
      </motion.p>

      {/* Package pipeline */}
      <motion.div
        style={pipelineRowStyle}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div style={packageBoxStyle}>originrobot-core</div>
        <SmallArrow />
        <div style={packageBoxStyle}>originrobot-launcher</div>
        <SmallArrow />
        <div style={packageBoxHighlightStyle}>Your App</div>
      </motion.div>

      {/* AppContext card */}
      <motion.div
        style={contextCardStyle}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <div style={contextTitleStyle}>AppContext Interface</div>
        {contextItems.map((item, i) => (
          <div
            key={item.prop}
            style={
              i === contextItems.length - 1
                ? contextRowLastStyle
                : contextRowStyle
            }
          >
            <span style={contextPropStyle}>{item.prop}</span>
            <span style={contextDescStyle}>{item.desc}</span>
          </div>
        ))}
      </motion.div>

      <AppLifecycle />
    </section>
  );
}
