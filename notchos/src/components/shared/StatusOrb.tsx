import { motion } from 'framer-motion';
import type { AgentStatus } from '../../types';
import styles from './StatusOrb.module.css';

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: 'var(--teal)',
  writing: 'var(--gold)',
  waiting: 'var(--steel)',
  executing: 'var(--ripple)',
  error: 'var(--coral)',
};

const ARC_CONFIGS: Record<AgentStatus, {
  arcs: Array<{ degrees: number; animation: string; duration: string }>;
}> = {
  idle: {
    arcs: [{ degrees: 90, animation: 'arc-idle', duration: '8s' }],
  },
  writing: {
    arcs: [
      { degrees: 60, animation: 'arc-write-cw', duration: '1.2s' },
      { degrees: 60, animation: 'arc-write-ccw', duration: '1.2s' },
    ],
  },
  waiting: {
    arcs: [{ degrees: 120, animation: 'arc-wait', duration: '2.4s' }],
  },
  executing: {
    arcs: [{ degrees: 270, animation: 'arc-exec', duration: '1.5s' }],
  },
  error: {
    arcs: [{ degrees: 45, animation: 'arc-error', duration: '0.3s' }],
  },
};

interface StatusOrbProps {
  status: AgentStatus;
  size?: number;
  layoutId?: string;
}

const LAYOUT_SPRING = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 1 };

export function StatusOrb({ status, size = 5, layoutId }: StatusOrbProps) {
  const color = STATUS_COLORS[status];
  const containerSize = size + 12;
  const arcConfig = ARC_CONFIGS[status];
  const svgSize = containerSize;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const arcRadius = (svgSize - 2) / 2;
  const circumference = 2 * Math.PI * arcRadius;

  const children = (
    <>
      <svg
        className={`${styles.arcSvg} instrument-arc`}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
      >
        {arcConfig.arcs.map((arc, i) => {
          const dashLength = (arc.degrees / 360) * circumference;
          const gapLength = circumference - dashLength;
          const rotateOffset = arcConfig.arcs.length > 1 && i === 1 ? 180 : 0;
          const arcStyle = {
            transformOrigin: `${cx}px ${cy}px`,
            transform: `rotate(${rotateOffset}deg)`,
            animation: `${arc.animation} ${arc.duration} linear infinite`,
          };

          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={arcRadius}
              fill="none"
              stroke={color}
              strokeWidth={0.5}
              strokeLinecap="round"
              strokeDasharray={`${dashLength} ${gapLength}`}
              opacity={0.6}
              style={arcStyle}
            />
          );
        })}
      </svg>

      {status === 'executing' && (
        <span
          className={styles.glow}
          style={{
            background: color,
            animation: 'glow-pulse 2s ease-in-out infinite',
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      )}

      <span
        className={styles.core}
        style={{ width: size, height: size, background: color }}
      />
    </>
  );

  if (layoutId) {
    return (
      <motion.span
        layoutId={layoutId}
        layout
        transition={LAYOUT_SPRING}
        role="img"
        aria-label={`Status: ${status}`}
        className={styles.container}
        style={{ width: containerSize, height: containerSize }}
      >
        {children}
      </motion.span>
    );
  }

  return (
    <span
      role="img"
      aria-label={`Status: ${status}`}
      className={styles.container}
      style={{ width: containerSize, height: containerSize }}
    >
      {children}
    </span>
  );
}
