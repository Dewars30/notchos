import { useState, useEffect, useCallback, useRef } from 'react';
import type { Agent, AgentStatus, BackendSession, SessionMetrics, TimelineEvent, AgentRegistryEntry } from '../types';
import { playSound } from '../audio/SoundEngine';

const isTauri = '__TAURI_INTERNALS__' in window;

const AGENT_REGISTRY: Record<string, AgentRegistryEntry> = {
  claude: { name: 'Claude Code', abbreviation: 'CC', model: 'opus-4' },
  codex: { name: 'Codex', abbreviation: 'CX', model: 'o3' },
  gemini: { name: 'Gemini CLI', abbreviation: 'GM', model: '2.5-pro' },
  cursor: { name: 'Cursor', abbreviation: 'CR', model: 'unknown' },
  opencode: { name: 'OpenCode', abbreviation: 'OC', model: 'unknown' },
  droid: { name: 'Droid', abbreviation: 'DR', model: 'unknown' },
};

const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

function mapStatus(session: BackendSession): AgentStatus {
  switch (session.status) {
    case 'waiting': return 'waiting';
    case 'error': return 'error';
    case 'done': return 'idle';
    case 'running':
      if (!session.currentTool) return 'idle';
      if (WRITE_TOOLS.has(session.currentTool)) return 'writing';
      return 'executing';
    default: return 'idle';
  }
}

const COST_PER_MIN: Record<string, number> = {
  claude: 0.02, codex: 0.01, gemini: 0.005,
};

function mapSessionToAgent(session: BackendSession): Agent {
  const registry = AGENT_REGISTRY[session.agent] ?? {
    name: session.agent,
    abbreviation: session.agent.substring(0, 2).toUpperCase(),
    model: 'unknown',
  };
  const now = Math.floor(Date.now() / 1000);
  const costRate = COST_PER_MIN[session.agent] ?? 0.01;
  const elapsedMin = (now - session.startedAt) / 60;
  const estimatedCost = Math.round(elapsedMin * costRate * 100) / 100;
  return {
    id: session.id,
    name: registry.name,
    abbreviation: registry.abbreviation,
    model: registry.model,
    status: mapStatus(session),
    cost: estimatedCost,
    elapsedSeconds: now - session.startedAt,
    currentTool: session.currentTool,
    pendingApproval: session.pendingApproval ? {
      approvalId: session.pendingApproval.approvalId,
      toolName: session.pendingApproval.toolName,
      toolInput: session.pendingApproval.toolInput,
      summary: session.pendingApproval.summary,
      riskTier: session.pendingApproval.riskTier,
    } : null,
    cwd: session.cwd,
  };
}

export function useSessionBridge() {
  const prevAgentsRef = useRef<Agent[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [metrics, setMetrics] = useState<SessionMetrics>({
    contextHealth: 100,
    totalTokens: 0,
    totalCost: 0,
    approvalsTotal: 0,
    approvalsDenied: 0,
  });
  const [timeline] = useState<TimelineEvent[]>([]);

  const refreshSessions = useCallback(async () => {
    if (!isTauri) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const sessions = await invoke<BackendSession[]>('get_sessions');
      const newAgents = sessions.map(mapSessionToAgent);
      setAgents(newAgents);

      // Sound triggers — compare prev to new state
      const prev = prevAgentsRef.current;
      for (const agent of newAgents) {
        const prevAgent = prev.find(a => a.id === agent.id);
        if (!prevAgent) {
          // New agent appeared
          playSound('agentStarted');
        } else if (!prevAgent.pendingApproval && agent.pendingApproval) {
          // New approval request
          if (agent.pendingApproval.riskTier === 'high') {
            playSound('highRiskApproval');
          } else {
            playSound('approvalRequested');
          }
        } else if (prevAgent.status !== 'idle' && agent.status === 'idle') {
          // Agent finished
          playSound('agentFinished');
        } else if (prevAgent.status !== 'error' && agent.status === 'error') {
          playSound('error');
        }
      }
      prevAgentsRef.current = newAgents;
      const metricsData = await invoke<Record<string, number>>('get_session_metrics');
      setMetrics({
        contextHealth: metricsData.contextHealth ?? 100,
        totalTokens: metricsData.totalTokens ?? 0,
        totalCost: metricsData.totalCost ?? 0,
        approvalsTotal: metricsData.approvalsTotal ?? 0,
        approvalsDenied: metricsData.approvalsDenied ?? 0,
      });
    } catch (e) {
      console.error('[useSessionBridge] refresh failed:', e);
    }
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | undefined;
    (async () => {
      const { listen } = await import('@tauri-apps/api/event');
      unlisten = await listen('sessions_updated', () => {
        refreshSessions();
      });
      refreshSessions();
    })();
    const timer = setInterval(refreshSessions, 5000);
    return () => {
      unlisten?.();
      clearInterval(timer);
    };
  }, [refreshSessions]);

  return { agents, metrics, timeline, isLive: isTauri };
}
