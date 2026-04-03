import { useRef, useEffect } from 'react';
import type { RiskTier } from '../../types';

interface SpacetimeGridProps {
  riskTier: RiskTier;
  /** Normalized warp center (0-1 range for x and y within the grid area) */
  warpX?: number;
  warpY?: number;
}

const RISK_CONFIG: Record<RiskTier, { opacity: number; cellSize: number; warpStrength: number }> = {
  low:    { opacity: 0.010, cellSize: 28, warpStrength: 0 },
  medium: { opacity: 0.018, cellSize: 28, warpStrength: 12 },
  high:   { opacity: 0.035, cellSize: 22, warpStrength: 24 },
};

export function SpacetimeGrid({ riskTier, warpX = 0.5, warpY = 0.4 }: SpacetimeGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const { width, height } = parent.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { opacity, cellSize, warpStrength } = RISK_CONFIG[riskTier];

    function draw() {
      const w = canvas!.width / dpr;
      const h = canvas!.height / dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, w, h);

      const centerX = warpX * w;
      const centerY = warpY * h;

      ctx!.strokeStyle = `rgba(56, 168, 154, ${opacity})`;
      ctx!.lineWidth = 0.5;

      // Horizontal lines
      for (let y = 0; y < h; y += cellSize) {
        ctx!.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pull = warpStrength / (dist + 80);
          const warpedY = y + (centerY - y) * pull;
          if (x === 0) ctx!.moveTo(x, warpedY);
          else ctx!.lineTo(x, warpedY);
        }
        ctx!.stroke();
      }

      // Vertical lines
      for (let x = 0; x < w; x += cellSize) {
        ctx!.beginPath();
        for (let y = 0; y <= h; y += 4) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pull = warpStrength / (dist + 80);
          const warpedX = x + (centerX - x) * pull;
          if (y === 0) ctx!.moveTo(warpedX, y);
          else ctx!.lineTo(warpedX, y);
        }
        ctx!.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      draw();
      cancelAnimationFrame(rafRef.current);
    } else {
      draw();
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, [riskTier, warpX, warpY]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        borderRadius: 'inherit',
      }}
      aria-hidden="true"
    />
  );
}
