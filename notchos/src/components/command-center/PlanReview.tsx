import { useState, useEffect } from 'react';

interface PlanReviewProps {
  reviewId: string;
  planMarkdown: string;
  onApprove: (reviewId: string) => void;
  onDeny: (reviewId: string) => void;
  onRequestChanges: (reviewId: string, feedback: string) => void;
}

export function PlanReview({ reviewId, planMarkdown, onApprove, onDeny, onRequestChanges }: PlanReviewProps) {
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  // Keyboard: ⌘Y approve, ⌘N deny
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        onApprove(reviewId);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        onDeny(reviewId);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [reviewId, onApprove, onDeny]);

  return (
    <div style={{
      borderLeft: '0.5px solid var(--gold)',
      paddingLeft: 8,
    }}>
      {/* Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          fontFamily: 'var(--font-label)',
          fontSize: 8,
          color: 'var(--gold)',
          background: 'var(--gold-dim)',
          border: '0.5px solid var(--gold-border)',
          borderRadius: 3,
          padding: '2px 6px',
          letterSpacing: '0.08em',
        }}>
          PLAN REVIEW
        </span>
      </div>

      {/* Plan content — rendered as pre-formatted text (simple Markdown) */}
      <div style={{
        background: 'var(--bg-base)',
        borderRadius: 4,
        border: '0.5px solid var(--bg-elevated)',
        padding: 10,
        marginBottom: 8,
        overflow: 'auto',
        maxHeight: 300,
        fontFamily: 'var(--font-data)',
        fontSize: 9,
        lineHeight: '16px',
        color: 'var(--text-2)',
        whiteSpace: 'pre-wrap',
      }}>
        {planMarkdown}
      </div>

      {/* Feedback input (shown on request changes) */}
      {showFeedback && (
        <div style={{ marginBottom: 8 }}>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What should change?"
            style={{
              width: '100%',
              minHeight: 48,
              fontFamily: 'var(--font-data)',
              fontSize: 9,
              color: 'var(--text-1)',
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--stroke)',
              borderRadius: 4,
              padding: 6,
              resize: 'vertical',
            }}
          />
          <button
            onClick={() => { onRequestChanges(reviewId, feedback); setShowFeedback(false); }}
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 9,
              color: 'var(--gold)',
              background: 'var(--gold-dim)',
              border: '0.5px solid var(--gold-border)',
              borderRadius: 4,
              padding: '3px 8px',
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            Send Feedback
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onApprove(reviewId)} style={{
          fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 500,
          color: 'rgba(56,168,154,0.85)', background: 'rgba(56,168,154,0.08)',
          border: '0.5px solid rgba(56,168,154,0.20)', borderRadius: 4,
          padding: '4px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          Approve <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, opacity: 0.4 }}>⌘Y</span>
        </button>
        <button onClick={() => onDeny(reviewId)} style={{
          fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 500,
          color: 'rgba(224,136,112,0.70)', background: 'rgba(224,136,112,0.05)',
          border: '0.5px solid rgba(224,136,112,0.12)', borderRadius: 4,
          padding: '4px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          Deny <span style={{ fontFamily: 'var(--font-data)', fontSize: 8, opacity: 0.4 }}>⌘N</span>
        </button>
        <button onClick={() => setShowFeedback(!showFeedback)} style={{
          fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 500,
          color: 'var(--gold)', background: 'var(--gold-dim)',
          border: '0.5px solid var(--gold-border)', borderRadius: 4,
          padding: '4px 12px', cursor: 'pointer',
        }}>
          Changes
        </button>
      </div>
    </div>
  );
}
