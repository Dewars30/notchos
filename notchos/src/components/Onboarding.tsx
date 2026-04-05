import { useState, useEffect } from 'react';

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
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      padding: 32,
      gap: 24,
    }}>
      {/* Logo */}
      <span style={{
        fontFamily: 'var(--font-label)',
        fontSize: 28,
        color: 'var(--text-1)',
        letterSpacing: '0.08em',
      }}>
        NP
      </span>

      {/* Tagline */}
      <span style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 14,
        color: 'var(--text-2)',
        textAlign: 'center',
      }}>
        Air traffic control for your AI agents.
      </span>

      {/* Agent detection list */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
        maxWidth: 280,
      }}>
        {agents.length === 0 && !isTauri && (
          <span style={{
            fontFamily: 'var(--font-data)',
            fontSize: 9,
            color: 'var(--text-dim)',
            textAlign: 'center',
          }}>
            Agent detection available in desktop mode
          </span>
        )}
        {agents.map(agent => (
          <div key={agent.agentKey} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            background: 'var(--bg-surface)',
            borderRadius: 6,
            border: '0.5px solid var(--border-subtle)',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: agent.hooksInjected ? 'var(--teal)' : agent.installed ? 'var(--gold)' : 'var(--text-dim)',
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 11,
              color: 'var(--text-1)',
              flex: 1,
            }}>
              {agent.name}
            </span>
            <span style={{
              fontFamily: 'var(--font-data)',
              fontSize: 8,
              color: agent.hooksInjected ? 'var(--teal)' : agent.installed ? 'var(--gold)' : 'var(--text-dim)',
            }}>
              {agent.hooksInjected ? 'READY' : agent.installed ? 'FOUND' : 'NOT FOUND'}
            </span>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        {!done ? (
          <>
            <button
              onClick={handleSetup}
              disabled={setting || installedCount === 0}
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--bg-base)',
                background: 'var(--teal)',
                border: 'none',
                borderRadius: 6,
                padding: '8px 20px',
                cursor: setting || installedCount === 0 ? 'default' : 'pointer',
                opacity: setting || installedCount === 0 ? 0.5 : 1,
                transition: 'all 100ms',
              }}
            >
              {setting ? 'Setting up...' : `Set Up ${installedCount} Agent${installedCount !== 1 ? 's' : ''}`}
            </button>
            <button
              onClick={onComplete}
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 11,
                color: 'var(--text-3)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 12px',
              }}
            >
              Skip
            </button>
          </>
        ) : (
          <span style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            color: 'var(--teal)',
          }}>
            {hookedCount} agent{hookedCount !== 1 ? 's' : ''} configured. Starting...
          </span>
        )}
      </div>
    </div>
  );
}
