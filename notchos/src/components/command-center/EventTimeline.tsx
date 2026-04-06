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

const TYPE_HEIGHTS: Record<TimelineEvent['type'], number> = {
  'auto-approved': 6,
  'approved': 12,
  'pending': 14,
  'denied': 24,
};

const BAR_WIDTH = 3;
const BAR_GAP = 2;
const TIMELINE_HEIGHT = 36;
const PADDING_BOTTOM = 6;

function formatTimeRange(events: TimelineEvent[]): string {
  if (events.length === 0) return '';
  const first = new Date(events[0].timestamp * 1000);
  const last = new Date(events[events.length - 1].timestamp * 1000);
  const fmt = (d: Date) =>
    `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${fmt(first)} → ${fmt(last)}`;
}

function buildSkylinePath(events: TimelineEvent[]): string {
  if (events.length === 0) return '';
  const points = events.map((event, i) => {
    const x = i * (BAR_WIDTH + BAR_GAP) + BAR_WIDTH / 2;
    const y = TIMELINE_HEIGHT - PADDING_BOTTOM - TYPE_HEIGHTS[event.type];
    return `${x},${y}`;
  });
  return `M${points.join(' L')}`;
}

export function EventTimeline({ events }: EventTimelineProps) {
  const hasDenied = events.some(e => e.type === 'denied');
  const skylinePath = buildSkylinePath(events);
  const svgWidth = events.length * (BAR_WIDTH + BAR_GAP);

  return (
    <footer className={styles.timeline}>
      {/* Baseline wire */}
      <div className={styles.baseline} />

      {/* Redline marker — only when denials exist */}
      {hasDenied && <div className={styles.redline} />}

      {/* SVG skyline path connecting bar tops */}
      {skylinePath && (
        <svg
          className={styles.svgOverlay}
          viewBox={`0 0 ${svgWidth} ${TIMELINE_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <path
            d={skylinePath}
            fill="none"
            stroke="var(--text-dim)"
            strokeWidth={0.5}
            opacity={0.15}
          />
        </svg>
      )}

      {/* Event bars */}
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
    </footer>
  );
}
