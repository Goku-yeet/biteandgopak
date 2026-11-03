// Web Audio API Synthesizer for notifications and alerts

class SoundEffects {
  private ctx: AudioContext | null = null;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Pleasant notification bell/chime for order status change
  playChime() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      osc2.frequency.setValueAtTime(1174.66, now + 0.1); // D6
      osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.3); // E6

      gainNode.gain.setValueAtTime(0.01, now);
      gainNode.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.1);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch {
      // Audio playback fails silently if browser blocks autoplay before user gesture
    }
  }

  // Cash register / payment confirmed success sound
  playSuccess() {
    this.playCashRegister();
  }

  playCashRegister() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 chord arpeggio
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.01, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.45);
      });
    } catch {
      // Audio blocked or unsupported
    }
  }

  // Error buzz for invalid voucher or action
  playError() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // ignore
    }
  }

  // High-priority urgent beeping alert for restaurant employees & kitchen
  // Emulates commercial POS / Food delivery tablet order beepers (BEEP-BEEP-BEEP!)
  playKitchenOrderBeep() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      // Pattern: 4 rapid high-frequency pulse beeps + secondary attention chime
      const beepTimes = [
        { time: 0.00, freq: 980, dur: 0.10 },
        { time: 0.14, freq: 980, dur: 0.10 },
        { time: 0.28, freq: 1180, dur: 0.12 },
        { time: 0.44, freq: 1320, dur: 0.18 },
        // Secondary burst so employee won't miss it
        { time: 0.75, freq: 980, dur: 0.10 },
        { time: 0.89, freq: 1180, dur: 0.12 },
        { time: 1.05, freq: 1480, dur: 0.25 },
      ];

      beepTimes.forEach(({ time, freq, dur }) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Use square/triangle blend for piercing restaurant-grade buzzer/beeper tone
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.01, now + time);
        gain.gain.linearRampToValueAtTime(0.35, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch {
      // Audio playback fails silently if browser blocks autoplay before user gesture
    }
  }

  // Alias for compatibility
  playNewOrderAlert() {
    this.playKitchenOrderBeep();
  }

  unlockAudioContext() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }
}

export const sounds = new SoundEffects();

// Auto-unlock on first user interaction so sounds are never blocked
if (typeof window !== 'undefined') {
  const unlock = () => {
    sounds.unlockAudioContext();
  };
  window.addEventListener('click', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
}
