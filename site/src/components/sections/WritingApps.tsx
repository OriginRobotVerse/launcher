import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BotIdle, BotMoving, BotSensing } from "../icons";

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
  marginBottom: "64px",
  lineHeight: 1.2,
};

const codeDisplayStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--wire)",
  padding: "32px",
  marginBottom: "48px",
  overflowX: "auto",
};

const codePreStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "13px",
  lineHeight: 1.8,
  whiteSpace: "pre",
  margin: 0,
};

const animationContainerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "24px",
  marginBottom: "80px",
  padding: "32px",
  border: "1px solid var(--wire)",
  background: "var(--panel)",
};

const stateBoxStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "12px",
  padding: "20px 24px",
  border: "1px solid var(--wire)",
  background: "var(--panel-raised)",
  minWidth: "120px",
  transition: "border-color 0.3s, background 0.3s",
};

const stateBoxActiveStyle: React.CSSProperties = {
  borderColor: "var(--phosphor)",
  background: "var(--phosphor-glow)",
};

const stateLabelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 600,
};

const stateArrowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
};

const ideaCardsRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "24px",
};

const ideaCardStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--wire)",
  padding: "28px 24px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const ideaCardTitleStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--signal)",
  fontFamily: "'JetBrains Mono', monospace",
};

const ideaCardDescStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--dim)",
  fontFamily: "'JetBrains Mono', monospace",
  lineHeight: 1.6,
};

interface CodeToken {
  text: string;
  color: string;
}

const codeLine = (tokens: CodeToken[]): CodeToken[] => tokens;

const codeLines: CodeToken[][] = [
  codeLine([
    { text: "const ", color: "var(--phosphor)" },
    { text: "app", color: "var(--signal)" },
    { text: ": ", color: "var(--dim)" },
    { text: "OriginApp", color: "var(--phosphor)" },
    { text: " = {", color: "var(--signal)" },
  ]),
  codeLine([
    { text: "  name: ", color: "var(--signal)" },
    { text: '"obstacle-avoider"', color: "var(--phosphor-bright)" },
    { text: ",", color: "var(--signal)" },
  ]),
  codeLine([
    { text: "  ", color: "var(--signal)" },
    { text: "async ", color: "var(--phosphor)" },
    { text: "loop", color: "var(--signal)" },
    { text: "(ctx) {", color: "var(--dim)" },
  ]),
  codeLine([
    { text: "    ", color: "var(--signal)" },
    { text: "const ", color: "var(--phosphor)" },
    { text: "{ distance } = ", color: "var(--signal)" },
    { text: "await ", color: "var(--phosphor)" },
    { text: "ctx.read();", color: "var(--signal)" },
  ]),
  codeLine([
    { text: "    ", color: "var(--signal)" },
    { text: "if ", color: "var(--phosphor)" },
    { text: "(distance < ", color: "var(--signal)" },
    { text: "10", color: "var(--phosphor-bright)" },
    { text: ") {", color: "var(--signal)" },
  ]),
  codeLine([
    { text: "      ", color: "var(--signal)" },
    { text: "await ", color: "var(--phosphor)" },
    { text: "ctx.send(", color: "var(--signal)" },
    { text: '"moveBkwd"', color: "var(--phosphor-bright)" },
    { text: ");", color: "var(--signal)" },
  ]),
  codeLine([
    { text: "      ", color: "var(--signal)" },
    { text: "await ", color: "var(--phosphor)" },
    { text: "ctx.send(", color: "var(--signal)" },
    { text: '"turnRight"', color: "var(--phosphor-bright)" },
    { text: ");", color: "var(--signal)" },
  ]),
  codeLine([
    { text: "    } ", color: "var(--signal)" },
    { text: "else ", color: "var(--phosphor)" },
    { text: "{", color: "var(--signal)" },
  ]),
  codeLine([
    { text: "      ", color: "var(--signal)" },
    { text: "await ", color: "var(--phosphor)" },
    { text: "ctx.send(", color: "var(--signal)" },
    { text: '"moveFwd"', color: "var(--phosphor-bright)" },
    { text: ");", color: "var(--signal)" },
  ]),
  codeLine([{ text: "    }", color: "var(--signal)" }]),
  codeLine([{ text: "  }", color: "var(--signal)" }]),
  codeLine([{ text: "};", color: "var(--signal)" }]),
];

