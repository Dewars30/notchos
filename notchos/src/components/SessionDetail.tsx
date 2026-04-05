import { invoke } from "@tauri-apps/api/core";
import type { Session } from "../types";
import styles from "./SessionDetail.module.css";

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
  running: "var(--ripple)",
  waiting: "var(--gold)",
  done: "var(--text-dim)",
  error: "var(--coral)",
};

export function SessionDetail({ session, onClose }: Props) {
  async function handleDismiss() {
    await invoke("dismiss_session", { sessionId: session.id });
    onClose();
  }

  return (
    <div className={styles.root}>
      {/* Session meta */}
      <div className={styles.metaRow}>
        <span
          className={styles.statusLabel}
          style={{ color: STATUS_COLOR[session.status] }}
        >
          {STATUS_LABEL[session.status]}
        </span>
        <span className={styles.timeAgo}>{relativeTime(session.startedAt)} ago</span>
        <span className={styles.sessionId}>{session.id.slice(0, 8)}</span>
      </div>

      {/* Last message */}
      {session.lastMessage && (
        <div className={styles.lastMessage}>
          {session.lastMessage}
        </div>
      )}

      {/* Current tool */}
      {session.currentTool && session.status === "running" && (
        <div className={styles.currentTool}>
          <span className={styles.pulseDot} />
          {session.currentTool}
        </div>
      )}

      {/* Actions */}
      <div className={styles.actionRow}>
        {session.status === "done" && (
          <button onClick={handleDismiss} className={styles.dismissButton}>
            DISMISS
          </button>
        )}
        <button onClick={onClose} className={styles.escButton}>
          ESC
        </button>
      </div>
    </div>
  );
}
