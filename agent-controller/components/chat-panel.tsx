"use client";

import { useState, useRef, useEffect } from "react";
import { useGlove, Render } from "glove-react";
import type { TimelineEntry } from "glove-react";

export function ChatPanel() {
  const glove = useGlove();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [glove.timeline, glove.streamingText, glove.slots]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || glove.busy) return;
    setInput("");
    glove.sendMessage(text);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Messages area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 24px 16px",
        }}
      >
        {glove.timeline.length === 0 && !glove.streamingText && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 16,
              opacity: 0.6,
            }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="var(--wire-bright)" strokeWidth="1.5" />
              <line x1="24" y1="4" x2="24" y2="44" stroke="var(--phosphor)" strokeWidth="1" opacity="0.4" />
              <line x1="4" y1="24" x2="44" y2="24" stroke="var(--phosphor)" strokeWidth="1" opacity="0.4" />
              <circle cx="24" cy="24" r="6" fill="var(--phosphor)" opacity="0.6" />
            </svg>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: "var(--signal)", marginBottom: 8 }}>
                Origin Agent Controller
              </div>
              <div style={{ fontSize: 12, color: "var(--dim)", maxWidth: 360, lineHeight: 1.7 }}>
                Tell me what to do with the toy car. Try &quot;check the sensors&quot;,
                &quot;move forward slowly&quot;, or &quot;explore the room&quot;.
              </div>
            </div>
          </div>
        )}

        <Render
          glove={glove}
          strategy="interleaved"
          renderMessage={({ entry }) => (
            <MessageBubble entry={entry} />
          )}
          renderStreaming={({ text }) => (
            <div className="animate-fade-in" style={{ marginBottom: 16 }}>
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  background: "var(--panel)",
                  borderLeft: "3px solid var(--phosphor)",
                  color: "var(--signal)",
                  fontSize: 13,
                  lineHeight: 1.7,
                  opacity: 0.8,
                  maxWidth: 600,
                }}
              >
                {text}
                <span
                  style={{
                    display: "inline-block",
                    width: 6,
                    height: 14,
                    background: "var(--phosphor)",
                    marginLeft: 2,
                    verticalAlign: "text-bottom",
                  }}
                  className="animate-pulse-dot"
                />
              </div>
            </div>
          )}
          renderToolStatus={({ entry }) => (
            <div
              className="animate-fade-in"
              style={{
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                color: "var(--dim)",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--phosphor)",
                }}
                className="animate-pulse-dot"
              />
              <span style={{ letterSpacing: "0.04em" }}>
                {entry.status === "running"
                  ? `Executing ${entry.name}...`
                  : `${entry.name} ${entry.status}`}
              </span>
            </div>
          )}
          renderInput={() => null}
        />
      </div>

      {/* Input bar */}
      <div
        style={{
          borderTop: "1px solid var(--wire)",
          padding: "16px 24px",
          background: "var(--panel)",
          flexShrink: 0,
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={glove.busy}
            placeholder={
              glove.busy ? "Agent is working..." : 'Tell the car what to do...'
            }
            style={{
              flex: 1,
              background: "var(--panel-raised)",
              border: "1px solid var(--wire)",
              borderRadius: 8,
              padding: "12px 16px",
              color: "var(--signal)",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--phosphor-dim)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--wire)";
            }}
          />
          <button
            type="submit"
            disabled={glove.busy || !input.trim()}
            style={{
              background:
                glove.busy || !input.trim()
                  ? "var(--wire)"
                  : "var(--phosphor)",
              color:
                glove.busy || !input.trim()
                  ? "var(--dim-dark)"
                  : "var(--void)",
              border: "none",
              borderRadius: 8,
              padding: "12px 20px",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "inherit",
              letterSpacing: "0.06em",
              cursor: glove.busy || !input.trim() ? "not-allowed" : "pointer",
              transition: "background 0.2s, color 0.2s",
              flexShrink: 0,
            }}
          >
            SEND
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ entry }: { entry: TimelineEntry }) {
  const isUser = entry.kind === "user";

  if (entry.kind !== "user" && entry.kind !== "agent_text") return null;

  return (
    <div
      className="animate-fade-in"
      style={{
        marginBottom: 16,
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderRadius: 8,
          maxWidth: 600,
          fontSize: 13,
          lineHeight: 1.7,
          ...(isUser
            ? {
                background: "var(--panel-raised)",
                border: "1px solid var(--wire-bright)",
                color: "var(--signal)",
              }
            : {
                background: "var(--panel)",
                borderLeft: "3px solid var(--phosphor)",
                color: "var(--signal)",
              }),
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: isUser ? "var(--dim-dark)" : "var(--phosphor-dim)",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            marginBottom: 6,
          }}
        >
          {isUser ? "You" : "Agent"}
        </div>
        {entry.text}
      </div>
    </div>
  );
}
