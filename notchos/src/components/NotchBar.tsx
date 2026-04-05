import type { Agent, SessionMetrics } from '../types';
import { StatusOrb } from './shared/StatusOrb';

interface NotchBarProps {
  agents: Agent[];
  metrics: SessionMetrics;
  onHover: () => void;
  onClick: () => void;
}

export function NotchBar({ agents, metrics, onHover, onClick }: NotchBarProps) {
  const hasAgents = agents.length > 0;

  return (
    <div
      onMouseEnter={onHover}
      onClick={onClick}
      style={{
        width: '100%',
        height: '100%',
        background: '#000000',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '0 20px',
        cursor: 'pointer',
      }}
    >
      {/* NP mark */}
      <span style={{
        fontFamily: 'var(--font-label)',
        fontSize: 11,
        color: 'var(--text-3)',
        letterSpacing: '0.06em',
      }}>
        NP
      </span>

      {/* Agent status orbs */}
      {agents.slice(0, 5).map(agent => (
        <StatusOrb key={agent.id} status={agent.status} size={7} />
      ))}

      {/* Agent count + status */}
      <span style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        color: hasAgents ? 'var(--text-2)' : 'var(--text-3)',
      }}>
        {hasAgents ? `${agents.length} agent${agents.length !== 1 ? 's' : ''}` : 'No agents'}
      </span>

      {/* Session cost — only show if non-zero */}
      {metrics.totalCost > 0 && (
        <span style={{
          fontFamily: 'var(--font-data)',
          fontSize: 10,
          color: 'var(--text-3)',
        }}>
          ${metrics.totalCost.toFixed(2)}
        </span>
      )}
    </div>
  );
}
