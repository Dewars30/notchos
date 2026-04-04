import { useState, useEffect, useCallback } from 'react';
import type { Agent, AgentStatus, BackendSession, SessionMetrics, TimelineEvent, AgentRegistryEntry } from '../types';

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

function mapSessionToAgent(session: BackendSession): Agent {
  const registry = AGENT_REGISTRY[session.agent] ?? {
    name: session.agent,
    abbreviation: session.agent.substring(0, 2).toUpperCase(),
    model: 'unknown',
  };
  const now = Math.floor(Date.now() / 1000);
  return {
    id: session.id,
    name: registry.name,
    abbreviation: registry.abbreviation,
    model: registry.model,
    status: mapStatus(session),
    cost: 0,
    elapsedSeconds: now - session.startedAt,
    currentTool: session.currentTool,
    pendingApproval: session.pendingApproval ? {
      approvalId: session.pendingApproval.approvalId,
      toolName: session.pendingApproval.toolName,
      toolInput: session.pendingApproval.toolInput,
      summary: session.pendingApproval.summary,
      riskTier: session.pendingApproval.riskTier,
    } : null,
  };
}

export function useSessionBridge() {
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
      setAgents(sessions.map(mapSessionToAgent));
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
