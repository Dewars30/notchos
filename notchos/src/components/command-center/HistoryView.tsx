import { useState, useEffect, useCallback } from 'react';
import { ZoneLabel } from '../shared/ZoneLabel';

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
    <div style={{
      gridArea: 'center',
      display: 'flex',
      flexDirection: 'column',
      padding: 12,
      overflow: 'auto',
      position: 'relative',
      zIndex: 1,
    }}>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <ZoneLabel>HISTORY</ZoneLabel>
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'var(--text-dim)' }}>
          {sessions.length} sessions
        </span>
      </div>

      {/* Search bar */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search by agent, project, session..."
        style={{
          fontFamily: 'var(--font-data)',
          fontSize: 9,
          color: 'var(--text-1)',
          background: 'var(--bg-surface)',
          border: '0.5px solid var(--stroke)',
          borderRadius: 4,
          padding: '4px 8px',
          marginBottom: 8,
          width: '100%',
        }}
      />

      {/* Session list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sessions.length === 0 && (
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 9, color: 'var(--text-dim)', padding: 8 }}>
            {isTauri ? 'No sessions recorded yet' : 'History available in Tauri mode'}
          </span>
        )}

        {sessions.map(session => (
          <div key={session.id}>
            <button
              onClick={() => toggleSession(session.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 6px',
                background: expandedSession === session.id ? 'var(--bg-elevated)' : 'transparent',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {/* Agent color dot */}
              <span style={{
                width: 4, height: 4, borderRadius: '50%', flexShrink: 0,
                background: AGENT_COLORS[session.agent] ?? 'var(--text-3)',
              }} />

              {/* Agent name + cwd */}
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-1)', flex: 1 }}>
                {session.agent}
                {session.cwd && (
                  <span style={{ color: 'var(--text-3)', marginLeft: 4 }}>
                    {session.cwd.split('/').slice(-2).join('/')}
                  </span>
                )}
              </span>

              {/* Duration */}
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'var(--text-3)' }}>
                {formatDuration(session.startedAt, session.endedAt)}
              </span>

              {/* Event count */}
              <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, color: 'var(--text-dim)' }}>
                {session.eventCount} events
              </span>

              {/* Status badge */}
              <span style={{
                fontFamily: 'var(--font-label)', fontSize: 7,
                color: session.status === 'done' ? 'var(--teal)' : session.status === 'error' ? 'var(--coral)' : 'var(--gold)',
                letterSpacing: '0.06em',
              }}>
                {session.status.toUpperCase()}
              </span>
            </button>

            {/* Expanded events */}
            {expandedSession === session.id && events.length > 0 && (
              <div style={{
                marginLeft: 16, padding: '4px 0',
                borderLeft: '0.5px solid var(--border-subtle)',
                paddingLeft: 8,
              }}>
                {events.map(evt => (
                  <div key={evt.id} style={{
                    fontFamily: 'var(--font-data)', fontSize: 8,
                    color: 'var(--text-3)', padding: '1px 0',
                    display: 'flex', gap: 8,
                  }}>
                    <span style={{ color: 'var(--text-dim)', width: 40, flexShrink: 0 }}>
                      {new Date(evt.timestamp * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span style={{
                      color: evt.riskTier === 'high' ? 'var(--coral)' : evt.riskTier === 'medium' ? 'var(--gold)' : 'var(--text-3)',
                    }}>
                      {evt.eventType}
                    </span>
                    {evt.toolName && <span style={{ color: 'var(--text-2)' }}>{evt.toolName}</span>}
                    {evt.summary && <span style={{ color: 'var(--text-dim)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.summary}</span>}
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
