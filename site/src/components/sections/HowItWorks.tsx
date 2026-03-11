import { motion } from "framer-motion";
import { BotIdle, BotSensing, BotSending, BotReceiving } from "../icons";

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
  marginBottom: "16px",
  lineHeight: 1.2,
};

const descStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "var(--dim)",
  fontFamily: "'JetBrains Mono', monospace",
  lineHeight: 1.7,
  maxWidth: "640px",
  marginBottom: "64px",
};

const diagramContainerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0",
  marginBottom: "80px",
  position: "relative",
  flexWrap: "wrap",
};

const panelStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--wire)",
  padding: "32px 24px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "16px",
  minWidth: "220px",
  flex: "0 0 auto",
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "var(--dim)",
  fontFamily: "'JetBrains Mono', monospace",
};

const panelLabelStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--signal)",
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 600,
};

const codeSnippetStyle: React.CSSProperties = {
  background: "var(--panel-raised)",
  border: "1px solid var(--wire)",
  padding: "12px 16px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "11px",
  color: "var(--phosphor)",
  whiteSpace: "pre",
  width: "100%",
  lineHeight: 1.6,
};

const middleSectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "12px",
  padding: "16px 24px",
  minWidth: "280px",
  position: "relative",
};

const arrowRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  width: "100%",
  position: "relative",
  height: "40px",
};

const arrowLineStyle: React.CSSProperties = {
  flex: 1,
  height: "1px",
  position: "relative",
};

const arrowLabelStyle: React.CSSProperties = {
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontFamily: "'JetBrains Mono', monospace",
  whiteSpace: "nowrap",
};

const dataPacketStyle: React.CSSProperties = {
  position: "absolute",
  top: "-18px",
  fontSize: "10px",
  fontFamily: "'JetBrains Mono', monospace",
  whiteSpace: "nowrap",
  pointerEvents: "none",
};

const stepsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "24px",
};

const stepCardStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--wire)",
  padding: "28px 20px",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "12px",
};

const stepNumberStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--phosphor)",
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
};

const stepTitleStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--signal)",
  fontFamily: "'JetBrains Mono', monospace",
};

const stepDescStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--dim)",
  fontFamily: "'JetBrains Mono', monospace",
  lineHeight: 1.6,
};

function CodeIcon() {
  return (
    <svg
      width="40"
      height="47"
      viewBox="0 0 48 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="8"
        y="8"
        width="32"
        height="40"
        stroke="#E8E8E8"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M18 24L13 28L18 32"
        stroke="#F59E0B"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="square"
      />
      <path
        d="M30 24L35 28L30 32"
        stroke="#F59E0B"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="square"
      />
      <line
        x1="26"
        y1="20"
        x2="22"
        y2="36"
        stroke="#737373"
        strokeWidth="1.5"
      />
    </svg>
  );
}

const steps = [
  {
    number: "01",
    title: "Poll Sensors",
    desc: "Firmware reads all registered sensors every tick",
    icon: <BotSensing width={36} height={42} />,
  },
  {
    number: "02",
    title: "Send Readings",
    desc: "Readings are serialized to JSON and sent to the host",
    icon: <BotSending width={36} height={42} />,
  },
  {
    number: "03",
    title: "Run App Logic",
    desc: "Your TypeScript app receives fresh data and decides what to do",
    icon: <CodeIcon />,
  },
  {
    number: "04",
    title: "Execute Action",
    desc: "Arduino receives the action and keeps executing it until overridden",
    icon: <BotReceiving width={36} height={42} />,
  },
];

export default function HowItWorks() {
  return (
    <section style={sectionStyle}>
      <motion.p
        style={labelStyle}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        01 &mdash; How It Works
      </motion.p>

      <motion.h2
        style={titleStyle}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Two Loops, One Wire
      </motion.h2>

      <motion.p
        style={descStyle}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        Origin splits your robot into two loops running in parallel. The Arduino
        firmware continuously polls sensors and executes actions. Your TypeScript
        app on the host machine receives sensor readings and decides what to do
        next. They communicate over a single serial wire using JSON messages.
      </motion.p>

      <motion.div
        style={diagramContainerStyle}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Host Machine Panel */}
        <div style={panelStyle}>
          <span style={panelTitleStyle}>Host Machine</span>
          <BotIdle width={48} height={56} />
          <span style={panelLabelStyle}>TypeScript App</span>
          <div style={codeSnippetStyle}>
            {`if (distance < 10)\n  send("stop")`}
          </div>
        </div>

        {/* Middle: animated arrows */}
        <div style={middleSectionStyle}>
          {/* Top arrow: readings, right to left (Arduino -> Host) */}
          <div style={arrowRowStyle}>
            <span
              style={{
                ...arrowLabelStyle,
                color: "var(--phosphor)",
              }}
            >
              readings
            </span>
            <div style={arrowLineStyle}>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "1px",
                  background: "var(--phosphor-dim)",
                }}
              />
              {/* Arrow head pointing left */}
              <svg
                width="8"
                height="8"
                viewBox="0 0 8 8"
                style={{ position: "absolute", left: "-4px", top: "-3.5px" }}
              >
                <path d="M8 0L0 4L8 8" fill="var(--phosphor)" />
              </svg>
              {/* Animated data packet */}
              <motion.span
                style={{
                  ...dataPacketStyle,
                  color: "var(--phosphor)",
                }}
                animate={{ left: ["100%", "0%"] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                {`{"distance": 24}`}
              </motion.span>
            </div>
          </div>

          {/* Bottom arrow: actions, left to right (Host -> Arduino) */}
          <div style={arrowRowStyle}>
            <div style={{ ...arrowLineStyle }}>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "1px",
                  background: "var(--wire-bright)",
                }}
              />
              {/* Arrow head pointing right */}
              <svg
                width="8"
                height="8"
                viewBox="0 0 8 8"
                style={{ position: "absolute", right: "-4px", top: "-3.5px" }}
              >
                <path d="M0 0L8 4L0 8" fill="var(--signal)" />
              </svg>
              {/* Animated data packet */}
              <motion.span
                style={{
                  ...dataPacketStyle,
                  color: "var(--signal)",
                }}
                animate={{ left: ["0%", "100%"] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                  delay: 1.5,
                }}
              >
                {`{"action": "moveFwd"}`}
              </motion.span>
            </div>
            <span
              style={{
                ...arrowLabelStyle,
                color: "var(--signal)",
              }}
            >
              actions
            </span>
          </div>
        </div>

        {/* Arduino Panel */}
        <div style={panelStyle}>
          <span style={panelTitleStyle}>Arduino</span>
          <BotSensing width={48} height={56} />
          <span style={panelLabelStyle}>Origin Firmware</span>
          <div style={codeSnippetStyle}>origin.tick()</div>
        </div>
      </motion.div>

      {/* 4 Steps Grid */}
      <div style={stepsGridStyle}>
        {steps.map((step, i) => (
          <motion.div
            key={step.number}
            style={stepCardStyle}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.12 }}
          >
            <span style={stepNumberStyle}>{step.number}</span>
            <div>{step.icon}</div>
            <span style={stepTitleStyle}>{step.title}</span>
            <span style={stepDescStyle}>{step.desc}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
