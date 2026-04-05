import { useState, useEffect, useCallback } from 'react';
import { ZoneLabel } from '../shared/ZoneLabel';
import styles from './HistoryView.module.css';

const isTauri = '__TAURI_INTERNALS__' in window;

interface HistorySession {
  id: string;
  agent: string;
  cwd: string | null;
  startedAt: number;
  endedAt: number | null;
  status: string;
  eventCount: number;
}

interface HistoryEvent {
  id: number;
  sessionId: string;
  timestamp: number;
  eventType: string;
  toolName: string | null;
  riskTier: string | null;
  summary: string | null;
}

const AGENT_COLORS: Record<string, string> = {
  claude: 'var(--teal)',
  codex: 'var(--gold)',
  gemini: 'var(--steel)',
};

function formatDuration(start: number, end: number | null): string {
  const seconds = (end ?? Math.floor(Date.now() / 1000)) - start;
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function HistoryView() {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [events, setEvents] = useState<HistoryEvent[]>([]);

  const loadSessions = useCallback(async () => {
    if (!isTauri) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = searchQuery
        ? await invoke<HistorySession[]>('search_history', { query: searchQuery })
        : await invoke<HistorySession[]>('get_history_sessions', { limit: 50 });
      setSessions(result);
    } catch (e) {
      console.error('[HistoryView] load failed:', e);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const loadEvents = useCallback(async (sessionId: string) => {
    if (!isTauri) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<HistoryEvent[]>('get_session_events', { sessionId });
      setEvents(result);
    } catch (e) {
      console.error('[HistoryView] events load failed:', e);
    }
  }, []);

  function toggleSession(sessionId: string) {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      setEvents([]);
    } else {
      setExpandedSession(sessionId);
      loadEvents(sessionId);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <ZoneLabel>HISTORY</ZoneLabel>
        <span className={styles.sessionCount}>
          {sessions.length} sessions
        </span>
      </div>

      {/* Search bar */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search by agent, project, session..."
        className={styles.searchInput}
      />

      {/* Session list */}
      <div className={styles.sessionList}>
        {sessions.length === 0 && (
          <span className={styles.emptyMessage}>
            {isTauri ? 'No sessions recorded yet' : 'History available in Tauri mode'}
          </span>
        )}

        {sessions.map(session => (
          <div key={session.id}>
            <button
              onClick={() => toggleSession(session.id)}
              className={expandedSession === session.id ? styles.sessionButtonExpanded : styles.sessionButton}
            >
              {/* Agent color dot — background is dynamic */}
              <span
                className={styles.agentDot}
                style={{ background: AGENT_COLORS[session.agent] ?? 'var(--text-3)' }}
              />

              {/* Agent name + cwd */}
              <span className={styles.agentName}>
                {session.agent}
                {session.cwd && (
                  <span className={styles.agentCwd}>
                    {session.cwd.split('/').slice(-2).join('/')}
                  </span>
                )}
              </span>

              {/* Duration */}
              <span className={styles.sessionDuration}>
                {formatDuration(session.startedAt, session.endedAt)}
              </span>

              {/* Event count */}
              <span className={styles.sessionEventCount}>
                {session.eventCount} events
              </span>

              {/* Status badge — color is dynamic */}
              <span
                className={styles.statusBadge}
                style={{
                  color: session.status === 'done' ? 'var(--teal)' : session.status === 'error' ? 'var(--coral)' : 'var(--gold)',
                }}
              >
                {session.status.toUpperCase()}
              </span>
            </button>

            {/* Expanded events */}
            {expandedSession === session.id && events.length > 0 && (
              <div className={styles.eventsContainer}>
                {events.map(evt => (
                  <div key={evt.id} className={styles.eventRow}>
                    <span className={styles.eventTime}>
                      {new Date(evt.timestamp * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    {/* eventType color is dynamic per riskTier */}
                    <span style={{
                      color: evt.riskTier === 'high' ? 'var(--coral)' : evt.riskTier === 'medium' ? 'var(--gold)' : 'var(--text-3)',
                    }}>
                      {evt.eventType}
                    </span>
                    {evt.toolName && <span className={styles.eventTool}>{evt.toolName}</span>}
                    {evt.summary && <span className={styles.eventSummary}>{evt.summary}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
