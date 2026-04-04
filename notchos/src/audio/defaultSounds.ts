// Default sound definitions — procedurally generated via Web Audio API
export interface SoundDef {
  waveform: OscillatorType;
  frequency: number;
  duration: number; // ms
  gain: number; // 0-1
  ramp?: number; // frequency end for sweep effects
}

export const DEFAULT_SOUNDS: Record<string, SoundDef> = {
  agentStarted: { waveform: 'sine', frequency: 440, duration: 100, gain: 0.15 },
  toolComplete: { waveform: 'square', frequency: 600, duration: 50, gain: 0.08 },
  approvalRequested: { waveform: 'sine', frequency: 520, duration: 200, gain: 0.2 },
  highRiskApproval: { waveform: 'square', frequency: 380, duration: 250, gain: 0.25, ramp: 300 },
  agentFinished: { waveform: 'sine', frequency: 660, duration: 150, gain: 0.15, ramp: 880 },
  error: { waveform: 'sawtooth', frequency: 200, duration: 200, gain: 0.2 },
};
