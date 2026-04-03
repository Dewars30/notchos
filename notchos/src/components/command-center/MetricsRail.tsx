import type { SessionMetrics } from '../../types';
import { ZoneLabel } from '../shared/ZoneLabel';
import { MurmurationRing } from '../shared/MurmurationRing';

interface MetricsRailProps {
  metrics: SessionMetrics;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return String(tokens);
}

export function MetricsRail({ metrics }: MetricsRailProps) {
  return (
    <div style={{
      gridArea: 'metrics',
      display: 'flex',
      flexDirection: 'column',
      padding: 12,
      borderLeft: '0.5px solid var(--bg-elevated)',
      gap: 8,
      position: 'relative',
      zIndex: 1,
    }}>
      <ZoneLabel>METRICS</ZoneLabel>

      {/* Context health — toroidal field (V1: SVG ring) */}
      <MurmurationRing value={metrics.contextHealth} size={56} label="CONTEXT" />

      {/* Token count */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          fontFamily: 'var(--font-label)',
          fontSize: 7,
          color: 'var(--text-dim)',
          letterSpacing: '0.12em',
        }}>
          TOKENS
        </span>
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--text-1)',
        }}>
          {formatTokens(metrics.totalTokens)}
        </span>
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 9,
          color: 'var(--text-dim)',
        }}>
          tokens
        </span>
      </div>

      {/* Approval stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{
          fontFamily: 'var(--font-label)',
          fontSize: 7,
          color: 'var(--text-dim)',
          letterSpacing: '0.12em',
        }}>
          APPROVALS
        </span>
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--text-1)',
        }}>
          {metrics.approvalsTotal}
          <span style={{
            fontSize: 10,
            color: 'var(--text-3)',
            fontWeight: 400,
            marginLeft: 4,
          }}>
            / {metrics.approvalsDenied} denied
          </span>
        </span>
      </div>
    </div>
  );
}
