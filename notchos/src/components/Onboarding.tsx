import { useState, useEffect } from 'react';
import styles from './Onboarding.module.css';

const isTauri = '__TAURI_INTERNALS__' in window;

interface DiscoveredAgent {
  name: string;
  agentKey: string;
  installed: boolean;
  hooksInjected: boolean;
  configPath: string | null;
}

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [agents, setAgents] = useState<DiscoveredAgent[]>([]);
  const [setting, setSetting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isTauri) return;
    (async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const discovered = await invoke<DiscoveredAgent[]>('discover_agents');
        setAgents(discovered);
      } catch (e) {
        console.error('[Onboarding] discover failed:', e);
      }
    })();
  }, []);

  async function handleSetup() {
    if (!isTauri) return;
    setSetting(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('setup_agents');
      const discovered = await invoke<DiscoveredAgent[]>('discover_agents');
      setAgents(discovered);
      setDone(true);
      // Auto-dismiss after 2s
      setTimeout(onComplete, 2000);
    } catch (e) {
      console.error('[Onboarding] setup failed:', e);
    }
    setSetting(false);
  }

  const installedCount = agents.filter(a => a.installed).length;
  const hookedCount = agents.filter(a => a.hooksInjected).length;

  return (
    <div className={styles.root}>
      {/* Logo */}
      <span className={styles.logo}>NP</span>

      {/* Tagline */}
      <span className={styles.tagline}>Air traffic control for your AI agents.</span>

      {/* Agent detection list */}
      <div className={styles.agentList}>
        {agents.length === 0 && !isTauri && (
          <span className={styles.emptyHint}>
            Agent detection available in desktop mode
          </span>
        )}
        {agents.map(agent => (
          <div key={agent.agentKey} className={styles.agentCard}>
            <span
              className={styles.agentDot}
              style={{
                background: agent.hooksInjected ? 'var(--teal)' : agent.installed ? 'var(--gold)' : 'var(--text-dim)',
              }}
            />
            <span className={styles.agentName}>{agent.name}</span>
            <span
              className={styles.agentStatus}
              style={{
                color: agent.hooksInjected ? 'var(--teal)' : agent.installed ? 'var(--gold)' : 'var(--text-dim)',
              }}
            >
              {agent.hooksInjected ? 'READY' : agent.installed ? 'FOUND' : 'NOT FOUND'}
            </span>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className={styles.actionRow}>
        {!done ? (
          <>
            <button
              onClick={handleSetup}
              disabled={setting || installedCount === 0}
              className={styles.setupButton}
            >
              {setting ? 'Setting up...' : `Set Up ${installedCount} Agent${installedCount !== 1 ? 's' : ''}`}
            </button>
            <button onClick={onComplete} className={styles.skipButton}>
              Skip
            </button>
          </>
        ) : (
          <span className={styles.doneMessage}>
            {hookedCount} agent{hookedCount !== 1 ? 's' : ''} configured. Starting...
          </span>
        )}
      </div>
    </div>
  );
}
