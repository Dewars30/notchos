import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import styles from './RadialGauge.module.css';

interface RadialGaugeProps {
  value: number;
  size?: number;
  label?: string;
}

const ARC_START_DEG = 135;
const ARC_SWEEP_DEG = 270;
const ARC_START_RAD = (ARC_START_DEG * Math.PI) / 180;

const ZONES = [
  { from: 0, to: 0.70, color: 'var(--teal)' },
  { from: 0.70, to: 0.90, color: 'var(--gold)' },
  { from: 0.90, to: 1.00, color: 'var(--coral)' },
] as const;

const TICKS = [0, 0.25, 0.50, 0.75, 1.0];

function getZoneColor(value: number): string {
  if (value < 70) return 'var(--teal)';
  if (value < 90) return 'var(--gold)';
  return 'var(--coral)';
}

function valueToAngle(value: number): number {
  const clamped = Math.max(0, Math.min(100, value));
  return ARC_START_RAD + (clamped / 100) * (ARC_SWEEP_DEG * Math.PI) / 180;
}

export function RadialGauge({ value, size = 56, label }: RadialGaugeProps) {
  const prefersReduced = useReducedMotion();
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (ARC_SWEEP_DEG / 360) * circumference;

  const clamped = Math.max(0, Math.min(100, value));
  const dotAngle = valueToAngle(clamped);
  const dotX = cx + radius * Math.cos(dotAngle);
  const dotY = cy + radius * Math.sin(dotAngle);
  const dotColor = getZoneColor(clamped);

  const activeZoneIdx = clamped < 70 ? 0 : clamped < 90 ? 1 : 2;

  // Memoize zone circle transform style — only changes when `size` changes
  const zoneCircleStyle = useMemo(() => ({
    transform: `rotate(${ARC_START_DEG}deg)`,
    transformOrigin: `${cx}px ${cy}px`,
  }), [cx, cy]);

  return (
    <div className={styles.wrapper}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label ?? 'Gauge'}: ${clamped}%`}
      >
        {ZONES.map((zone, i) => {
          const zoneArcFraction = zone.to - zone.from;
          const zoneDash = zoneArcFraction * arcLength;
          const zoneOffset = -(zone.from * arcLength);
          const isActive = i === activeZoneIdx;

          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={zone.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={`${zoneDash} ${circumference - zoneDash}`}
              strokeDashoffset={zoneOffset}
              opacity={isActive ? 1 : 0.12}
              filter={isActive ? `drop-shadow(0 0 2px ${zone.color})` : undefined}
              style={zoneCircleStyle}
            />
          );
        })}

        {TICKS.map((frac, i) => {
          const angle = ARC_START_RAD + frac * (ARC_SWEEP_DEG * Math.PI) / 180;
          const innerR = radius - 1;
          const outerR = radius + 3;
          return (
            <line
              key={i}
              x1={cx + innerR * Math.cos(angle)}
              y1={cy + innerR * Math.sin(angle)}
              x2={cx + outerR * Math.cos(angle)}
              y2={cy + outerR * Math.sin(angle)}
              stroke="var(--text-dim)"
              strokeWidth={0.5}
            />
          );
        })}

        <g style={{
          transform: `translate(${dotX}px, ${dotY}px)`,
          transition: prefersReduced ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <circle r={3} fill={dotColor} style={{ transition: prefersReduced ? 'none' : 'fill 0.3s ease' }} />
        </g>

        {label && (
          <text
            x={cx}
            y={cy + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: 7,
              fill: 'var(--text-dim)',
              letterSpacing: '0.12em',
            }}
          >
            {label}
          </text>
        )}
      </svg>
    </div>
  );
}