interface BotState {
  label: string;
  icon: React.ReactNode;
  detail: string;
}

const botStates: BotState[] = [
  {
    label: "Sensing",
    icon: <BotSensing width={36} height={42} />,
    detail: "distance = 8",
  },
  {
    label: "Reverse",
    icon: <BotMoving width={36} height={42} />,
    detail: "moveBkwd",
  },
  {
    label: "Turn",
    icon: <BotMoving width={36} height={42} />,
    detail: "turnRight",
  },
  {
    label: "Forward",
    icon: <BotIdle width={36} height={42} />,
    detail: "moveFwd",
  },
];

function StateArrowSvg() {
  return (
    <div style={stateArrowStyle}>
      <svg width="24" height="10" viewBox="0 0 24 10" fill="none">
        <line x1="0" y1="5" x2="18" y2="5" stroke="var(--wire-bright)" strokeWidth="1" />
        <path d="M16 2L22 5L16 8" stroke="var(--wire-bright)" strokeWidth="1" fill="none" />
      </svg>
    </div>
  );
}

function BotAnimation() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % botStates.length);
    }, 1600);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      style={animationContainerStyle}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {botStates.map((state, i) => (
        <div key={state.label} style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              ...stateBoxStyle,
              ...(activeIndex === i ? stateBoxActiveStyle : {}),
            }}
          >
            {state.icon}
            <span
              style={{
                ...stateLabelStyle,
                color: activeIndex === i ? "var(--phosphor)" : "var(--signal)",
              }}
            >
              {state.label}
            </span>
            <span
              style={{
                fontSize: "10px",
                fontFamily: "'JetBrains Mono', monospace",
                color: activeIndex === i ? "var(--phosphor-dim)" : "var(--dim-dark)",
              }}
            >
              {state.detail}
            </span>
          </div>
          {i < botStates.length - 1 && <StateArrowSvg />}
        </div>
      ))}
    </motion.div>
  );
}

export default function WritingApps() {
  return (
    <section style={sectionStyle}>
      <motion.p
        style={labelStyle}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        05 &mdash; Writing Apps
      </motion.p>

      <motion.h2
        style={titleStyle}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Your Logic, Your Language
      </motion.h2>

      {/* Main code display */}
      <motion.div
        style={codeDisplayStyle}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <pre style={codePreStyle}>
          {codeLines.map((line, lineIdx) => (
            <span key={lineIdx}>
              {line.map((token, tokenIdx) => (
                <span key={tokenIdx} style={{ color: token.color }}>
                  {token.text}
                </span>
              ))}
              {lineIdx < codeLines.length - 1 ? "\n" : ""}
            </span>
          ))}
        </pre>
      </motion.div>

      {/* Bot state animation */}
      <BotAnimation />

      {/* Idea cards */}
      <div style={ideaCardsRowStyle}>
        <motion.div
          style={ideaCardStyle}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <span style={ideaCardTitleStyle}>ML Gesture Driver</span>
          <span style={ideaCardDescStyle}>
            Use a TensorFlow.js model on the host to classify hand gestures from
            a camera feed. Map recognized gestures to robot actions: open palm
            means stop, fist means forward, wave means turn. The host runs the
            ML inference while the Arduino just executes the resulting commands.
          </span>
        </motion.div>

        <motion.div
          style={ideaCardStyle}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <span style={ideaCardTitleStyle}>Data Logger</span>
          <span style={ideaCardDescStyle}>
            Record every sensor reading to a CSV file on the host machine for
            later analysis. Plot distance readings over time, track motor
            commands, and replay sessions. Because your app is standard Node.js,
            you can write to disk, stream to a database, or push to a cloud API.
          </span>
        </motion.div>
      </div>
    </section>
  );
}
