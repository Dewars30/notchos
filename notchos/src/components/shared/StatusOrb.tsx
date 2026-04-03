import type { AgentStatus } from '../../types';

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
}

export function StatusOrb({ status, size = 5 }: StatusOrbProps) {
  const color = STATUS_COLORS[status];
  const animation = RING_ANIMATIONS[status];
  const containerSize = size + 12;

  return (
    <span style={{
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: containerSize,
      height: containerSize,
      flexShrink: 0,
    }}>
      {/* Primary orbital ring */}
      <span style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: '50%',
        border: `0.5px solid ${color}`,
        animation,
        pointerEvents: 'none',
      }} />

      {/* Second ring for writing state (double-ring pulse) */}
      {status === 'writing' && (
        <span style={{
          position: 'absolute',
          top: -2,
          left: -2,
          right: -2,
          bottom: -2,
          borderRadius: '50%',
          border: `0.5px solid ${color}`,
          animation: 'orbit-write 0.9s ease-in-out infinite 0.45s',
          pointerEvents: 'none',
        }} />
      )}

      {/* Bioluminescent glow for executing state */}
      {status === 'executing' && (
        <span style={{
          position: 'absolute',
          top: -1,
          left: -1,
          right: -1,
          bottom: -1,
          borderRadius: '50%',
          background: color,
          opacity: 0.04,
          animation: 'glow-pulse 2s ease-in-out infinite',
          boxShadow: `0 0 6px ${color}`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Core orb */}
      <span style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        position: 'relative',
        zIndex: 1,
      }} />
    </span>
  );
}
