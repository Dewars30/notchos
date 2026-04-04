import { useState } from 'react';
import type { Agent, SessionMetrics } from '../../types';
import { StatusOrb } from '../shared/StatusOrb';
import { isMuted, setMuted } from '../../audio/SoundEngine';

interface TopBarProps {
  agents: Agent[];
  selectedAgentId: string | null;
  metrics: SessionMetrics;
  onSelectAgent: (id: string) => void;
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return String(tokens);
}

export function TopBar({ agents, selectedAgentId, metrics, onSelectAgent }: TopBarProps) {
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
      style={{
        gridArea: 'topbar',
        height: 36,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        borderBottom: '0.5px solid var(--border-subtle)',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* NP mark */}
      <span style={{
        fontFamily: 'var(--font-label)',
        fontSize: 10,
        color: 'var(--text-dim)',
        marginRight: 16,
        letterSpacing: '0.08em',
      }}>
        NP
      </span>

      {/* Agent mini-pills */}
      <div role="toolbar" aria-label="Agent selector" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {agents.map(agent => {
          const isSelected = agent.id === selectedAgentId;
          return (
            <button
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              aria-pressed={isSelected}
              aria-label={agent.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                background: isSelected ? 'var(--bg-surface)' : 'transparent',
                border: isSelected
                  ? '0.5px solid var(--stroke)'
                  : '0.5px solid transparent',
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 100ms',
              }}
            >
              <StatusOrb status={agent.status} size={4} />
              <span style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 10,
                fontWeight: 500,
                color: isSelected ? 'var(--text-1)' : 'var(--text-3)',
              }}>
                {agent.abbreviation}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right: cost + tokens + LIVE indicator */}
      <div style={{
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{
          fontFamily: 'var(--font-data)',
          fontSize: 9,
          color: 'var(--text-3)',
        }}>
          {formatCost(metrics.totalCost)} · {formatTokens(metrics.totalTokens)} tok
        </span>

        <button
          onClick={toggleMute}
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: 9,
            color: muted ? 'var(--text-dim)' : 'var(--text-3)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
          }}
          aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {muted ? 'MUTED' : 'SND'}
        </button>

        {hasLive && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--ripple)',
              boxShadow: '0 0 4px var(--ripple)',
            }} />
            <span style={{
              fontFamily: 'var(--font-data)',
              fontSize: 9,
              color: 'var(--ripple)',
            }}>
              LIVE
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
