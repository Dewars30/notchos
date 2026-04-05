import { useState, useEffect } from 'react';
import styles from './CommandCenter.module.css';
import type { Agent, TimelineEvent, SessionMetrics } from '../../types';
import { TopBar } from './TopBar';
import { AgentRoster } from './AgentRoster';
import { ActiveSession } from './ActiveSession';
import { HistoryView } from './HistoryView';
import { MetricsRail } from './MetricsRail';
import { EventTimeline } from './EventTimeline';
import { SpacetimeGrid } from './SpacetimeGrid';

interface CommandCenterProps {
  agents: Agent[];
  selectedAgentId: string | null;
  metrics: SessionMetrics;
  timeline: TimelineEvent[];
  onSelectAgent: (id: string) => void;
  onApprove: (approvalId: string) => void;
  onDeny: (approvalId: string) => void;
  onJumpToTerminal?: (agentId: string) => void;
}

export function CommandCenter({
  agents,
  selectedAgentId,
  metrics,
  timeline,
  onSelectAgent,
  onApprove,
  onDeny,
  onJumpToTerminal,
}: CommandCenterProps) {
  const selectedAgent = agents.find(a => a.id === selectedAgentId) ?? null;
  const activeAgentCount = agents.filter(a => a.status === 'writing' || a.status === 'executing').length;
  const hasHighRiskPending = agents.some(a => a.pendingApproval?.riskTier === 'high');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault();
        setShowHistory(prev => !prev);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className={styles.container}>
      <SpacetimeGrid
        riskTier={selectedAgent?.pendingApproval?.riskTier ?? 'low'}
        activeAgentCount={activeAgentCount}
        hasHighRiskPending={hasHighRiskPending}
      />
      <TopBar
        agents={agents}
        selectedAgentId={selectedAgentId}
        metrics={metrics}
        onSelectAgent={onSelectAgent}
      />
      <AgentRoster
        agents={agents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={onSelectAgent}
        onJumpToTerminal={onJumpToTerminal}
      />
      {showHistory ? (
        <HistoryView />
      ) : (
        <ActiveSession
          agent={selectedAgent}
          onApprove={onApprove}
          onDeny={onDeny}
        />
      )}
      <MetricsRail metrics={metrics} />
      <EventTimeline events={timeline} />
    </div>
  );
}
