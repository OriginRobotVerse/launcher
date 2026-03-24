import { motion } from "framer-motion";

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

const mainLayoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 360px",
  gap: "48px",
  alignItems: "start",
};

const stackContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0",
};

const layerLabelStyle: React.CSSProperties = {
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--dim)",
  fontFamily: "'JetBrains Mono', monospace",
  marginBottom: "8px",
  marginTop: "24px",
};

const layerBoxStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--wire)",
  padding: "16px 20px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "13px",
  color: "var(--signal)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const layerBoxSubtextStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--dim)",
  fontFamily: "'JetBrains Mono', monospace",
};

const wireConnectorStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px 0",
  position: "relative",
};

const wireLineStyle: React.CSSProperties = {
  width: "1px",
  height: "40px",
  background: "var(--phosphor-dim)",
};

const wireLabelStyle: React.CSSProperties = {
  position: "absolute",
  left: "calc(50% + 16px)",
  fontSize: "10px",
  color: "var(--phosphor)",
  fontFamily: "'JetBrains Mono', monospace",
  whiteSpace: "nowrap",
};

const subBoxRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "0",
};

const subBoxStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--wire)",
  padding: "12px 16px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "12px",
  color: "var(--signal)",
  textAlign: "center",
};

const protocolBoxStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--wire)",
  padding: "24px",
  fontFamily: "'JetBrains Mono', monospace",
};

const protocolTitleStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--signal)",
  marginBottom: "20px",
};

const protocolRowStyle: React.CSSProperties = {
  marginBottom: "16px",
};

const protocolDirectionStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--dim)",
  marginBottom: "6px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const protocolCodeStyle: React.CSSProperties = {
  background: "var(--panel-raised)",
  border: "1px solid var(--wire)",
  padding: "10px 14px",
  fontSize: "11px",
  lineHeight: 1.6,
  whiteSpace: "pre",
};

const hostLayers = [
  {
    name: "Your App",
    sub: "obstacle-avoider.ts",
  },
  {
    name: "originrobot-launcher",
    sub: null,
  },
  {
    name: "originrobot-core",
    sub: "OriginClient",
  },
  {
    name: "Transport",
    sub: "originrobot-transport-serial",
  },
];

const arduinoLayers = [
  {
    name: "Transport",
    sub: "SerialTransport",
  },
  {
    name: "Origin Firmware SDK",
    sub: null,
  },
];

export default function Architecture() {
  return (
    <section style={sectionStyle}>
      <motion.p
        style={labelStyle}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        02 &mdash; Architecture
      </motion.p>

      <motion.h2
        style={titleStyle}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        The Full Picture
      </motion.h2>

      <div style={mainLayoutStyle}>
        {/* Left: layered stack diagram */}
        <div style={stackContainerStyle}>
          {/* Host layers */}
          <motion.span
            style={{ ...layerLabelStyle, marginTop: 0 }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4 }}
          >
            Host (Node.js)
          </motion.span>

          {hostLayers.map((layer, i) => (
            <motion.div
              key={layer.name}
              style={layerBoxStyle}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <span>{layer.name}</span>
              {layer.sub && (
                <span style={layerBoxSubtextStyle}>{layer.sub}</span>
              )}
            </motion.div>
          ))}

          {/* Wire connector */}
          <motion.div
            style={wireConnectorStyle}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <motion.div
              style={wireLineStyle}
              animate={{
                background: [
                  "var(--phosphor-dim)",
                  "var(--phosphor)",
                  "var(--phosphor-dim)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <span style={wireLabelStyle}>
              {`{"action": "...", "params": {...}}`}
            </span>
          </motion.div>

          {/* Arduino layers */}
          <motion.span
            style={layerLabelStyle}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            Arduino (C++)
          </motion.span>

          {arduinoLayers.map((layer, i) => (
            <motion.div
              key={layer.name + "-arduino"}
              style={layerBoxStyle}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: 0.56 + i * 0.08 }}
            >
              <span>{layer.name}</span>
              {layer.sub && (
                <span style={layerBoxSubtextStyle}>{layer.sub}</span>
              )}
            </motion.div>
          ))}

          {/* Sub-boxes for Sensors, Chips, Actions */}
          <motion.div
            style={subBoxRowStyle}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: 0.72 }}
          >
            <div style={subBoxStyle}>Sensors</div>
            <div style={subBoxStyle}>Chips</div>
            <div style={subBoxStyle}>Actions</div>
          </motion.div>
        </div>

        {/* Right: Wire Protocol box */}
        <motion.div
          style={protocolBoxStyle}
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div style={protocolTitleStyle}>Wire Protocol</div>

          <div style={protocolRowStyle}>
            <div style={protocolDirectionStyle}>
              <svg width="12" height="8" viewBox="0 0 12 8">
                <path d="M0 4H10M10 4L7 1M10 4L7 7" stroke="var(--phosphor)" strokeWidth="1" fill="none" />
              </svg>
              <span>Host → Arduino</span>
            </div>
            <div style={{ ...protocolCodeStyle, color: "var(--phosphor)" }}>
              {`{\n  "action": "moveFwd",\n  "params": {\n    "speed": 100\n  }\n}`}
            </div>
          </div>

          <div style={{ ...protocolRowStyle, marginBottom: 0 }}>
            <div style={protocolDirectionStyle}>
              <svg width="12" height="8" viewBox="0 0 12 8">
                <path d="M12 4H2M2 4L5 1M2 4L5 7" stroke="var(--signal)" strokeWidth="1" fill="none" />
              </svg>
              <span>Arduino → Host</span>
            </div>
            <div style={{ ...protocolCodeStyle, color: "var(--signal)" }}>
              {`{\n  "readings": {\n    "distance": 24\n  }\n}`}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
