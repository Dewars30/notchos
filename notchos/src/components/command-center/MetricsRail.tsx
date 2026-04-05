import type { SessionMetrics } from '../../types';
import { ZoneLabel } from '../shared/ZoneLabel';
import { MurmurationRing } from '../shared/MurmurationRing';
import styles from './MetricsRail.module.css';

interface MetricsRailProps {
  metrics: SessionMetrics;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return String(tokens);
}

export function MetricsRail({ metrics }: MetricsRailProps) {
  return (
    <div className={styles.rail}>
      <ZoneLabel>METRICS</ZoneLabel>

      {/* Context health — toroidal field (V1: SVG ring) */}
      <MurmurationRing value={metrics.contextHealth} size={56} label="CONTEXT" />

      {/* Budget burn — estimated cost vs $10/day default */}
      {(() => {
        const totalEstimatedCost = metrics.totalCost;
        return (
          <div className={styles.budgetGroup}>
            <MurmurationRing
              value={Math.min(100, Math.round((totalEstimatedCost / 10) * 100))}
              size={48}
              label="BUDGET"
            />
            <span className={styles.budgetCost}>
              ${metrics.totalCost.toFixed(2)}/session
            </span>
          </div>
        );
      })()}

      {/* Token count */}
      <div className={styles.statGroup}>
        <span className={styles.statLabel}>TOKENS</span>
        <span className={styles.statValue}>
          {formatTokens(metrics.totalTokens)}
        </span>
        <span className={styles.statUnit}>tokens</span>
      </div>

      {/* Approval stats */}
      <div className={styles.statGroup}>
        <span className={styles.statLabel}>APPROVALS</span>
        <span className={styles.statValueSmall}>
          {metrics.approvalsTotal}
          <span className={styles.approvalSuffix}>
            / {metrics.approvalsDenied} denied
          </span>
        </span>
      </div>
    </div>
  );
}
