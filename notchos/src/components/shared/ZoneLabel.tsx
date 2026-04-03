import type { ReactNode } from 'react';

interface ZoneLabelProps {
  children: ReactNode;
}

export function ZoneLabel({ children }: ZoneLabelProps) {
  return (
    <span style={{
      fontFamily: 'var(--font-label)',
      fontSize: 7,
      color: 'var(--text-dim)',
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
      lineHeight: 1,
    }}>
      {children}
    </span>
  );
}
