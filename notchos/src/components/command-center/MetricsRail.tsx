import type { SessionMetrics } from '../../types';
import { ZoneLabel } from '../shared/ZoneLabel';

interface MetricsRailProps {
  metrics: SessionMetrics;
}

function ToroidalRing({ value, size = 48, label }: {
  value: number;
  size?: number;
  label: string;
}) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashLength = (value / 100) * circumference;
  const dashGap = circumference - dashLength;

  // Color transitions: teal (healthy) → gold (warning ~70%) → coral (critical ~90%)
  const color = value < 70 ? 'var(--teal)' : value < 90 ? 'var(--gold)' : 'var(--coral)';
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Guide ring — 1px at ~6% opacity */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth={1}
          opacity={0.6}
        />
        {/* Value ring — V1 stroke-dasharray approximation of murmuration */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray={`${dashLength} ${dashGap}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          opacity={0.7}
        />
        {/* Center value */}
        <text
          x={cx} y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--text-1)"
          fontFamily="var(--font-ui)"
          fontSize={12}
          fontWeight={600}
        >
          {value}%
        </text>
      </svg>
      <span style={{
        fontFamily: 'var(--font-label)',
        fontSize: 7,
        color: 'var(--text-dim)',
        letterSpacing: '0.12em',
      }}>
        {label}
      </span>
    </div>
  );
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
      <ToroidalRing value={metrics.contextHealth} size={48} label="CONTEXT" />

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
