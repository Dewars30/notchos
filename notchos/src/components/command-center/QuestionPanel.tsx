import { useEffect } from 'react';
import type { RiskTier } from '../../types';

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
    <div style={{
      borderLeft: riskTier === 'high' ? '0.5px solid var(--coral)' : riskTier === 'medium' ? '0.5px solid var(--gold)' : '0.5px solid transparent',
      paddingLeft: riskTier !== 'low' ? 8 : 0,
      background: riskTier === 'high' ? 'var(--coral-dim)' : 'transparent',
      borderRadius: riskTier === 'high' ? 4 : 0,
    }}>
      {/* Question badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          fontFamily: 'var(--font-label)',
          fontSize: 8,
          color: risk.text,
          background: risk.bg,
          border: `0.5px solid ${risk.border}`,
          borderRadius: 3,
          padding: '2px 6px',
          letterSpacing: '0.08em',
        }}>
          QUESTION
        </span>
      </div>

      {/* Question text */}
      <div style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        color: 'var(--text-1)',
        marginBottom: 12,
        lineHeight: '18px',
      }}>
        {question}
      </div>

      {/* Option buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {options.map((option, i) => (
          <button
            key={i}
            onClick={() => onAnswer(questionId, option)}
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 10,
              fontWeight: 500,
              color: 'var(--text-1)',
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--stroke)',
              borderRadius: 4,
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textAlign: 'left',
              transition: 'background 100ms',
            }}
          >
            <span style={{
              fontFamily: 'var(--font-data)',
              fontSize: 9,
              color: 'var(--teal)',
              flexShrink: 0,
            }}>
              ⌘{i + 1}
            </span>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
