import { useState } from 'react';
import type { SessionMetrics } from '../../types';
import { ZoneLabel } from '../shared/ZoneLabel';
import { RadialGauge } from '../shared/RadialGauge';
import styles from './MetricsRail.module.css';

interface MetricsRailProps {
  metrics: SessionMetrics;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return String(tokens);
}

export function MetricsRail({ metrics }: MetricsRailProps) {
  const [budget, setBudget] = useState(() =>
    parseFloat(localStorage.getItem('notchos-budget-target') || '10')
  );
  const [editingBudget, setEditingBudget] = useState(false);

  function saveBudget(value: number) {
    const clamped = Math.max(0.01, value);
    setBudget(clamped);
    localStorage.setItem('notchos-budget-target', String(clamped));
    setEditingBudget(false);
  }

  return (
    <aside className={styles.rail}>
      <ZoneLabel>METRICS</ZoneLabel>

      {/* Context health — tachometer arc */}
      <RadialGauge value={metrics.contextHealth} size={56} label="CTX" />

      {/* Budget burn — estimated cost vs configurable target */}
      <div className={styles.budgetGroup}>
        <RadialGauge
          value={Math.min(100, Math.round((metrics.totalCost / budget) * 100))}
          size={48}
          label="BURN"
        />
        <span className={styles.budgetCost}>
          {editingBudget ? (
            <input
              type="number"
              defaultValue={budget}
              className={styles.budgetInput}
              autoFocus
              onBlur={e => saveBudget(parseFloat(e.target.value) || budget)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveBudget(parseFloat((e.target as HTMLInputElement).value) || budget);
                if (e.key === 'Escape') setEditingBudget(false);
              }}
            />
          ) : (
            <span
              className={styles.budgetClickable}
              onClick={() => setEditingBudget(true)}
            >
              ${metrics.totalCost.toFixed(2)} / ${budget.toFixed(0)}
            </span>
          )}
        </span>
      </div>

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
    </aside>
  );
}
