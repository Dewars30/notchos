import type { Session } from "../types";
import styles from "./AgentPill.module.css";

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
  running: "var(--ripple)",
  waiting: "var(--gold)",
  done: "var(--text-dim)",
  error: "var(--coral)",
};

export function AgentPill({ session, isActive, onClick }: Props) {
  const label = AGENT_LABELS[session.agent] ?? session.agent.slice(0, 2).toUpperCase();
  const color = STATUS_COLOR[session.status] ?? "var(--text-dim)";
  const isPulsing = session.status === "running" || session.status === "waiting";

  return (
    <button
      onClick={onClick}
      className={isActive ? styles.pillActive : styles.pill}
    >
      {/* Status dot — background color and animation are dynamic */}
      <span
        className={styles.dot}
        style={{
          background: color,
          animation: isPulsing ? "pulse-dot 1.8s ease-in-out infinite" : "none",
          boxShadow: session.status === "waiting"
            ? `0 0 6px ${color}`
            : session.status === "running"
            ? `0 0 4px ${color}60`
            : "none",
        }}
      />

      {/* Agent label — text color is dynamic based on isActive */}
      <span
        className={styles.agentLabel}
        style={{ color: isActive ? "var(--text-1)" : "var(--text-2)" }}
      >
        {label}
      </span>

      {/* Tool/status hint */}
      {session.currentTool && session.status !== "done" && (
        <span className={styles.toolHint}>
          {session.currentTool.toLowerCase()}
        </span>
      )}

      {session.status === "waiting" && (
        <span className={styles.waitBadge}>WAIT</span>
      )}

      {session.status === "done" && (
        <span className={styles.doneMark}>✓</span>
      )}
    </button>
  );
}
