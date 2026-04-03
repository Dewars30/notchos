import type { Agent, AgentStatus } from '../../types';
import { StatusOrb } from '../shared/StatusOrb';
import { ZoneLabel } from '../shared/ZoneLabel';

interface AgentRosterProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
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

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

export function AgentRoster({ agents, selectedAgentId, onSelectAgent }: AgentRosterProps) {
  const totalCost = agents.reduce((sum, a) => sum + a.cost, 0);

  return (
    <div style={{
      gridArea: 'agents',
      display: 'flex',
      flexDirection: 'column',
      padding: 12,
      borderRight: '0.5px solid var(--bg-elevated)',
      position: 'relative',
      zIndex: 1,
      overflow: 'hidden',
    }}>
      <ZoneLabel>AGENTS</ZoneLabel>

      <div style={{
        marginTop: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        flex: 1,
      }}>
        {agents.map(agent => {
          const isSelected = agent.id === selectedAgentId;
          return (
            <button
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                padding: '6px 4px',
                background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 100ms',
              }}
            >
              {/* Name row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <StatusOrb status={agent.status} size={5} />
                <span style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 10,
                  fontWeight: 500,
                  color: isSelected ? STATUS_COLORS[agent.status] : 'var(--text-1)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}>
                  {agent.name}
                </span>
              </div>

              {/* Meta row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingLeft: 21, /* orb container (17px) + gap (4px) */
              }}>
                <span style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: 8,
                  color: 'var(--text-3)',
                }}>
                  {agent.model} · {agent.status} · {formatElapsed(agent.elapsedSeconds)}
                </span>
                <span style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: 8,
                  color: 'var(--text-3)',
                }}>
                  {formatCost(agent.cost)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Session total */}
      <div style={{
        borderTop: '0.5px solid var(--border-subtle)',
        paddingTop: 8,
        marginTop: 'auto',
      }}>
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text-1)',
        }}>
          {formatCost(totalCost)}
        </span>
      </div>
    </div>
  );
}
