export interface PendingApproval {
  approvalId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  summary: string;
}

export interface Session {
  id: string;
  agent: string;
  status: "running" | "waiting" | "done" | "error";
  currentTool: string | null;
  pendingApproval: PendingApproval | null;
  lastMessage: string | null;
  startedAt: number;
  updatedAt: number;
}

export type AgentName = "claude" | "codex" | "gemini" | string;
