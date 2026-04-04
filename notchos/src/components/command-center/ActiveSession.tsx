import { useEffect } from 'react';
import type { Agent, RiskTier, DiffLine } from '../../types';
import { ZoneLabel } from '../shared/ZoneLabel';
import { ClickablePath } from '../shared/ClickablePath';

interface ActiveSessionProps {
  agent: Agent | null;
  onApprove: (approvalId: string) => void;
  onDeny: (approvalId: string) => void;
}

const RISK_STYLES: Record<RiskTier, { bg: string; border: string; text: string }> = {
  low: {
    bg: 'var(--teal-dim)',
    border: 'var(--teal-border)',
    text: 'var(--teal)',
  },
  medium: {
    bg: 'var(--gold-dim)',
    border: 'var(--gold-border)',
    text: 'var(--gold)',
  },
  high: {
    bg: 'var(--coral-dim)',
    border: 'var(--coral-border)',
    text: 'var(--coral)',
  },
};

const RISK_LABELS: Record<RiskTier, string> = {
  low: 'LOW RISK',
  medium: 'MEDIUM RISK',
  high: 'HIGH RISK',
};

// Gravitational weight — risk controls density
const RISK_WEIGHT: Record<RiskTier, {
  padding: number;
  fontSize: number;
  maxDiffHeight: number | undefined;
  borderLeft: string;
  hintOpacity: number;
  showHints: boolean;
  bgTint: string;
}> = {
  low: {
    padding: 6,
    fontSize: 8,
    maxDiffHeight: 48,
    borderLeft: '0.5px solid transparent',
    hintOpacity: 0,
    showHints: false,
    bgTint: 'transparent',
  },
  medium: {
    padding: 8,
    fontSize: 10,
    maxDiffHeight: 220,
    borderLeft: '0.5px solid var(--gold)',
    hintOpacity: 0.4,
    showHints: true,
    bgTint: 'transparent',
  },
  high: {
    padding: 12,
    fontSize: 11,
    maxDiffHeight: undefined,
    borderLeft: '0.5px solid var(--coral)',
    hintOpacity: 0.8,
    showHints: true,
    bgTint: 'var(--coral-dim)',
  },
};

function DiffLineRow({ line }: { line: DiffLine }) {
  const styles: Record<DiffLine['type'], { color: string; bg: string }> = {
    context: { color: 'var(--text-3)', bg: 'transparent' },
    addition: { color: 'rgba(56,168,154,0.7)', bg: 'rgba(56,168,154,0.04)' },
    deletion: { color: 'rgba(224,136,112,0.65)', bg: 'rgba(224,136,112,0.04)' },
  };
  const prefixes: Record<DiffLine['type'], string> = {
    context: ' ',
    addition: '+',
    deletion: '-',
  };
  const { color, bg } = styles[line.type];

  return (
    <div style={{
      fontFamily: 'var(--font-data)',
      fontSize: 9,
      lineHeight: '16px',
      color,
      background: bg,
      padding: '0 4px',
      marginBottom: 2,
    }}>
      <span style={{
        color: 'var(--text-dim)',
        marginRight: 8,
        display: 'inline-block',
        width: 24,
        textAlign: 'right',
      }}>
        {line.lineNumber ?? ''}
      </span>
      <span style={{ color: 'var(--text-dim)', marginRight: 4 }}>
        {prefixes[line.type]}
      </span>
      <ClickablePath text={line.content} />
    </div>
  );
}

