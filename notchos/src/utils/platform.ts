// Platform detection for keyboard symbol display

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

export const MOD = isMac ? '⌘' : 'Ctrl+';
export const MOD_SHIFT = isMac ? '⌘⇧' : 'Ctrl+Shift+';
