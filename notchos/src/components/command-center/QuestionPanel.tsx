import { useEffect } from 'react';
import type { RiskTier } from '../../types';
import { MOD } from '../../utils/platform';
import styles from './QuestionPanel.module.css';

interface QuestionPanelProps {
  questionId: string;
  question: string;
  options: string[];
  riskTier: RiskTier;
  onAnswer: (questionId: string, answer: string) => void;
}

const RISK_STYLES: Record<RiskTier, { bg: string; border: string; text: string }> = {
  low: { bg: 'var(--teal-dim)', border: 'var(--teal-border)', text: 'var(--teal)' },
  medium: { bg: 'var(--gold-dim)', border: 'var(--gold-border)', text: 'var(--gold)' },
  high: { bg: 'var(--coral-dim)', border: 'var(--coral-border)', text: 'var(--coral)' },
};

function classifyQuestionRisk(question: string): RiskTier {
  const q = question.toLowerCase();
  if (q.includes('production') || q.includes('deploy') || q.includes('delete') || q.includes('drop')) {
    return 'high';
  }
  if (q.includes('config') || q.includes('env') || q.includes('secret')) {
    return 'medium';
  }
  return 'low';
}

export function QuestionPanel({ questionId, question, options, onAnswer }: QuestionPanelProps) {
  const riskTier = classifyQuestionRisk(question);
  const risk = RISK_STYLES[riskTier];

  // Keyboard shortcuts: ⌘1, ⌘2, ⌘3, ⌘4
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= options.length) {
        e.preventDefault();
        onAnswer(questionId, options[num - 1]);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [questionId, options, onAnswer]);

  return (
    <div
      className={styles.container}
      style={{
        borderLeft: riskTier === 'high' ? '0.5px solid var(--coral)' : riskTier === 'medium' ? '0.5px solid var(--gold)' : '0.5px solid transparent',
        paddingLeft: riskTier !== 'low' ? 8 : 0,
        background: riskTier === 'high' ? 'var(--coral-dim)' : 'transparent',
        borderRadius: riskTier === 'high' ? 4 : 0,
      }}
    >
      {/* Question badge */}
      <div className={styles.badgeRow}>
        <span
          className={styles.badge}
          style={{
            color: risk.text,
            background: risk.bg,
            border: `0.5px solid ${risk.border}`,
          }}
        >
          QUESTION
        </span>
      </div>

      {/* Question text */}
      <div className={styles.questionText}>
        {question}
      </div>

      {/* Option buttons */}
      <div className={styles.optionList}>
        {options.map((option, i) => (
          <button
            key={i}
            onClick={() => onAnswer(questionId, option)}
            className={styles.optionButton}
          >
            <span className={styles.shortcut}>{MOD}{i + 1}</span>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
