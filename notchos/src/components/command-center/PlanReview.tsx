import { useState, useEffect } from 'react';
import styles from './PlanReview.module.css';

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
    <div className={styles.container}>
      {/* Badge */}
      <div className={styles.badgeRow}>
        <span className={styles.badge}>PLAN REVIEW</span>
      </div>

      {/* Plan content — rendered as pre-formatted text (simple Markdown) */}
      <div className={styles.planContent}>
        {planMarkdown}
      </div>

      {/* Feedback input (shown on request changes) */}
      {showFeedback && (
        <div className={styles.feedbackWrapper}>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What should change?"
            className={styles.feedbackTextarea}
          />
          <button
            onClick={() => { onRequestChanges(reviewId, feedback); setShowFeedback(false); }}
            className={styles.sendButton}
          >
            Send Feedback
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className={styles.actionRow}>
        <button onClick={() => onApprove(reviewId)} className={styles.approveButton}>
          Approve <span className={styles.shortcutHint}>⌘Y</span>
        </button>
        <button onClick={() => onDeny(reviewId)} className={styles.denyButton}>
          Deny <span className={styles.shortcutHint}>⌘N</span>
        </button>
        <button onClick={() => setShowFeedback(!showFeedback)} className={styles.changesButton}>
          Changes
        </button>
      </div>
    </div>
  );
}
