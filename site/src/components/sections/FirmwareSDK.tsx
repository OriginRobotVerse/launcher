import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BotSensing, BotSending, BotReceiving, BotMoving } from "../icons";

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

const cardsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "24px",
  marginBottom: "80px",
};

const cardStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--wire)",
  padding: "28px 24px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--signal)",
  fontFamily: "'JetBrains Mono', monospace",
};

const codeBlockStyle: React.CSSProperties = {
  background: "var(--panel-raised)",
  border: "1px solid var(--wire)",
  padding: "16px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "12px",
  lineHeight: 1.7,
  whiteSpace: "pre",
  overflowX: "auto",
};

const cardDescStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--dim)",
  fontFamily: "'JetBrains Mono', monospace",
  lineHeight: 1.6,
};

const pipelineSectionStyle: React.CSSProperties = {
  marginTop: "16px",
};

const pipelineLabelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--signal)",
  fontFamily: "'JetBrains Mono', monospace",
  marginBottom: "32px",
};

const pipelineRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0",
};

const pipelineStepStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "12px",
  padding: "20px 24px",
  border: "1px solid var(--wire)",
  background: "var(--panel)",
  minWidth: "120px",
  transition: "border-color 0.3s, background 0.3s",
};

const pipelineStepActiveStyle: React.CSSProperties = {
  borderColor: "var(--phosphor)",
  background: "var(--phosphor-glow)",
};

const pipelineStepLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 600,
};

const pipelineArrowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "0 4px",
};

interface CodeLine {
  text: string;
  color: string;
}

function SyntaxCode({ lines }: { lines: CodeLine[] }) {
  return (
    <div style={codeBlockStyle}>
      {lines.map((line, i) => (
        <span key={i} style={{ color: line.color }}>
          {line.text}
          {i < lines.length - 1 ? "\n" : ""}
        </span>
      ))}
    </div>
  );
}

const registerSensorCode: CodeLine[] = [
  { text: "origin.registerSensor(", color: "var(--phosphor)" },
  { text: '  "ultrasonic",', color: "var(--signal)" },
  { text: "  pins, 2,", color: "var(--signal)" },
  { text: "  readDistance", color: "var(--signal)" },
  { text: ");", color: "var(--phosphor)" },
];

const registerActionCode: CodeLine[] = [
  { text: "origin.registerAction(", color: "var(--phosphor)" },
  { text: '  "moveFwd",', color: "var(--signal)" },
  { text: "  moveFwd", color: "var(--signal)" },
  { text: ");", color: "var(--phosphor)" },
];

const tickLoopCode: CodeLine[] = [
  { text: "void ", color: "var(--phosphor)" },
  { text: "loop", color: "var(--signal)" },
  { text: "() {", color: "var(--signal)" },
  { text: "  origin.tick();", color: "var(--phosphor)" },
  { text: "}", color: "var(--signal)" },
];

const cards = [
  {
    title: "Register Sensors",
    code: registerSensorCode,
    desc: "Sensors auto-poll every tick. The host always gets fresh readings without requesting them.",
  },
  {
    title: "Register Actions",
    code: registerActionCode,
    desc: "Actions persist until overridden. Send moveFwd once \u2014 motors keep running until the next command.",
  },
  {
    title: "The Tick Loop",
    code: tickLoopCode,
    desc: "One call does everything: poll sensors, send readings, check for actions, execute.",
  },
];

const pipelineSteps = [
  {
    label: "Poll",
    icon: <BotSensing width={32} height={38} />,
  },
  {
    label: "Send",
    icon: <BotSending width={32} height={38} />,
  },
  {
    label: "Receive",
    icon: <BotReceiving width={32} height={38} />,
  },
  {
    label: "Execute",
    icon: <BotMoving width={32} height={38} />,
  },
];

function PipelineArrow() {
  return (
    <div style={pipelineArrowStyle}>
      <svg width="32" height="12" viewBox="0 0 32 12" fill="none">
        <line
          x1="0"
          y1="6"
          x2="26"
          y2="6"
          stroke="var(--wire-bright)"
          strokeWidth="1"
        />
        <path d="M24 2L30 6L24 10" stroke="var(--wire-bright)" strokeWidth="1" fill="none" />
      </svg>
    </div>
  );
}

function TickPipeline() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % pipelineSteps.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      style={pipelineSectionStyle}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div style={pipelineLabelStyle}>tick() internals</div>
      <div style={pipelineRowStyle}>
        {pipelineSteps.map((step, i) => (
          <div key={step.label} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                ...pipelineStepStyle,
                ...(activeIndex === i ? pipelineStepActiveStyle : {}),
              }}
            >
              {step.icon}
              <span
                style={{
                  ...pipelineStepLabelStyle,
                  color:
                    activeIndex === i ? "var(--phosphor)" : "var(--signal)",
                }}
              >
                {step.label}
              </span>
            </div>
            {i < pipelineSteps.length - 1 && <PipelineArrow />}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function FirmwareSDK() {
  return (
    <section style={sectionStyle}>
      <motion.p
        style={labelStyle}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        03 &mdash; Firmware SDK
      </motion.p>

      <motion.h2
        style={titleStyle}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        The Arduino Side
      </motion.h2>

      <motion.p
        style={subtitleStyle}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        Register your hardware, call tick(), done.
      </motion.p>

      <div style={cardsGridStyle}>
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            style={cardStyle}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <span style={cardTitleStyle}>{card.title}</span>
            <SyntaxCode lines={card.code} />
            <span style={cardDescStyle}>{card.desc}</span>
          </motion.div>
        ))}
      </div>

      <TickPipeline />
    </section>
  );
}
