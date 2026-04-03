import React, { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Session } from "../types";

interface Props {
  session: Session;
  onClose: () => void;
}

function renderToolInput(toolName: string, input: Record<string, unknown>): React.ReactNode {
  const style: React.CSSProperties = {
    fontFamily: "var(--mono)",
    fontSize: "11px",
    color: "var(--text-primary)",
    lineHeight: 1.6,
  };

  switch (toolName) {
    case "Write":
    case "Edit":
    case "MultiEdit": {
      const path = (input.file_path ?? input.path ?? "") as string;
      const content = (input.content ?? input.new_string ?? "") as string;
      return (
        <div style={style}>
          <div style={{ color: "var(--text-secondary)", marginBottom: "6px" }}>
            <span style={{ color: "var(--amber)" }}>→</span> {path}
          </div>
          {content && (
            <pre style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              padding: "8px",
              maxHeight: "140px",
              overflow: "auto",
              fontSize: "10.5px",
              color: "var(--text-secondary)",
            }}>
              {String(content).slice(0, 800)}{String(content).length > 800 ? "\n…" : ""}
            </pre>
          )}
        </div>
      );
    }
    case "Bash": {
      const cmd = (input.command ?? "") as string;
      return (
        <pre style={{
          ...style,
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          padding: "8px",
          color: "var(--green)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}>
          <span style={{ color: "var(--text-dim)" }}>$ </span>{cmd}
        </pre>
      );
    }
    default:
      return (
        <pre style={{
          ...style,
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          padding: "8px",
          fontSize: "10px",
          color: "var(--text-secondary)",
          maxHeight: "120px",
          overflow: "auto",
          whiteSpace: "pre-wrap",
        }}>
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
  const agentColor = AGENT_COLORS[session.agent] ?? "var(--text-secondary)";

  return (
    <div style={{
      padding: "10px 14px 12px",
      borderTop: "1px solid var(--border)",
      animation: "slide-down 0.14s ease",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "10px",
      }}>
        <span style={{
          fontSize: "10px",
          letterSpacing: "0.1em",
          color: agentColor,
          fontWeight: 500,
        }}>
          {session.agent.toUpperCase()}
        </span>
        <span style={{ color: "var(--border-bright)", fontSize: "11px" }}>·</span>
        <span style={{
          fontSize: "11px",
          color: "var(--amber)",
          background: "var(--amber-dim)",
          padding: "1px 6px",
          borderRadius: "3px",
          letterSpacing: "0.06em",
        }}>
          {pa.toolName}
        </span>
        <span style={{
          marginLeft: "auto",
          fontSize: "10px",
          color: "var(--text-dim)",
          cursor: "pointer",
        }} onClick={onClose}>
          esc
        </span>
      </div>

      {/* Tool input preview */}
      <div style={{ marginBottom: "12px" }}>
        {renderToolInput(pa.toolName, pa.toolInput)}
      </div>

      {/* Action buttons */}
      <div style={{
        display: "flex",
        gap: "8px",
        alignItems: "center",
      }}>
        <button
          onClick={handleApprove}
          style={{
            flex: 1,
            padding: "7px",
            background: "var(--green-dim)",
            border: "1px solid var(--green)",
            borderRadius: "5px",
            color: "var(--green)",
            fontFamily: "var(--mono)",
            fontSize: "11px",
            letterSpacing: "0.08em",
            cursor: "pointer",
            fontWeight: 500,
            transition: "all 0.1s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--green-glow)")}
          onMouseLeave={e => (e.currentTarget.style.background = "var(--green-dim)")}
        >
          ALLOW  <span style={{ opacity: 0.5, fontSize: "10px" }}>⌘Y</span>
        </button>

        <button
          onClick={handleDeny}
          style={{
            flex: 1,
            padding: "7px",
            background: "var(--red-dim)",
            border: "1px solid var(--red)",
            borderRadius: "5px",
            color: "var(--red)",
            fontFamily: "var(--mono)",
            fontSize: "11px",
            letterSpacing: "0.08em",
            cursor: "pointer",
            fontWeight: 500,
            transition: "all 0.1s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(240,80,80,0.3)")}
          onMouseLeave={e => (e.currentTarget.style.background = "var(--red-dim)")}
        >
          DENY  <span style={{ opacity: 0.5, fontSize: "10px" }}>⌘N</span>
        </button>
      </div>
    </div>
  );
}
