import type { Agent, SessionMetrics } from '../types';
import { StatusOrb } from './shared/StatusOrb';

interface NotchBarProps {
  agents: Agent[];
  metrics: SessionMetrics;
  onHover: () => void;
  onClick: () => void;
}

export function NotchBar({ agents, metrics, onHover, onClick }: NotchBarProps) {
  return (
    <div
      onMouseEnter={onHover}
      onClick={onClick}
      style={{
        width: 200,
        height: 32,
        // External monitor fallback: --bg-surface pill
        // True notch mode would use #000 background
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--stroke)',
        borderRadius: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '0 16px',
        cursor: 'pointer',
      }}
    >
      {/* Agent status orbs — 7px each, orbital frequency pulses */}
      {agents.slice(0, 5).map(agent => (
        <StatusOrb key={agent.id} status={agent.status} size={7} />
      ))}

      {/* Agent count */}
      <span style={{
        fontFamily: 'var(--font-data)',
        fontSize: 8,
        color: 'var(--text-dim)',
      }}>
        {agents.length}
      </span>

      {/* Session cost */}
      <span style={{
        fontFamily: 'var(--font-data)',
        fontSize: 8,
        color: 'var(--text-dim)',
      }}>
        ${metrics.totalCost.toFixed(2)}
      </span>
    </div>
  );
}
