import type { TimelineEvent, RiskTier } from '../../types';
import styles from './EventTimeline.module.css';

interface EventTimelineProps {
  events: TimelineEvent[];
}

const BAR_COLORS: Record<RiskTier, { color: string; opacity: number }> = {
  low: { color: 'var(--teal)', opacity: 0.25 },
  medium: { color: 'var(--gold)', opacity: 0.3 },
  high: { color: 'var(--coral)', opacity: 0.35 },
};

// Bar height encodes event significance
const TYPE_HEIGHTS: Record<TimelineEvent['type'], number> = {
  'auto-approved': 6,
  'approved': 12,
  'pending': 14,
  'denied': 24,
};

function formatTimeRange(events: TimelineEvent[]): string {
  if (events.length === 0) return '';
  const first = new Date(events[0].timestamp * 1000);
  const last = new Date(events[events.length - 1].timestamp * 1000);
  const fmt = (d: Date) =>
    `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${fmt(first)} → ${fmt(last)}`;
}

export function EventTimeline({ events }: EventTimelineProps) {
  return (
    <div className={styles.timeline}>
      {events.map(event => {
        const isQuiet = event.type === 'auto-approved' && event.riskTier === 'low';
        const { color, opacity } = BAR_COLORS[event.riskTier];
        const height = TYPE_HEIGHTS[event.type];

        return (
          <div
            key={event.id}
            className={styles.bar}
            style={{
              height,
              background: isQuiet ? 'var(--bg-elevated)' : color,
              opacity: isQuiet ? 1 : opacity,
            }}
          />
        );
      })}

      {/* Timestamp */}
      <span className={styles.timestamp}>
        {formatTimeRange(events)}
      </span>
    </div>
  );
}
