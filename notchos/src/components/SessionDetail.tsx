import { invoke } from "@tauri-apps/api/core";
import type { Session } from "../types";

interface Props {
  session: Session;
  onClose: () => void;
}

function relativeTime(ts: number): string {
  const secs = Math.floor(Date.now() / 1000) - ts;
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  return `${Math.floor(secs / 3600)}h`;
}

const STATUS_LABEL: Record<string, string> = {
  running: "RUNNING",
  waiting: "WAITING",
  done: "DONE",
  error: "ERROR",
};

const STATUS_COLOR: Record<string, string> = {
  running: "var(--green)",
  waiting: "var(--amber)",
  done: "var(--text-dim)",
  error: "var(--red)",
};

export function SessionDetail({ session, onClose }: Props) {
  async function handleDismiss() {
    await invoke("dismiss_session", { sessionId: session.id });
    onClose();
  }

  return (
    <div style={{
      padding: "10px 14px 12px",
      borderTop: "1px solid var(--border)",
      animation: "slide-down 0.14s ease",
    }}>
      {/* Session meta */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "10px",
      }}>
        <span style={{
          fontFamily: "var(--mono)",
          fontSize: "10px",
          color: STATUS_COLOR[session.status],
          letterSpacing: "0.08em",
        }}>
          {STATUS_LABEL[session.status]}
        </span>
        <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>
          {relativeTime(session.startedAt)} ago
        </span>
        <span style={{
          marginLeft: "auto",
          fontSize: "9px",
          color: "var(--text-dim)",
          fontFamily: "var(--mono)",
          maxWidth: "160px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {session.id.slice(0, 8)}
        </span>
      </div>

      {/* Last message */}
      {session.lastMessage && (
        <div style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          padding: "7px 9px",
          marginBottom: "10px",
          fontSize: "11px",
          color: "var(--text-secondary)",
          lineHeight: 1.5,
          maxHeight: "60px",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
        }}>
          {session.lastMessage}
        </div>
      )}

      {/* Current tool */}
      {session.currentTool && session.status === "running" && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "10px",
          fontSize: "11px",
          color: "var(--text-dim)",
        }}>
          <span style={{
            width: "5px", height: "5px", borderRadius: "50%",
            background: "var(--green)",
            animation: "pulse-dot 1.8s ease-in-out infinite",
          }} />
          {session.currentTool}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px" }}>
        {session.status === "done" && (
          <button
            onClick={handleDismiss}
            style={{
              padding: "5px 12px",
              background: "transparent",
              border: "1px solid var(--border-bright)",
              borderRadius: "4px",
              color: "var(--text-secondary)",
              fontFamily: "var(--mono)",
              fontSize: "10px",
              cursor: "pointer",
              letterSpacing: "0.06em",
            }}
          >
            DISMISS
          </button>
        )}
        <button
          onClick={onClose}
          style={{
            padding: "5px 12px",
            background: "transparent",
            border: "1px solid transparent",
            borderRadius: "4px",
            color: "var(--text-dim)",
            fontFamily: "var(--mono)",
            fontSize: "10px",
            cursor: "pointer",
            letterSpacing: "0.06em",
            marginLeft: "auto",
          }}
        >
          ESC
        </button>
      </div>
    </div>
  );
}
