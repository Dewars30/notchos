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

const RING_ANIMATIONS: Record<AgentStatus, string> = {
  idle: 'orbit-idle 3.5s ease-in-out infinite',
  writing: 'orbit-write 0.9s ease-in-out infinite',
  waiting: 'orbit-wait 2.4s ease-in-out infinite',
  executing: 'orbit-exec 2s ease-in-out infinite',
  error: 'orbit-error 0.3s ease-in-out infinite alternate',
};

interface StatusOrbProps {
  status: AgentStatus;
  size?: number;
  layoutId?: string;
}

const LAYOUT_SPRING = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 1 };

export function StatusOrb({ status, size = 5, layoutId }: StatusOrbProps) {
  const color = STATUS_COLORS[status];
  const animation = RING_ANIMATIONS[status];
  const containerSize = size + 12;

  const children = (
    <>
      {/* Primary orbital ring */}
      <span
        className={`orb-ring ${styles.ring}`}
        style={{ borderColor: color, animation }}
      />

      {/* Second ring for writing state */}
      {status === 'writing' && (
        <span
          className={`orb-ring ${styles.ringOuter}`}
          style={{
            borderColor: color,
            animation: 'orbit-write 0.9s ease-in-out infinite 0.45s',
          }}
        />
      )}

      {/* Bioluminescent glow for executing state */}
      {status === 'executing' && (
        <span
          className={`orb-glow ${styles.glow}`}
          style={{
            background: color,
            animation: 'glow-pulse 2s ease-in-out infinite',
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      )}

      {/* Core orb */}
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
