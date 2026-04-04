import { useRef, useEffect } from 'react';

interface StreamDef {
  value: number;    // 0-100, density of this stream
  color: string;    // hex color for this agent's particles
  speed: number;    // multiplier (1.0 = normal, 2.0 = fast)
}

interface MurmurationRingProps {
  value: number;       // 0-100
  size?: number;       // canvas diameter, default 56
  label?: string;      // label below ring
  streams?: StreamDef[];  // multi-stream mode: each agent gets its own particle stream
}

interface Particle {
  angle: number;       // position on ring (radians)
  drift: number;       // offset from ring center (±3px)
  speed: number;       // angular velocity
  driftSpeed: number;  // drift oscillation speed
}

interface StreamParticles {
  color: string;
  speedMultiplier: number;
  particles: Particle[];
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

// Blend an array of hex colors at low alpha for guide ring tinting
function blendHexColors(colors: string[]): string {
  if (colors.length === 0) return 'rgba(56, 168, 154, 0.06)';
  let r = 0, g = 0, b = 0;
  for (const hex of colors) {
    const clean = hex.replace('#', '');
    r += parseInt(clean.substring(0, 2), 16);
    g += parseInt(clean.substring(2, 4), 16);
    b += parseInt(clean.substring(4, 6), 16);
  }
  r = Math.round(r / colors.length);
  g = Math.round(g / colors.length);
  b = Math.round(b / colors.length);
  return `rgba(${r}, ${g}, ${b}, 0.06)`;
}

export function MurmurationRing({ value, size = 56, label, streams }: MurmurationRingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const streamParticlesRef = useRef<StreamParticles[]>([]);
  const rafRef = useRef<number>(0);
  const isMultiStream = streams != null && streams.length > 0;

  // Single-value mode particle init
  useEffect(() => {
    if (isMultiStream) return;
    const count = getParticleCount(value);
    // Initialize particles distributed around the ring
    particlesRef.current = Array.from({ length: count }, () => ({
      angle: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 6,
      speed: (0.002 + Math.random() * 0.004) * (1 + value / 100),
      driftSpeed: 0.01 + Math.random() * 0.02,
    }));
  }, [value, isMultiStream]);

  // Multi-stream mode particle init
  useEffect(() => {
    if (!isMultiStream) return;
    streamParticlesRef.current = streams.map((s) => {
      const count = Math.round((s.value / 100) * 70);
      return {
        color: s.color,
        speedMultiplier: s.speed,
        particles: Array.from({ length: count }, () => ({
          angle: Math.random() * Math.PI * 2,
          drift: (Math.random() - 0.5) * 6,
          speed: (0.002 + Math.random() * 0.004) * s.speed,
          driftSpeed: 0.01 + Math.random() * 0.02,
        })),
      };
    });
  }, [streams, isMultiStream]);

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

    function draw() {
      ctx!.clearRect(0, 0, size, size);

      if (isMultiStream) {
        // -- Multi-stream mode --

        // Determine dense swarm: all streams > 80
        const allHigh = streams.every((s) => s.value > 80);
        const driftClamp = allHigh ? 1 : 3;

        // Guide ring tinted by blended stream colors
        ctx!.beginPath();
        ctx!.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx!.strokeStyle = blendHexColors(streams.map((s) => s.color));
        ctx!.lineWidth = 1;
        ctx!.stroke();

        // Draw each stream's particles
        for (const sp of streamParticlesRef.current) {
          for (const p of sp.particles) {
            p.angle += p.speed;
            p.drift += Math.sin(p.angle * 3) * 0.1;
            p.drift = Math.max(-driftClamp, Math.min(driftClamp, p.drift));

            const r = radius + p.drift;
            const x = cx + Math.cos(p.angle) * r;
            const y = cy + Math.sin(p.angle) * r;

            ctx!.beginPath();
            ctx!.arc(x, y, 0.6, 0, Math.PI * 2);
            ctx!.fillStyle = sp.color;
            ctx!.globalAlpha = 0.5 + Math.random() * 0.3;
            ctx!.fill();
          }
        }
        ctx!.globalAlpha = 1;

        // Center value text: show average of all streams
        const avg = Math.round(
          streams.reduce((sum, s) => sum + s.value, 0) / streams.length
        );
        ctx!.font = '600 12px Sora, system-ui, sans-serif';
        ctx!.fillStyle = '#E0D8D0';
        ctx!.textAlign = 'center';
        ctx!.textBaseline = 'middle';
        ctx!.fillText(`${avg}%`, cx, cy);
      } else {
        // -- Single-value mode (original behavior) --
        const color = getColor(value);

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
      }

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
  }, [value, size, streams, isMultiStream]);

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
