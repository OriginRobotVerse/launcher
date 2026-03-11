import { motion } from "framer-motion";
import { BotIdle, BotSensing, BotConnected, OriginMark } from "../icons";

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

const stepsContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
};

const stepCardStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--wire)",
  padding: "32px",
  display: "grid",
  gridTemplateColumns: "48px 1fr",
  gap: "24px",
  alignItems: "start",
};

const stepNumberStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 700,
  color: "var(--phosphor)",
  fontFamily: "'JetBrains Mono', monospace",
  lineHeight: 1,
};

const stepContentStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const stepHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const stepTitleStyle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "var(--signal)",
  fontFamily: "'JetBrains Mono', monospace",
};

const codeBlockStyle: React.CSSProperties = {
  background: "var(--panel-raised)",
  border: "1px solid var(--wire)",
  padding: "16px 20px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "12px",
  lineHeight: 1.7,
  whiteSpace: "pre",
  overflowX: "auto",
};

const terminalStyle: React.CSSProperties = {
  ...codeBlockStyle,
  position: "relative",
};

const terminalPromptStyle: React.CSSProperties = {
  color: "var(--dim)",
  userSelect: "none",
};

const terminalCommandStyle: React.CSSProperties = {
  color: "var(--phosphor)",
};

interface CodeToken {
  text: string;
  color: string;
}

const firmwareCode: CodeToken[][] = [
  [
    { text: "#include ", color: "var(--phosphor)" },
    { text: '"origin.h"', color: "var(--phosphor-bright)" },
  ],
  [
    { text: "#include ", color: "var(--phosphor)" },
    { text: '"transports/serial_transport.h"', color: "var(--phosphor-bright)" },
  ],
  [{ text: "", color: "var(--signal)" }],
  [
    { text: "Origin ", color: "var(--phosphor)" },
    { text: "origin;", color: "var(--signal)" },
  ],
  [{ text: "", color: "var(--signal)" }],
  [
    { text: "void ", color: "var(--phosphor)" },
    { text: "setup() {", color: "var(--signal)" },
  ],
  [
    { text: "  origin.", color: "var(--signal)" },
    { text: "setTransport", color: "var(--phosphor)" },
    { text: "(", color: "var(--signal)" },
  ],
  [
    { text: "    ", color: "var(--signal)" },
    { text: "new ", color: "var(--phosphor)" },
    { text: "SerialTransport(", color: "var(--signal)" },
    { text: "9600", color: "var(--phosphor-bright)" },
    { text: ")", color: "var(--signal)" },
  ],
  [{ text: "  );", color: "var(--signal)" }],
  [
    { text: "  origin.", color: "var(--signal)" },
    { text: "registerSensor", color: "var(--phosphor)" },
    { text: "(", color: "var(--signal)" },
  ],
  [
    { text: '    "distance"', color: "var(--phosphor-bright)" },
    { text: ", pins, ", color: "var(--signal)" },
    { text: "2", color: "var(--phosphor-bright)" },
    { text: ", readDistance", color: "var(--signal)" },
  ],
  [{ text: "  );", color: "var(--signal)" }],
  [
    { text: "  origin.", color: "var(--signal)" },
    { text: "registerAction", color: "var(--phosphor)" },
    { text: "(", color: "var(--signal)" },
  ],
  [
    { text: '    "moveFwd"', color: "var(--phosphor-bright)" },
    { text: ", moveFwd", color: "var(--signal)" },
  ],
  [{ text: "  );", color: "var(--signal)" }],
  [{ text: "}", color: "var(--signal)" }],
  [{ text: "", color: "var(--signal)" }],
  [
    { text: "void ", color: "var(--phosphor)" },
    { text: "loop() {", color: "var(--signal)" },
  ],
  [
    { text: "  origin.", color: "var(--signal)" },
    { text: "tick", color: "var(--phosphor)" },
    { text: "();", color: "var(--signal)" },
  ],
  [{ text: "}", color: "var(--signal)" }],
];

const appCode: CodeToken[][] = [
  [
    { text: "const ", color: "var(--phosphor)" },
    { text: "app: ", color: "var(--signal)" },
    { text: "OriginApp ", color: "var(--phosphor)" },
    { text: "= {", color: "var(--signal)" },
  ],
  [
    { text: "  name: ", color: "var(--signal)" },
    { text: '"my-app"', color: "var(--phosphor-bright)" },
    { text: ",", color: "var(--signal)" },
  ],
  [
    { text: "  ", color: "var(--signal)" },
    { text: "async ", color: "var(--phosphor)" },
    { text: "loop(ctx) {", color: "var(--signal)" },
  ],
  [
    { text: "    ", color: "var(--signal)" },
    { text: "const ", color: "var(--phosphor)" },
    { text: "data = ", color: "var(--signal)" },
    { text: "await ", color: "var(--phosphor)" },
    { text: "ctx.read();", color: "var(--signal)" },
  ],
  [
    { text: "    console.", color: "var(--signal)" },
    { text: "log", color: "var(--phosphor)" },
    { text: "(data);", color: "var(--signal)" },
  ],
  [{ text: "  }", color: "var(--signal)" }],
  [{ text: "};", color: "var(--signal)" }],
];

