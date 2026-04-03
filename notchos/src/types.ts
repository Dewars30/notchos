// Agent status — maps to orbital frequency animations
export type AgentStatus = 'idle' | 'writing' | 'waiting' | 'executing' | 'error';

// Risk tier — controls gravitational weight (spacing, density, grid intensity)
export type RiskTier = 'low' | 'medium' | 'high';

export interface DiffLine {
  type: 'context' | 'addition' | 'deletion';
  content: string;
  lineNumber?: number;
}

export interface PendingApproval {
  approvalId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  summary: string;
  riskTier: RiskTier;
  filePath?: string;
  impactFiles?: number;
  impactDeps?: number;
  diff?: DiffLine[];
}

export interface Agent {
  id: string;
  name: string;
  abbreviation: string;
  model: string;
  status: AgentStatus;
  cost: number;
  elapsedSeconds: number;
  currentTool: string | null;
  pendingApproval: PendingApproval | null;
}

export interface TimelineEvent {
  id: string;
  timestamp: number;
  riskTier: RiskTier;
  type: 'auto-approved' | 'pending' | 'approved' | 'denied';
  agentId: string;
}

export interface SessionMetrics {
  contextHealth: number;
  totalTokens: number;
  totalCost: number;
  approvalsTotal: number;
  approvalsDenied: number;
}

// Legacy — existing Tauri backend commands
export interface Session {
  id: string;
  agent: string;
  status: 'running' | 'waiting' | 'done' | 'error';
  currentTool: string | null;
  pendingApproval: {
    approvalId: string;
    toolName: string;
    toolInput: Record<string, unknown>;
    summary: string;
  } | null;
  lastMessage: string | null;
  startedAt: number;
  updatedAt: number;
}

export type AgentName = 'claude' | 'codex' | 'gemini' | string;
