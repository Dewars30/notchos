import { useRef, useEffect } from 'react';

interface MurmurationRingProps {
  value: number;       // 0-100
  size?: number;       // canvas diameter, default 56
  label?: string;      // label below ring
}

interface Particle {
  angle: number;       // position on ring (radians)
  drift: number;       // offset from ring center (±3px)
  speed: number;       // angular velocity
  driftSpeed: number;  // drift oscillation speed
}

// Color thresholds: teal (<70) -> gold (70-90) -> coral (90+)
function getColor(value: number): string {
  if (value < 70) return '#38A89A';
  if (value < 90) return '#D4AE48';
  return '#E08870';
}

// Particle count scales with value
function getParticleCount(value: number): number {
  return Math.round((value / 100) * 280);
}

export function MurmurationRing({ value, size = 56, label }: MurmurationRingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const count = getParticleCount(value);
    // Initialize particles distributed around the ring
    particlesRef.current = Array.from({ length: count }, () => ({
      angle: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 6,
      speed: (0.002 + Math.random() * 0.004) * (1 + value / 100),
      driftSpeed: 0.01 + Math.random() * 0.02,
    }));
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = (size - 8) / 2;
    const color = getColor(value);

    function draw() {
      ctx!.clearRect(0, 0, size, size);

      // Guide ring -- always visible at 6% opacity
      ctx!.beginPath();
      ctx!.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx!.strokeStyle = 'rgba(56, 168, 154, 0.06)';
      ctx!.lineWidth = 1;
      ctx!.stroke();

      // Particles
      const particles = particlesRef.current;
      for (const p of particles) {
        p.angle += p.speed;
        p.drift += Math.sin(p.angle * 3) * 0.1;
        p.drift = Math.max(-3, Math.min(3, p.drift));

        const r = radius + p.drift;
        const x = cx + Math.cos(p.angle) * r;
        const y = cy + Math.sin(p.angle) * r;

        ctx!.beginPath();
        ctx!.arc(x, y, 0.6, 0, Math.PI * 2);
        ctx!.fillStyle = color;
        ctx!.globalAlpha = 0.5 + Math.random() * 0.3;
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      // Center value text
      ctx!.font = '600 12px Sora, system-ui, sans-serif';
      ctx!.fillStyle = '#E0D8D0';
      ctx!.textAlign = 'center';
      ctx!.textBaseline = 'middle';
      ctx!.fillText(`${value}%`, cx, cy);

      rafRef.current = requestAnimationFrame(draw);
    }

    // Respect reduced motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      // Static render -- just draw once
      draw();
      cancelAnimationFrame(rafRef.current);
    } else {
      draw();
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [value, size]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${label ?? 'Metric'}: ${value}%`}
      />
      {label && (
        <span style={{
          fontFamily: 'var(--font-label)',
          fontSize: 7,
          color: 'var(--text-dim)',
          letterSpacing: '0.12em',
        }}>
          {label}
        </span>
      )}
    </div>
  );
}
