import { motion } from 'framer-motion';
import type { Agent, AgentStatus, SessionMetrics } from '../types';
import { StatusOrb } from './shared/StatusOrb';
import styles from './ExpandedPill.module.css';

interface ExpandedPillProps {
  agents: Agent[];
  metrics: SessionMetrics;
  onSelectAgent: (id: string) => void;
  onExpandFull: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onJumpToTerminal?: (agentId: string) => void;
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

function AgentRow({ agent, onClick, onJumpToTerminal }: { agent: Agent; onClick: () => void; onJumpToTerminal?: (agentId: string) => void }) {
  const hasPending = agent.pendingApproval !== null;

  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={styles.agentRow}
    >
      {/* Status orb — 5px, clickable to jump to terminal */}
      <span
        role="button"
        tabIndex={0}
        className={styles.orbButton}
        onClick={e => { e.stopPropagation(); onJumpToTerminal?.(agent.id); }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onJumpToTerminal?.(agent.id); } }}
        aria-label={`Jump to terminal for ${agent.name}`}
      >
        <StatusOrb status={agent.status} size={5} layoutId={`orb-${agent.id}`} />
      </span>

      {/* Agent name — Sora 11px/500 */}
      <motion.span layoutId={`name-${agent.id}`} className={styles.agentName}>
        {agent.name}
      </motion.span>

      {/* Meta — B612 Mono 9px: model · status · elapsed */}
      <span className={styles.agentMeta}>
        {agent.model}<span className={styles.separator} />{agent.status}<span className={styles.separator} />{formatElapsed(agent.elapsedSeconds)}
      </span>

      {/* Cost — B612 Mono 9px; color is dynamic based on hasPending */}
      <motion.span
        layoutId={`cost-${agent.id}`}
        className={styles.agentCost}
        style={{ color: hasPending ? STATUS_COLORS[agent.status] : 'var(--text-3)' }}
      >
        ${agent.cost.toFixed(2)}
      </motion.span>

      {/* Pending badge — Departure Mono 8px, gold tint */}
      {hasPending && (
        <span className={styles.pendingBadge}>
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
  onJumpToTerminal,
}: ExpandedPillProps) {
  return (
    <div
      className={styles.container}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Agent rows — 28px each, 2px gap */}
      <div role="menu" className={styles.rows}>
        {agents.map(agent => (
          <AgentRow
            key={agent.id}
            agent={agent}
            onClick={() => onSelectAgent(agent.id)}
            onJumpToTerminal={onJumpToTerminal}
          />
        ))}
      </div>

      {/* Footer — session summary + keyboard hint */}
      <div className={styles.footer}>
        <span className={styles.footerText}>
          {agents.length} agents<span className={styles.separator} />${metrics.totalCost.toFixed(2)}
        </span>
        <button
          onClick={onExpandFull}
          className={styles.expandButton}
        >
          ⌘⇧N
        </button>
      </div>
    </div>
  );
}
