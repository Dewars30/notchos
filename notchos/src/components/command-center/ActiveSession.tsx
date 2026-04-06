import { useEffect } from 'react';
import type { Agent, RiskTier, DiffLine, TimelineEvent } from '../../types';
import { ZoneLabel } from '../shared/ZoneLabel';
import { ClickablePath } from '../shared/ClickablePath';
import styles from './ActiveSession.module.css';

interface ActiveSessionProps {
  agent: Agent | null;
  onApprove: (approvalId: string) => void;
  onDeny: (approvalId: string) => void;
  recentEvents?: TimelineEvent[];
}

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return `0:${String(seconds).padStart(2, '0')}`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const EVENT_LABELS: Record<string, string> = {
  'auto-approved': 'Auto-approved',
  'approved': 'Approved',
  'pending': 'Pending',
  'denied': 'Denied',
};

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

const LINE_STYLES: Record<DiffLine['type'], { color: string; bg: string }> = {
  context: { color: 'var(--text-3)', bg: 'transparent' },
  addition: { color: 'rgba(56,168,154,0.7)', bg: 'rgba(56,168,154,0.04)' },
  deletion: { color: 'rgba(224,136,112,0.65)', bg: 'rgba(224,136,112,0.04)' },
};

const DIFF_PREFIXES: Record<DiffLine['type'], string> = {
  context: ' ',
  addition: '+',
  deletion: '-',
};

function DiffLineRow({ line }: { line: DiffLine }) {
  const { color, bg } = LINE_STYLES[line.type];

  return (
    <div
      className={styles.diffLine}
      style={{ color, background: bg }}
    >
      <span className={styles.diffLineNumber}>
        {line.lineNumber ?? ''}
      </span>
      <span className={styles.diffPrefix}>
        {DIFF_PREFIXES[line.type]}
      </span>
      <ClickablePath text={line.content} />
    </div>
  );
}

export function ActiveSession({ agent, onApprove, onDeny, recentEvents = [] }: ActiveSessionProps) {
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
      <div className={styles.containerEmpty}>
        <span className={styles.emptyText}>Select an agent</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Zone label */}
      <div className={styles.zoneRow}>
        <ZoneLabel>
          ACTIVE — {agent.name.toUpperCase()} · {approval?.filePath ?? agent.currentTool ?? agent.status}
        </ZoneLabel>
      </div>

      {approval ? (
        <div
          aria-live="polite"
          className={
            riskTier === 'high' ? styles.riskHighContainer
              : riskTier === 'medium' ? styles.riskMediumContainer
              : styles.riskLowContainer
          }
        >
          {/* Risk badge + impact summary */}
          <div className={styles.riskHeader}>
            <span
              className={styles.riskBadge}
              style={{
                color: risk.text,
                background: risk.bg,
                border: `0.5px solid ${risk.border}`,
              }}
            >
              {RISK_LABELS[riskTier]}
            </span>

            {(approval.impactFiles || approval.impactDeps) && (
              <span className={styles.impactText}>
                {approval.impactFiles ? `${approval.impactFiles} files` : ''}
                {approval.impactFiles && approval.impactDeps ? ' · ' : ''}
                {approval.impactDeps ? `${approval.impactDeps} deps` : ''}
              </span>
            )}
          </div>

          {/* High-risk impact summary */}
          {riskTier === 'high' && approval.summary && (
            <div className={styles.highRiskSummary}>
              ⚠ {approval.summary}
            </div>
          )}

          {/* Diff block */}
          {approval.diff && approval.diff.length > 0 && (
            <div
              className={`${styles.diffBlock}${riskTier === 'low' ? ` ${styles.riskLowDiff}` : ''}`}
              style={{
                padding: weight.padding,
                maxHeight: riskTier !== 'low' ? weight.maxDiffHeight : undefined,
              }}
            >
              {approval.diff.map((line, i) => (
                <DiffLineRow key={i} line={line} />
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className={styles.actionRow}>
            <button
              onClick={() => onApprove(approval.approvalId)}
              className={riskTier === 'high' ? styles.approveButtonLarge : styles.approveButton}
              style={{ fontSize: riskTier !== 'high' ? weight.fontSize : undefined }}
            >
              Approve
              {weight.showHints && (
                <span className={styles.hintLabel} style={{ opacity: weight.hintOpacity }}>
                  ⌘Y
                </span>
              )}
            </button>

            <button
              onClick={() => onDeny(approval.approvalId)}
              className={riskTier === 'high' ? styles.denyButtonLarge : styles.denyButton}
              style={{ fontSize: riskTier !== 'high' ? weight.fontSize : undefined }}
            >
              Deny
              {weight.showHints && (
                <span className={styles.hintLabel} style={{ opacity: weight.hintOpacity }}>
                  ⌘N
                </span>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.activityFeed}>
          {recentEvents.length > 0 ? (
            recentEvents.slice(0, 20).map(event => (
              <div key={event.id} className={styles.activityEntry}>
                <span className={styles.activityTime}>
                  {formatRelativeTime(event.timestamp)}
                </span>
                <span className={styles.activityDesc}>
                  <span className={styles.activityTool}>{EVENT_LABELS[event.type] ?? event.type}</span>
                </span>
              </div>
            ))
          ) : (
            <div className={styles.statusBlock}>
              <div className={styles.statusMessage}>
                {agent.status === 'idle' && 'All clear — no pending actions'}
                {agent.status === 'executing' && (
                  <>Executing: <span style={{ color: 'var(--ripple)' }}>{agent.currentTool ?? 'unknown'}</span></>
                )}
                {agent.status === 'writing' && (
                  <>Writing: <span style={{ color: 'var(--gold)' }}>{agent.currentTool ?? 'unknown'}</span></>
                )}
                {agent.status === 'waiting' && 'Waiting for response...'}
                {agent.status === 'error' && <span style={{ color: 'var(--coral)' }}>Agent encountered an error</span>}
              </div>
              {agent.status === 'idle' && (
                <span className={styles.idleLabel}>listening...</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
