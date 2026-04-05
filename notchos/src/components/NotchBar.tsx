import type { Agent, SessionMetrics } from '../types';
import { StatusOrb } from './shared/StatusOrb';
import styles from './NotchBar.module.css';

interface NotchBarProps {
  agents: Agent[];
  metrics: SessionMetrics;
  onHover: () => void;
  onClick: () => void;
  hasPending?: boolean;
  hasHighRisk?: boolean;
}

export function NotchBar({ agents, metrics, onHover, onClick, hasPending, hasHighRisk }: NotchBarProps) {
  const hasAgents = agents.length > 0;
  const hasActiveWork = agents.some(a => a.status === 'writing' || a.status === 'executing');

  const containerClass = hasHighRisk ? styles.containerHighRisk
    : hasPending ? styles.containerPending : styles.container;

  return (
    <div className={containerClass} onMouseEnter={onHover} onClick={onClick}>
      <span className={styles.npMark}>NP</span>

      {agents.slice(0, 5).map(agent => (
        <StatusOrb key={agent.id} status={agent.status} size={7} layoutId={`orb-${agent.id}`} />
      ))}

      <span className={styles.agentCount} style={{ color: hasAgents ? 'var(--text-2)' : 'var(--text-3)' }}>
        {hasAgents ? `${agents.length} agent${agents.length !== 1 ? 's' : ''}` : <span className={styles.emptyLabel}>listening</span>}
      </span>

      {metrics.totalCost > 0 && (
        <span className={styles.cost}>${metrics.totalCost.toFixed(2)}</span>
      )}

      {hasActiveWork && <span className={styles.activityBar} />}
    </div>
  );
}
