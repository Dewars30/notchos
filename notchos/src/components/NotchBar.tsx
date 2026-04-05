import { motion } from 'framer-motion';
import type { Agent, SessionMetrics } from '../types';
import { StatusOrb } from './shared/StatusOrb';
import styles from './NotchBar.module.css';

interface NotchBarProps {
  agents: Agent[];
  metrics: SessionMetrics;
  onHover: () => void;
  onClick: () => void;
}

export function NotchBar({ agents, metrics, onHover, onClick }: NotchBarProps) {
  const hasAgents = agents.length > 0;

  return (
    <div className={styles.container} onMouseEnter={onHover} onClick={onClick}>
      <motion.span layoutId="np-mark" className={styles.npMark}>NP</motion.span>

      {agents.slice(0, 5).map(agent => (
        <StatusOrb key={agent.id} status={agent.status} size={7} layoutId={`orb-${agent.id}`} />
      ))}

      <span className={styles.agentCount} style={{ color: hasAgents ? 'var(--text-2)' : 'var(--text-3)' }}>
        {hasAgents ? `${agents.length} agent${agents.length !== 1 ? 's' : ''}` : 'No agents'}
      </span>

      {metrics.totalCost > 0 && (
        <span className={styles.cost}>${metrics.totalCost.toFixed(2)}</span>
      )}
    </div>
  );
}
