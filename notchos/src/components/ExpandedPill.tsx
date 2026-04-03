import type { Agent, AgentStatus, SessionMetrics } from '../types';
import { StatusOrb } from './shared/StatusOrb';

interface ExpandedPillProps {
  agents: Agent[];
  metrics: SessionMetrics;
  onSelectAgent: (id: string) => void;
  onExpandFull: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: 'var(--teal)',
  writing: 'var(--gold)',
  waiting: 'var(--steel)',
  executing: 'var(--ripple)',
  error: 'var(--coral)',
};

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function AgentRow({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const hasPending = agent.pendingApproval !== null;

  return (
    <button
      role="menuitem"
      onClick={onClick}
      style={{
        width: '100%',
        height: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 4px',
        background: 'transparent',
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
        transition: 'background 100ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Status orb — 5px */}
      <StatusOrb status={agent.status} size={5} />

      {/* Agent name — Sora 11px/500 */}
      <span style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--text-1)',
        whiteSpace: 'nowrap',
      }}>
        {agent.name}
      </span>

      {/* Meta — B612 Mono 9px: model · status · elapsed */}
      <span style={{
        fontFamily: 'var(--font-data)',
        fontSize: 9,
        color: 'var(--text-3)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        flex: 1,
        textAlign: 'left',
      }}>
        {agent.model} · {agent.status} · {formatElapsed(agent.elapsedSeconds)}
      </span>

      {/* Cost — B612 Mono 9px */}
      <span style={{
        fontFamily: 'var(--font-data)',
        fontSize: 9,
        color: hasPending ? STATUS_COLORS[agent.status] : 'var(--text-3)',
        whiteSpace: 'nowrap',
      }}>
        ${agent.cost.toFixed(2)}
      </span>

      {/* Pending badge — Departure Mono 8px, gold tint */}
      {hasPending && (
        <span style={{
          fontFamily: 'var(--font-label)',
          fontSize: 8,
          color: 'var(--gold)',
          background: 'var(--gold-dim)',
          border: '0.5px solid var(--gold-border)',
          borderRadius: 3,
          padding: '1px 5px',
          letterSpacing: '0.06em',
          flexShrink: 0,
        }}>
          PENDING
        </span>
      )}
    </button>
  );
}

export function ExpandedPill({
  agents,
  metrics,
  onSelectAgent,
  onExpandFull,
  onMouseEnter,
  onMouseLeave,
}: ExpandedPillProps) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        width: 380,
        background: 'var(--bg-base)',
        border: '0.5px solid var(--stroke)',
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        animation: 'slide-down 120ms var(--ease-out)',
        overflow: 'hidden',
      }}
    >
      {/* Agent rows — 28px each, 2px gap */}
      <div role="menu" style={{
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        {agents.map(agent => (
          <AgentRow
            key={agent.id}
            agent={agent}
            onClick={() => onSelectAgent(agent.id)}
          />
        ))}
      </div>

      {/* Footer — session summary + keyboard hint */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px 8px',
        borderTop: '0.5px solid var(--bg-surface)',
      }}>
        <span style={{
          fontFamily: 'var(--font-data)',
          fontSize: 9,
          color: 'var(--text-3)',
        }}>
          {agents.length} agents · ${metrics.totalCost.toFixed(2)}
        </span>
        <button
          onClick={onExpandFull}
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: 9,
            color: 'var(--teal)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
          }}
        >
          ⌘⇧N
        </button>
      </div>
    </div>
  );
}
