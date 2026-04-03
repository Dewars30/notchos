import './CommandCenter.css';
import type { Agent, TimelineEvent, SessionMetrics } from '../../types';
import { TopBar } from './TopBar';
import { AgentRoster } from './AgentRoster';
import { ActiveSession } from './ActiveSession';
import { MetricsRail } from './MetricsRail';
import { EventTimeline } from './EventTimeline';

interface CommandCenterProps {
  agents: Agent[];
  selectedAgentId: string | null;
  metrics: SessionMetrics;
  timeline: TimelineEvent[];
  onSelectAgent: (id: string) => void;
  onApprove: (approvalId: string) => void;
  onDeny: (approvalId: string) => void;
}

export function CommandCenter({
  agents,
  selectedAgentId,
  metrics,
  timeline,
  onSelectAgent,
  onApprove,
  onDeny,
}: CommandCenterProps) {
  const selectedAgent = agents.find(a => a.id === selectedAgentId) ?? null;

  return (
    <div className="command-center">
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
      />
      <ActiveSession
        agent={selectedAgent}
        onApprove={onApprove}
        onDeny={onDeny}
      />
      <MetricsRail metrics={metrics} />
      <EventTimeline events={timeline} />
    </div>
  );
}
