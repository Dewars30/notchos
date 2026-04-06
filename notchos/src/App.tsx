import { useState, useEffect, useRef, useCallback } from 'react';
import { Onboarding } from './components/Onboarding';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from './audio/SoundEngine';
// Safe invoke wrapper — falls back to console.log when running outside Tauri
const isTauri = '__TAURI_INTERNALS__' in window;
async function tauriInvoke(cmd: string, args?: Record<string, unknown>) {
  if (!isTauri) {
    console.log(`[dev] invoke("${cmd}",`, args, ')');
    return;
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke(cmd, args);
}
import { NotchBar } from './components/NotchBar';
import { ExpandedPill } from './components/ExpandedPill';
import { CommandCenter } from './components/command-center/CommandCenter';
import { MOCK_AGENTS, MOCK_METRICS, MOCK_TIMELINE } from './mock-data';
import { useSessionBridge } from './hooks/useSessionBridge';

type AppMode = 'notch' | 'pill' | 'command-center';

// Window dimensions per mode
const MODE_SIZES: Record<AppMode, { width: number; height: number; borderRadius: number }> = {
  notch: { width: 300, height: 48, borderRadius: 24 },
  pill: { width: 400, height: 200, borderRadius: 12 },
  'command-center': { width: 720, height: 420, borderRadius: 12 },
};

// Spring config — matches iOS Dynamic Island feel
const SPRING = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 1 };
const CONTENT_FADE = { duration: 0.15, ease: 'easeOut' as const };

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mode, setMode] = useState<AppMode>('notch');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const { agents: liveAgents, metrics: liveMetrics, timeline: liveTimeline, isLive } = useSessionBridge();
  // In Tauri (production): use real data only, no mock fallback
  // In browser (dev): use mock data for visual development
  const agents = isLive ? liveAgents : MOCK_AGENTS;
  const metrics = isLive ? liveMetrics : MOCK_METRICS;
  const timeline = isLive ? liveTimeline : MOCK_TIMELINE;
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCollapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoExpandedRef = useRef<string | null>(null);

  // First-run onboarding check
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('notchos-onboarding-complete');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  function handleOnboardingComplete() {
    localStorage.setItem('notchos-onboarding-complete', 'true');
    setShowOnboarding(false);
  }

  // Resize Tauri window on mode change
  useEffect(() => {
    const { width, height } = MODE_SIZES[mode];
    tauriInvoke('set_window_size', { width, height }).catch(() => {
      tauriInvoke('set_window_height', { height }).catch(() => {});
    });
  }, [mode]);

  // Global keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault();
        setMode(m => m === 'command-center' ? 'pill' : 'command-center');
        return;
      }
      if (e.key === 'Escape') {
        setMode(m => {
          if (m === 'command-center') return 'pill';
          if (m === 'pill') return 'notch';
          return m;
        });
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ']') {
        e.preventDefault();
        setSelectedAgentId(prev => {
          const idx = agents.findIndex(a => a.id === prev);
          const next = (idx + 1) % agents.length;
          return agents[next].id;
        });
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault();
        setSelectedAgentId(prev => {
          const idx = agents.findIndex(a => a.id === prev);
          const next = idx <= 0 ? agents.length - 1 : idx - 1;
          return agents[next].id;
        });
        return;
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [agents]);

  // Auto-expand on high-risk approval (only for real live sessions, not mock data)
  // Tracks the approvalId that triggered expansion to avoid re-trapping the user on mode change.
  useEffect(() => {
    if (!isLive) return;
    const highRisk = agents.find(a => a.pendingApproval?.riskTier === 'high');
    if (highRisk && mode !== 'command-center' && highRisk.pendingApproval!.approvalId !== lastAutoExpandedRef.current) {
      lastAutoExpandedRef.current = highRisk.pendingApproval!.approvalId;
      playSound('highRiskApproval');
      setSelectedAgentId(highRisk.id);
      setMode('command-center');
    }
  }, [agents, mode, isLive]);

  // --- Mode transition handlers ---

  function clearCollapseTimer() {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
  }

  function clearAutoCollapseTimer() {
    if (autoCollapseTimer.current) {
      clearTimeout(autoCollapseTimer.current);
      autoCollapseTimer.current = null;
    }
  }

  function expandToPill() {
    clearCollapseTimer();
    setMode('pill');
  }

  function startPillCollapse() {
    clearCollapseTimer();
    collapseTimer.current = setTimeout(() => {
      setMode(m => m === 'pill' ? 'notch' : m);
    }, 300);
  }

  function cancelPillCollapse() {
    clearCollapseTimer();
  }

  function handlePillAgentClick(agentId: string) {
    clearCollapseTimer();
    setSelectedAgentId(agentId);
    setMode('command-center');
  }

  function expandToCommandCenter() {
    clearCollapseTimer();
    setMode('command-center');
  }

  // Auto-collapse to pill after approve/deny (1.5s delay)
  const handleApprove = useCallback(async (approvalId: string) => {
    try {
      await tauriInvoke('approve', { approvalId, reason: null });
      playSound('approvalRequested');
      // Auto-collapse after 1.5s
      clearAutoCollapseTimer();
      autoCollapseTimer.current = setTimeout(() => {
        setMode('pill');
      }, 1500);
    } catch (e) {
      console.error('approve error', e);
    }
  }, []);

  const handleDeny = useCallback(async (approvalId: string) => {
    try {
      await tauriInvoke('deny', { approvalId, reason: null });
      playSound('error');
      clearAutoCollapseTimer();
      autoCollapseTimer.current = setTimeout(() => {
        setMode('pill');
      }, 1500);
    } catch (e) {
      console.error('deny error', e);
    }
  }, []);

  const handleJumpToTerminal = useCallback(async (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    try {
      await tauriInvoke('jump_to_terminal', { cwd: agentId });
      // Auto-collapse after terminal jump
      setMode('pill');
    } catch (e) {
      console.error('terminal jump error', e);
    }
  }, [agents]);

  useEffect(() => {
    return () => {
      clearCollapseTimer();
      clearAutoCollapseTimer();
    };
  }, []);

  const { width, height, borderRadius } = MODE_SIZES[mode];

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {showOnboarding ? (
        <Onboarding onComplete={handleOnboardingComplete} />
      ) : (
        /* Animated shell — morphs between modes with spring physics */
        <motion.div
          layout
          transition={SPRING}
          animate={{
            width,
            height,
            borderRadius,
          }}
          style={{
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <AnimatePresence mode="popLayout">
            {mode === 'notch' && (
              <motion.div
                key="notch"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={CONTENT_FADE}
                style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
              >
                <NotchBar
                  agents={agents}
                  metrics={metrics}
                  onHover={expandToPill}
                  onClick={expandToPill}
                  hasPending={agents.some(a => a.pendingApproval !== null)}
                  hasHighRisk={agents.some(a => a.pendingApproval?.riskTier === 'high')}
                />
              </motion.div>
            )}

            {mode === 'pill' && (
              <motion.div
                key="pill"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={CONTENT_FADE}
                style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
              >
                <ExpandedPill
                  agents={agents}
                  metrics={metrics}
                  onSelectAgent={handlePillAgentClick}
                  onExpandFull={expandToCommandCenter}
                  onMouseEnter={cancelPillCollapse}
                  onMouseLeave={startPillCollapse}
                  onJumpToTerminal={handleJumpToTerminal}
                />
              </motion.div>
            )}

            {mode === 'command-center' && (
              <motion.div
                key="command-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={CONTENT_FADE}
                style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
              >
                <CommandCenter
                  agents={agents}
                  selectedAgentId={selectedAgentId}
                  metrics={metrics}
                  timeline={timeline}
                  onSelectAgent={setSelectedAgentId}
                  onApprove={handleApprove}
                  onDeny={handleDeny}
                  onJumpToTerminal={handleJumpToTerminal}
                  onCollapse={() => setMode('pill')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
