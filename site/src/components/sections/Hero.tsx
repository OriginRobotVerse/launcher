import { motion } from "framer-motion";
import { OriginMark } from "../icons";

const sectionStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  padding: "120px 24px",
  overflow: "hidden",
  backgroundImage: `
    linear-gradient(to right, var(--wire) 1px, transparent 1px),
    linear-gradient(to bottom, var(--wire) 1px, transparent 1px)
  `,
  backgroundSize: "64px 64px",
  backgroundPosition: "center center",
};

const gridOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: `
    linear-gradient(to right, var(--wire) 1px, transparent 1px),
    linear-gradient(to bottom, var(--wire) 1px, transparent 1px)
  `,
  backgroundSize: "64px 64px",
  backgroundPosition: "center center",
  opacity: 0.04,
  pointerEvents: "none",
};

const contentStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "24px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "48px",
  fontWeight: 700,
  color: "var(--signal)",
  fontFamily: "'JetBrains Mono', monospace",
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "16px",
  color: "var(--dim)",
  fontFamily: "'JetBrains Mono', monospace",
  textAlign: "center",
  maxWidth: "480px",
};

const chevronContainerStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "40px",
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "2px",
};

export default function Hero() {
  return (
    <section style={sectionStyle}>
      <div style={gridOverlayStyle} />

      <div style={contentStyle}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ position: "relative" }}
        >
          <motion.div
            animate={{
              boxShadow: [
                "0 0 40px 8px var(--phosphor-glow)",
                "0 0 60px 16px var(--phosphor-glow-strong)",
                "0 0 40px 8px var(--phosphor-glow)",
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              inset: "-20px",
              pointerEvents: "none",
            }}
          />
          <OriginMark width={120} height={120} />
        </motion.div>

        <motion.h1
          style={titleStyle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          origin
        </motion.h1>

        <motion.p
          style={subtitleStyle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
        >
          The zero point between hardware and code
        </motion.p>
      </div>

      <div style={chevronContainerStyle}>
        <motion.svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          animate={{ y: [0, 6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M6 9L12 15L18 9"
            stroke="var(--dim)"
            strokeWidth="1.5"
            strokeLinecap="square"
          />
        </motion.svg>
        <motion.svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          animate={{ y: [0, 6, 0], opacity: [0.2, 0.6, 0.2] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.15,
          }}
        >
          <path
            d="M6 9L12 15L18 9"
            stroke="var(--dim)"
            strokeWidth="1.5"
            strokeLinecap="square"
          />
        </motion.svg>
      </div>
    </section>
  );
}
