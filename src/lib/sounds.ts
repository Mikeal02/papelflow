// Elite micro-interaction sound & haptic system
// Synthesizes sounds via Web Audio API + Vibration API for mobile haptics

// Haptic feedback using Vibration API
export function haptic(pattern: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') {
  try {
    if (!navigator.vibrate) return;
    switch (pattern) {
      case 'light': navigator.vibrate(8); break;
      case 'medium': navigator.vibrate(15); break;
      case 'heavy': navigator.vibrate(30); break;
      case 'success': navigator.vibrate([10, 30, 10]); break;
      case 'error': navigator.vibrate([30, 50, 30, 50, 30]); break;
    }
  } catch {
    // Silently fail — haptics are non-critical
  }
}

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

export function playClickSound(variant: 'soft' | 'crisp' | 'success' | 'toggle' = 'soft') {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    filter.type = 'lowpass';

    switch (variant) {
      case 'soft':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.08);
        filter.frequency.setValueAtTime(2000, now);
        gainNode.gain.setValueAtTime(0.06, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;

      case 'crisp':
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(1200, now);
        oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.06);
        filter.frequency.setValueAtTime(4000, now);
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        oscillator.start(now);
        oscillator.stop(now + 0.08);
        break;

      case 'success':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523, now); // C5
        oscillator.frequency.setValueAtTime(659, now + 0.08); // E5
        oscillator.frequency.setValueAtTime(784, now + 0.16); // G5
        filter.frequency.setValueAtTime(3000, now);
        gainNode.gain.setValueAtTime(0.07, now);
        gainNode.gain.setValueAtTime(0.07, now + 0.16);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        break;

      case 'toggle':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.05);
        filter.frequency.setValueAtTime(3000, now);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        oscillator.start(now);
        oscillator.stop(now + 0.06);
        break;
    }
  } catch {
    // Silently fail — sounds are non-critical
  }
}

export function playHoverSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1400, now);
    oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.03);
    gainNode.gain.setValueAtTime(0.02, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    oscillator.start(now);
    oscillator.stop(now + 0.04);
  } catch {
    // Silently fail
  }
}
