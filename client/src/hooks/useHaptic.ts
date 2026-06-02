type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [15, 50, 15],
  warning: [30, 100, 30],
  error: [50, 30, 50, 30, 50],
};

/**
 * Vibration API wrapper. Silently no-ops on unsupported devices.
 */
export function useHaptic() {
  const trigger = (pattern: HapticPattern = 'light') => {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
    try {
      navigator.vibrate(PATTERNS[pattern]);
    } catch {
      // ignore
    }
  };

  return { trigger };
}