export function ActiveSession({ agent, onApprove, onDeny }: ActiveSessionProps) {
  const approval = agent?.pendingApproval ?? null;
  const riskTier = approval?.riskTier ?? 'low';
  const risk = RISK_STYLES[riskTier];
  const weight = RISK_WEIGHT[riskTier];

  // Keyboard shortcuts: ⌘Y approve, ⌘N deny
  useEffect(() => {
    if (!approval) return;
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        onApprove(approval!.approvalId);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        onDeny(approval!.approvalId);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [approval, onApprove, onDeny]);

  if (!agent) {
    return (
      <div style={{
        gridArea: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          color: 'var(--text-dim)',
        }}>
          Select an agent
        </span>
      </div>
    );
  }

  return (
    <div style={{
      gridArea: 'center',
      display: 'flex',
      flexDirection: 'column',
      padding: 12,
      overflow: 'auto',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* Zone label */}
      <div style={{ marginBottom: 8 }}>
        <ZoneLabel>
          ACTIVE — {agent.name.toUpperCase()} · {approval?.filePath ?? agent.currentTool ?? agent.status}
        </ZoneLabel>
      </div>

      {approval ? (
        <div aria-live="polite" style={{
          borderLeft: weight.borderLeft,
          paddingLeft: riskTier !== 'low' ? 8 : 0,
          background: weight.bgTint,
          borderRadius: riskTier === 'high' ? 4 : 0,
        }}>
          {/* Risk badge + impact summary */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}>
            <span style={{
              fontFamily: 'var(--font-label)',
              fontSize: 8,
              color: risk.text,
              background: risk.bg,
              border: `0.5px solid ${risk.border}`,
              borderRadius: 3,
              padding: '2px 6px',
              letterSpacing: '0.08em',
            }}>
              {RISK_LABELS[riskTier]}
            </span>

            {(approval.impactFiles || approval.impactDeps) && (
              <span style={{
                fontFamily: 'var(--font-data)',
                fontSize: 9,
                color: 'var(--text-3)',
              }}>
                {approval.impactFiles ? `${approval.impactFiles} files` : ''}
                {approval.impactFiles && approval.impactDeps ? ' · ' : ''}
                {approval.impactDeps ? `${approval.impactDeps} deps` : ''}
              </span>
            )}
          </div>

          {/* High-risk impact summary */}
          {riskTier === 'high' && approval.summary && (
            <div style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 10,
              fontWeight: 500,
              color: 'var(--coral)',
              padding: '4px 0',
              marginBottom: 4,
            }}>
              ⚠ {approval.summary}
            </div>
          )}

          {/* Diff block */}
          {approval.diff && approval.diff.length > 0 && (
            <div style={{
              background: 'var(--bg-base)',
              borderRadius: 4,
              border: '0.5px solid var(--bg-elevated)',
              padding: weight.padding,
              marginBottom: 8,
              overflow: 'auto',
              maxHeight: weight.maxDiffHeight,
            }}>
              {approval.diff.map((line, i) => (
                <DiffLineRow key={i} line={line} />
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onApprove(approval.approvalId)}
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: weight.fontSize,
                fontWeight: 500,
                color: 'rgba(56,168,154,0.85)',
                background: 'rgba(56,168,154,0.08)',
                border: '0.5px solid rgba(56,168,154,0.20)',
                borderRadius: 4,
                padding: '4px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'background 100ms',
              }}
            >
              Approve
              {weight.showHints && (
                <span style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: 8,
                  opacity: weight.hintOpacity,
                }}>
                  ⌘Y
                </span>
              )}
            </button>

            <button
              onClick={() => onDeny(approval.approvalId)}
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: weight.fontSize,
                fontWeight: 500,
                color: 'rgba(224,136,112,0.70)',
                background: 'rgba(224,136,112,0.05)',
                border: '0.5px solid rgba(224,136,112,0.12)',
                borderRadius: 4,
                padding: '4px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'background 100ms',
              }}
            >
              Deny
              {weight.showHints && (
                <span style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: 8,
                  opacity: weight.hintOpacity,
                }}>
                  ⌘N
                </span>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          fontFamily: 'var(--font-data)',
          fontSize: 9,
          color: 'var(--text-3)',
          padding: 8,
        }}>
          {agent.status === 'idle' && 'Agent idle — no pending actions'}
          {agent.status === 'executing' && `Executing: ${agent.currentTool ?? 'unknown'}`}
          {agent.status === 'writing' && `Writing: ${agent.currentTool ?? 'unknown'}`}
          {agent.status === 'waiting' && 'Waiting for response...'}
          {agent.status === 'error' && 'Agent encountered an error'}
        </div>
      )}
    </div>
  );
}
