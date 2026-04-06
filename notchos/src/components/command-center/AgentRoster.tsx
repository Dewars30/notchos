import { motion } from 'framer-motion';
import type { Agent, AgentStatus } from '../../types';
import { StatusOrb } from '../shared/StatusOrb';
import { ZoneLabel } from '../shared/ZoneLabel';
import styles from './AgentRoster.module.css';

interface AgentRosterProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
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

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

export function AgentRoster({ agents, selectedAgentId, onSelectAgent, onJumpToTerminal }: AgentRosterProps) {
  const totalCost = agents.reduce((sum, a) => sum + a.cost, 0);

  // Group agents by project (cwd)
  const groups = new Map<string, typeof agents>();
  for (const agent of agents) {
    const key = agent.cwd ? agent.cwd.split('/').slice(-2).join('/') : 'Unassigned';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(agent);
  }

  return (
    <nav className={styles.container}>
      <ZoneLabel>AGENTS</ZoneLabel>

      <div role="listbox" aria-label="Agent list" className={styles.agentList}>
        {Array.from(groups.entries()).map(([project, groupAgents]) => (
          <div key={project}>
            {groups.size > 1 && (
              <span className={styles.groupLabel}>
                {project.toUpperCase()}
              </span>
            )}
            {groupAgents.map(agent => {
              const isSelected = agent.id === selectedAgentId;
              return (
                <button
                  key={agent.id}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={agent.name}
                  onClick={() => onSelectAgent(agent.id)}
                  onDoubleClick={() => onJumpToTerminal?.(agent.id)}
                  className={isSelected ? styles.agentButtonSelected : styles.agentButton}
                >
                  {/* Name row */}
                  <div className={styles.nameRow}>
                    <StatusOrb status={agent.status} size={5} layoutId={`orb-${agent.id}`} />
                    <motion.span
                      layoutId={`name-${agent.id}`}
                      className={styles.agentName}
                      style={{ color: isSelected ? STATUS_COLORS[agent.status] : 'var(--text-1)' }}
                    >
                      {agent.name}
                    </motion.span>
                  </div>

                  {/* Meta row */}
                  <div className={styles.metaRow}>
                    <span className={styles.metaText}>
                      {agent.model} · {agent.status} · {formatElapsed(agent.elapsedSeconds)}
                    </span>
                    <span className={styles.metaText}>
                      {formatCost(agent.cost)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Session total */}
      <div className={styles.totalSection}>
        <span className={styles.totalCost}>
          {formatCost(totalCost)}
        </span>
      </div>
    </nav>
  );
}
