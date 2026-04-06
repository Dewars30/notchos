import React, { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Session } from "../types";
import { MOD } from '../utils/platform';
import styles from "./ApprovalPanel.module.css";

interface Props {
  session: Session;
  onClose: () => void;
}

function renderToolInput(toolName: string, input: Record<string, unknown>): React.ReactNode {
  switch (toolName) {
    case "Write":
    case "Edit":
    case "MultiEdit": {
      const path = (input.file_path ?? input.path ?? "") as string;
      const content = (input.content ?? input.new_string ?? "") as string;
      return (
        <div className={styles.toolInputText}>
          <div className={styles.toolInputPath}>
            <span className={styles.toolInputArrow}>→</span> {path}
          </div>
          {content && (
            <pre className={styles.toolInputPre}>
              {String(content).slice(0, 800)}{String(content).length > 800 ? "\n…" : ""}
            </pre>
          )}
        </div>
      );
    }
    case "Bash": {
      const cmd = (input.command ?? "") as string;
      return (
        <pre className={styles.toolInputBash}>
          <span className={styles.toolInputPrompt}>$ </span>{cmd}
        </pre>
      );
    }
    default:
      return (
        <pre className={styles.toolInputDefault}>
          {JSON.stringify(input, null, 2)}
        </pre>
      );
  }
}

export function ApprovalPanel({ session, onClose }: Props) {
  const pa = session.pendingApproval;
  if (!pa) return null;

  async function handleApprove() {
    await invoke("approve", { approvalId: pa!.approvalId, reason: null });
    onClose();
  }

  async function handleDeny() {
    await invoke("deny", { approvalId: pa!.approvalId, reason: null });
    onClose();
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "y") { e.preventDefault(); handleApprove(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") { e.preventDefault(); handleDeny(); }
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pa]);

  const AGENT_COLORS: Record<string, string> = {
    claude: "#d97757",
    codex: "#58a6ff",
    gemini: "#4ade80",
  };
  const agentColor = AGENT_COLORS[session.agent] ?? "var(--text-2)";

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.agentLabel} style={{ color: agentColor }}>
          {session.agent.toUpperCase()}
        </span>
        <span className={styles.headerDot}>·</span>
        <span className={styles.toolBadge}>{pa.toolName}</span>
        <span className={styles.escLabel} onClick={onClose}>esc</span>
      </div>

      {/* Tool input preview */}
      <div className={styles.toolPreview}>
        {renderToolInput(pa.toolName, pa.toolInput)}
      </div>

      {/* Action buttons */}
      <div className={styles.actionRow}>
        <button onClick={handleApprove} className={styles.allowButton}>
          ALLOW  <span className={styles.shortcutHint}>{MOD}Y</span>
        </button>
        <button onClick={handleDeny} className={styles.denyButton}>
          DENY  <span className={styles.shortcutHint}>{MOD}N</span>
        </button>
      </div>
    </div>
  );
}
