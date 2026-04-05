import type { ReactNode } from 'react';
import styles from './ZoneLabel.module.css';

interface ZoneLabelProps {
  children: ReactNode;
}

export function ZoneLabel({ children }: ZoneLabelProps) {
  return (
    <span className={styles.label}>
      {children}
    </span>
  );
}
