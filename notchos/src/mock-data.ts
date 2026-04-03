import type { Agent, TimelineEvent, SessionMetrics } from './types';

export const MOCK_AGENTS: Agent[] = [
  {
    id: 'cc-1',
    name: 'Claude Code',
    abbreviation: 'CC',
    model: 'opus-4',
    status: 'idle',
    cost: 0.82,
    elapsedSeconds: 240,
    currentTool: null,
    pendingApproval: null,
  },
  {
    id: 'cx-1',
    name: 'Codex',
    abbreviation: 'CX',
    model: 'o3',
    status: 'writing',
    cost: 1.47,
    elapsedSeconds: 720,
    currentTool: 'write_file',
    pendingApproval: {
      approvalId: 'apr-1',
      toolName: 'Write',
      toolInput: { file_path: 'src/auth.ts' },
      summary: 'Modify authentication middleware',
      riskTier: 'medium',
      filePath: 'src/auth.ts',
      impactFiles: 3,
      impactDeps: 2,
      diff: [
        { type: 'context', content: 'import { verify } from "./jwt";', lineNumber: 1 },
        { type: 'context', content: '', lineNumber: 2 },
        { type: 'deletion', content: 'export function authenticate(req: Request) {', lineNumber: 3 },
        { type: 'addition', content: 'export async function authenticate(req: Request) {', lineNumber: 3 },
        { type: 'context', content: '  const token = req.headers.get("Authorization");', lineNumber: 4 },
        { type: 'deletion', content: '  return verify(token);', lineNumber: 5 },
        { type: 'addition', content: '  const payload = await verify(token);', lineNumber: 5 },
        { type: 'addition', content: '  if (!payload.scope.includes("admin")) {', lineNumber: 6 },
        { type: 'addition', content: '    throw new ForbiddenError("insufficient scope");', lineNumber: 7 },
        { type: 'addition', content: '  }', lineNumber: 8 },
        { type: 'addition', content: '  return payload;', lineNumber: 9 },
        { type: 'context', content: '}', lineNumber: 10 },
      ],
    },
  },
  {
    id: 'gm-1',
    name: 'Gemini CLI',
    abbreviation: 'GM',
    model: '2.5-pro',
    status: 'waiting',
    cost: 0.18,
    elapsedSeconds: 480,
    currentTool: null,
    pendingApproval: null,
  },
  {
    id: 'cx-2',
    name: 'Codex (prod)',
    abbreviation: 'CP',
    model: 'o3',
    status: 'writing',
    cost: 3.21,
    elapsedSeconds: 180,
    currentTool: 'Bash',
    pendingApproval: {
      approvalId: 'apr-2',
      toolName: 'Bash',
      toolInput: { command: 'rm -rf /var/data/cache && systemctl restart api' },
      summary: 'Destructive cache purge + service restart on production',
      riskTier: 'high',
      filePath: 'production',
      impactFiles: 0,
      impactDeps: 12,
      diff: [
        { type: 'context', content: '$ rm -rf /var/data/cache && systemctl restart api', lineNumber: 1 },
      ],
    },
  },
];

const now = Date.now() / 1000;

export const MOCK_TIMELINE: TimelineEvent[] = Array.from({ length: 24 }, (_, i) => {
  const riskPool: Array<'low' | 'medium' | 'high'> = [
    'low', 'low', 'low', 'medium', 'low', 'low', 'high', 'low',
    'medium', 'low', 'low', 'low', 'medium', 'low', 'low', 'low',
    'high', 'low', 'low', 'medium', 'low', 'low', 'low', 'medium',
  ];
  const typePool: Array<'auto-approved' | 'pending' | 'approved' | 'denied'> = [
    'auto-approved', 'auto-approved', 'auto-approved', 'approved',
    'auto-approved', 'auto-approved', 'denied', 'auto-approved',
    'pending', 'auto-approved', 'auto-approved', 'auto-approved',
    'approved', 'auto-approved', 'auto-approved', 'auto-approved',
    'approved', 'auto-approved', 'auto-approved', 'pending',
    'auto-approved', 'auto-approved', 'auto-approved', 'approved',
  ];
  const agentPool = ['cc-1', 'cx-1', 'gm-1'];

  return {
    id: `evt-${i}`,
    timestamp: now - (24 - i) * 30,
    riskTier: riskPool[i],
    type: typePool[i],
    agentId: agentPool[i % 3],
  };
});

export const MOCK_METRICS: SessionMetrics = {
  contextHealth: 66,
  totalTokens: 38200,
  totalCost: 2.47,
  approvalsTotal: 12,
  approvalsDenied: 2,
};
