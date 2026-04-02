import React, { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Session } from "./types";
import { AgentPill } from "./components/AgentPill";
import { ApprovalPanel } from "./components/ApprovalPanel";
import { SessionDetail } from "./components/SessionDetail";

type PanelMode = "none" | "approval" | "detail";

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("none");

  const fetchSessions = useCallback(async () => {
    try {
      const result = await invoke<Session[]>("get_sessions");
      setSessions(result);

      // Auto-surface approval panels
      const waiting = result.find(s => s.status === "waiting" && s.pendingApproval);
      if (waiting && panelMode !== "approval") {
        setActiveSession(waiting);
        setPanelMode("approval");
      }
    } catch (e) {
      console.error("get_sessions error", e);
    }
  }, [panelMode]);

  useEffect(() => {
    fetchSessions();

    const unlisten = listen("sessions_updated", () => {
      fetchSessions();
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [fetchSessions]);

  // Resize window based on panel state
  useEffect(() => {
    const height = panelMode === "none" ? 72 : panelMode === "approval" ? 320 : 200;
    invoke("set_window_height", { height }).catch(() => {});
  }, [panelMode]);

  function handlePillClick(session: Session) {
    if (activeSession?.id === session.id && panelMode !== "none") {
      // Toggle closed
      setActiveSession(null);
      setPanelMode("none");
      return;
    }
    setActiveSession(session);
    if (session.pendingApproval) {
      setPanelMode("approval");
    } else {
      setPanelMode("detail");
    }
  }

  function closePanel() {
    setActiveSession(null);
    setPanelMode("none");
  }

  const hasWaiting = sessions.some(s => s.status === "waiting");
  const allDone = sessions.length > 0 && sessions.every(s => s.status === "done");
  const isEmpty = sessions.length === 0;

  return (
    <div style={{
      width: "100%",
      height: "100%",
      background: "var(--bg)",
      border: "1px solid var(--border)",
      borderRadius: "10px",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset",
    }}>
      {/* ── Main bar ── */}
      <div
        data-tauri-drag-region
        style={{
          height: "72px",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: "4px",
          flexShrink: 0,
          position: "relative",
        }}
      >
        {/* Logo / name */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          marginRight: "8px",
          paddingRight: "10px",
          borderRight: "1px solid var(--border)",
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="14" height="14" rx="3" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            <circle cx="5" cy="8" r="1.5" fill="var(--green)" opacity="0.9"/>
            <circle cx="8" cy="8" r="1.5" fill="var(--amber)" opacity="0.9"/>
            <circle cx="11" cy="8" r="1.5" fill="var(--blue)" opacity="0.9"/>
          </svg>
          <span style={{
            fontSize: "11px",
            fontFamily: "var(--mono)",
            color: "var(--text-dim)",
            letterSpacing: "0.06em",
          }}>
            NP
          </span>
        </div>

        {/* Session pills */}
        {isEmpty && (
          <span style={{
            fontSize: "11px",
            fontFamily: "var(--mono)",
            color: "var(--text-dim)",
            letterSpacing: "0.04em",
            padding: "0 4px",
          }}>
            no active agents
          </span>
        )}

        {sessions.map(s => (
          <AgentPill
            key={s.id}
            session={s}
            isActive={activeSession?.id === s.id}
            onClick={() => handlePillClick(s)}
          />
        ))}

        {/* Right side status */}
        <div style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}>
          {hasWaiting && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              background: "var(--amber-dim)",
              border: "1px solid rgba(240,160,32,0.3)",
              borderRadius: "5px",
              padding: "3px 8px",
            }}>
              <span style={{
                width: "5px", height: "5px", borderRadius: "50%",
                background: "var(--amber)",
                animation: "pulse-dot 1s ease-in-out infinite",
                boxShadow: "0 0 6px var(--amber)",
              }} />
              <span style={{
                fontSize: "10px",
                color: "var(--amber)",
                fontFamily: "var(--mono)",
                letterSpacing: "0.08em",
              }}>
                APPROVAL
              </span>
            </div>
          )}

          {allDone && (
            <span style={{
              fontSize: "10px",
              color: "var(--green)",
              fontFamily: "var(--mono)",
              letterSpacing: "0.08em",
              opacity: 0.7,
            }}>
              ALL DONE
            </span>
          )}

          {/* Session count */}
          {sessions.length > 0 && (
            <span style={{
              fontSize: "10px",
              color: "var(--text-dim)",
              fontFamily: "var(--mono)",
              minWidth: "14px",
              textAlign: "right",
            }}>
              {sessions.filter(s => s.status !== "done").length}/{sessions.length}
            </span>
          )}
        </div>
      </div>

      {/* ── Expanded panel ── */}
      {panelMode === "approval" && activeSession?.pendingApproval && (
        <ApprovalPanel session={activeSession} onClose={closePanel} />
      )}

      {panelMode === "detail" && activeSession && (
        <SessionDetail session={activeSession} onClose={closePanel} />
      )}
    </div>
  );
}
