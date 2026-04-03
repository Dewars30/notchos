import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { NotchBar } from './components/NotchBar';
import { ExpandedPill } from './components/ExpandedPill';
import { CommandCenter } from './components/command-center/CommandCenter';
import { MOCK_AGENTS, MOCK_METRICS, MOCK_TIMELINE } from './mock-data';

type AppMode = 'notch' | 'pill' | 'command-center';

// Window dimensions per mode
const MODE_SIZES: Record<AppMode, { width: number; height: number }> = {
  notch: { width: 220, height: 48 },
  pill: { width: 400, height: 200 },
  'command-center': { width: 720, height: 420 },
};

export default function App() {
  const [mode, setMode] = useState<AppMode>('notch');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resize Tauri window on mode change
  useEffect(() => {
    const { width, height } = MODE_SIZES[mode];
    invoke('set_window_size', { width, height }).catch(() => {
      // Fallback: try height-only resize from old API
      invoke('set_window_height', { height }).catch(() => {});
    });
  }, [mode]);

  // Global keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // ⌘⇧N — toggle command center
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault();
        setMode(m => m === 'command-center' ? 'pill' : 'command-center');
        return;
      }
      // Esc — dismiss one level
      if (e.key === 'Escape') {
        setMode(m => {
          if (m === 'command-center') return 'pill';
          if (m === 'pill') return 'notch';
          return m;
        });
        return;
      }
      // ⌘] — next agent
      if ((e.metaKey || e.ctrlKey) && e.key === ']') {
        e.preventDefault();
        setSelectedAgentId(prev => {
          const idx = MOCK_AGENTS.findIndex(a => a.id === prev);
          const next = (idx + 1) % MOCK_AGENTS.length;
          return MOCK_AGENTS[next].id;
        });
        return;
      }
      // ⌘[ — previous agent
      if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault();
        setSelectedAgentId(prev => {
          const idx = MOCK_AGENTS.findIndex(a => a.id === prev);
          const next = idx <= 0 ? MOCK_AGENTS.length - 1 : idx - 1;
          return MOCK_AGENTS[next].id;
        });
        return;
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Auto-expand on high-risk approval
  useEffect(() => {
    const highRisk = MOCK_AGENTS.find(
      a => a.pendingApproval?.riskTier === 'high'
    );
    if (highRisk && mode !== 'command-center') {
      setSelectedAgentId(highRisk.id);
      setMode('command-center');
    }
  }, [mode]);

  // --- Mode transition handlers ---

  function clearCollapseTimer() {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
  }

  // Notch → Pill (hover or click)
  function expandToPill() {
    clearCollapseTimer();
    setMode('pill');
  }

  // Pill → Notch (mouse leave with 300ms delay)
  function startPillCollapse() {
    clearCollapseTimer();
    collapseTimer.current = setTimeout(() => {
      setMode('notch');
    }, 300);
  }

  function cancelPillCollapse() {
    clearCollapseTimer();
  }

  // Pill → Command Center (click agent)
  function handlePillAgentClick(agentId: string) {
    clearCollapseTimer();
    setSelectedAgentId(agentId);
    setMode('command-center');
  }

  // Pill → Command Center (⌘⇧N button)
  function expandToCommandCenter() {
    clearCollapseTimer();
    setMode('command-center');
  }

  const handleApprove = useCallback(async (approvalId: string) => {
    try {
      await invoke('approve', { approvalId, reason: null });
    } catch (e) {
      console.error('approve error', e);
    }
  }, []);

  const handleDeny = useCallback(async (approvalId: string) => {
    try {
      await invoke('deny', { approvalId, reason: null });
    } catch (e) {
      console.error('deny error', e);
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearCollapseTimer();
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {mode === 'notch' && (
        <NotchBar
          agents={MOCK_AGENTS}
          metrics={MOCK_METRICS}
          onHover={expandToPill}
          onClick={expandToPill}
        />
      )}

      {mode === 'pill' && (
        <ExpandedPill
          agents={MOCK_AGENTS}
          metrics={MOCK_METRICS}
          onSelectAgent={handlePillAgentClick}
          onExpandFull={expandToCommandCenter}
          onMouseEnter={cancelPillCollapse}
          onMouseLeave={startPillCollapse}
        />
      )}

      {mode === 'command-center' && (
        <CommandCenter
          agents={MOCK_AGENTS}
          selectedAgentId={selectedAgentId}
          metrics={MOCK_METRICS}
          timeline={MOCK_TIMELINE}
          onSelectAgent={setSelectedAgentId}
          onApprove={handleApprove}
          onDeny={handleDeny}
        />
      )}
    </div>
  );
}