function SyntaxBlock({ lines }: { lines: CodeToken[][] }) {
  return (
    <div style={codeBlockStyle}>
      {lines.map((line, lineIdx) => (
        <span key={lineIdx}>
          {line.map((token, tokenIdx) => (
            <span key={tokenIdx} style={{ color: token.color }}>
              {token.text}
            </span>
          ))}
          {lineIdx < lines.length - 1 ? "\n" : ""}
        </span>
      ))}
    </div>
  );
}

function TerminalIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="4"
        y="6"
        width="32"
        height="28"
        stroke="#E8E8E8"
        strokeWidth="1.5"
        fill="none"
      />
      <line x1="4" y1="12" x2="36" y2="12" stroke="#E8E8E8" strokeWidth="1" />
      <path
        d="M10 18L16 22L10 26"
        stroke="#F59E0B"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="square"
      />
      <line x1="18" y1="26" x2="26" y2="26" stroke="#737373" strokeWidth="1.5" />
    </svg>
  );
}

const installDescStyle: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: 1.7,
  color: "var(--dim)",
};

const installOptionStyle: React.CSSProperties = {
  marginTop: "12px",
  fontSize: "12px",
  color: "var(--dim)",
  fontFamily: "'JetBrains Mono', monospace",
};

const installOptionTitleStyle: React.CSSProperties = {
  color: "var(--signal)",
  fontWeight: 600,
  fontSize: "13px",
  marginBottom: "4px",
};

const steps = [
  {
    number: "0",
    title: "Install the Origin library",
    icon: <OriginMark width={36} height={36} />,
    content: (
      <div>
        <p style={installDescStyle}>
          Copy the firmware SDK into your Arduino libraries folder and install the ArduinoJson dependency.
        </p>

        <div style={{ ...installOptionStyle, marginTop: "16px" }}>
          <div style={installOptionTitleStyle}>Option A: Symlink (recommended for development)</div>
          <div style={terminalStyle}>
            <span style={terminalPromptStyle}>$ </span>
            <span style={terminalCommandStyle}>
              ln -s /path/to/origin/firmware ~/Arduino/libraries/Origin
            </span>
          </div>
        </div>

        <div style={{ ...installOptionStyle, marginTop: "16px" }}>
          <div style={installOptionTitleStyle}>Option B: Copy</div>
          <div style={terminalStyle}>
            <span style={terminalPromptStyle}>$ </span>
            <span style={terminalCommandStyle}>
              cp -r firmware/ ~/Arduino/libraries/Origin
            </span>
          </div>
        </div>

        <div style={{ ...installOptionStyle, marginTop: "16px" }}>
          <div style={installOptionTitleStyle}>Then install ArduinoJson</div>
          <p style={{ color: "var(--dim)", marginTop: "4px" }}>
            Arduino IDE → Sketch → Include Library → Manage Libraries → search{" "}
            <span style={{ color: "var(--phosphor)" }}>"ArduinoJson"</span> → Install
          </p>
        </div>

        <div style={{ ...installOptionStyle, marginTop: "16px" }}>
          <div style={installOptionTitleStyle}>Verify</div>
          <p style={{ color: "var(--dim)", marginTop: "4px" }}>
            Create a new sketch, add{" "}
            <span style={{ color: "var(--phosphor)" }}>#include "origin.h"</span>{" "}
            at the top, and compile. If it builds, you're good.
          </p>
        </div>
      </div>
    ),
  },
  {
    number: "1",
    title: "Flash the firmware",
    icon: <BotIdle width={36} height={42} />,
    content: <SyntaxBlock lines={firmwareCode} />,
  },
  {
    number: "2",
    title: "Install host packages",
    icon: <TerminalIcon />,
    content: (
      <div style={terminalStyle}>
        <span style={terminalPromptStyle}>$ </span>
        <span style={terminalCommandStyle}>cd host && npm install && npm run build --workspaces</span>
      </div>
    ),
  },
  {
    number: "3",
    title: "Write your app",
    icon: <BotSensing width={36} height={42} />,
    content: <SyntaxBlock lines={appCode} />,
  },
  {
    number: "4",
    title: "Run it",
    icon: <BotConnected width={36} height={42} />,
    content: (
      <div style={terminalStyle}>
        <span style={terminalPromptStyle}>$ </span>
        <span style={terminalCommandStyle}>
          npx tsx apps/run.ts --port /dev/ttyUSB0 --app my-app
        </span>
      </div>
    ),
  },
];

export default function QuickStart() {
  return (
    <section style={sectionStyle}>
      <motion.p
        style={labelStyle}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        06 &mdash; Quick Start
      </motion.p>

      <motion.h2
        style={titleStyle}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Up and Running in 5 Steps
      </motion.h2>

      <div style={stepsContainerStyle}>
        {steps.map((step, i) => (
          <motion.div
            key={step.number}
            style={stepCardStyle}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.12 }}
          >
            <span style={stepNumberStyle}>{step.number}</span>
            <div style={stepContentStyle}>
              <div style={stepHeaderStyle}>
                {step.icon}
                <span style={stepTitleStyle}>{step.title}</span>
              </div>
              {step.content}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
