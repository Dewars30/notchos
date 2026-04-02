import React from "react";
import type { Session } from "../types";

interface Props {
  session: Session;
  isActive: boolean;
  onClick: () => void;
}

const AGENT_LABELS: Record<string, string> = {
  claude: "CC",
  codex: "CX",
  gemini: "GM",
};

const STATUS_COLOR: Record<string, string> = {
  running: "var(--green)",
  waiting: "var(--amber)",
  done: "var(--text-dim)",
  error: "var(--red)",
};

export function AgentPill({ session, isActive, onClick }: Props) {
  const label = AGENT_LABELS[session.agent] ?? session.agent.slice(0, 2).toUpperCase();
  const color = STATUS_COLOR[session.status] ?? "var(--text-dim)";
  const isPulsing = session.status === "running" || session.status === "waiting";

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        background: isActive ? "var(--bg-elevated)" : "transparent",
        border: `1px solid ${isActive ? "var(--border-bright)" : "transparent"}`,
        borderRadius: "6px",
        cursor: "pointer",
        transition: "all 0.12s ease",
      }}
    >
      {/* Status dot */}
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
          animation: isPulsing ? "pulse-dot 1.8s ease-in-out infinite" : "none",
          boxShadow: session.status === "waiting"
            ? `0 0 6px ${color}`
            : session.status === "running"
            ? `0 0 4px ${color}60`
            : "none",
        }}
      />

      {/* Agent label */}
      <span style={{
        fontSize: "11px",
        fontFamily: "var(--mono)",
        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
        letterSpacing: "0.08em",
        fontWeight: 500,
      }}>
        {label}
      </span>

      {/* Tool/status hint */}
      {session.currentTool && session.status !== "done" && (
        <span style={{
          fontSize: "10px",
          color: "var(--text-dim)",
          maxWidth: "80px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {session.currentTool.toLowerCase()}
        </span>
      )}

      {session.status === "waiting" && (
        <span style={{
          fontSize: "9px",
          color: "var(--amber)",
          background: "var(--amber-dim)",
          padding: "1px 5px",
          borderRadius: "3px",
          letterSpacing: "0.06em",
        }}>
          WAIT
        </span>
      )}

      {session.status === "done" && (
        <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>✓</span>
      )}
    </button>
  );
}
