import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Agent, SessionMetrics } from '../../types';
import { StatusOrb } from '../shared/StatusOrb';
import { isMuted, setMuted } from '../../audio/SoundEngine';
import styles from './TopBar.module.css';

interface TopBarProps {
  agents: Agent[];
  selectedAgentId: string | null;
  metrics: SessionMetrics;
  onSelectAgent: (id: string) => void;
  connectionStatus?: 'live' | 'connecting' | 'offline' | 'demo';
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return String(tokens);
}

export function TopBar({ agents, selectedAgentId, metrics, onSelectAgent, connectionStatus }: TopBarProps) {
  const [muted, setMutedState] = useState(isMuted());
  const hasLive = agents.some(a => a.status === 'executing' || a.status === 'writing');

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }

  return (
    <div
      data-tauri-drag-region
      className={styles.container}
    >
      {/* NP mark */}
      <motion.span layoutId="np-mark" className={styles.npMark}>
        NP
      </motion.span>

      {/* Agent mini-pills */}
      <div role="toolbar" aria-label="Agent selector" className={styles.agentToolbar}>
        {agents.map(agent => {
          const isSelected = agent.id === selectedAgentId;
          return (
            <button
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              aria-pressed={isSelected}
              aria-label={agent.name}
              className={isSelected ? styles.agentButtonSelected : styles.agentButton}
            >
              <StatusOrb status={agent.status} size={4} />
              <span className={isSelected ? styles.agentLabelSelected : styles.agentLabel}>
                {agent.abbreviation}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right: cost + tokens + LIVE indicator */}
      <div className={styles.rightCluster}>
        <motion.span layoutId="session-cost" className={styles.metricsText}>
          {formatCost(metrics.totalCost)}<span className={styles.separator} />{formatTokens(metrics.totalTokens)} tok
        </motion.span>

        <button
          onClick={toggleMute}
          className={styles.muteButton}
          style={{ color: muted ? 'var(--text-dim)' : 'var(--text-3)' }}
          aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {muted ? 'MUTED' : 'SND'}
        </button>

        {connectionStatus === 'connecting' && (
          <span className={styles.statusConnecting}>CONNECTING</span>
        )}
        {connectionStatus === 'offline' && (
          <span className={styles.statusOffline}>OFFLINE</span>
        )}
        {connectionStatus === 'demo' && (
          <span className={styles.statusDemo}>DEMO</span>
        )}

        {hasLive && (
          <span className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            <span className={styles.liveLabel}>LIVE</span>
          </span>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={async () => {
          if ('__TAURI_INTERNALS__' in window) {
            const { getCurrentWindow } = await import('@tauri-apps/api/window');
            getCurrentWindow().hide();
          }
        }}
        className={styles.closeButton}
        aria-label="Hide NotchOS"
      >
        x
      </button>
    </div>
  );
}
