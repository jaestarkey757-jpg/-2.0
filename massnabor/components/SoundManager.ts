class SoundManagerClass {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private notifier: ((msg: string, type?: string) => void) | null = null;
  
  // Ambience nodes
  private ambienceOsc: AudioBufferSourceNode | null = null;
  private ambienceGain: GainNode | null = null;
  private isAmbiencePlaying: boolean = false;
  
  // Random sounds interval
  private natureInterval: number | null = null;

  setNotifier(fn: (msg: string, type?: string) => void) {
    this.notifier = fn;
  }

  private getContext(): AudioContext | null {
    if (!this.audioCtx) {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextCtor) {
        this.audioCtx = new AudioContext();
      }
    }
    return this.audioCtx;
  }

  async init() {
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
    this.startAmbience();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) this.stopAmbience();
    else this.startAmbience();
  }

  // --- Ambient Space Noise (Brownian Noise Filtered) ---
  startAmbience() {
    if (this.isAmbiencePlaying || this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // 1. Base Space Drone
    const bufferSize = ctx.sampleRate * 5; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    this.ambienceOsc = ctx.createBufferSource();
    this.ambienceOsc.buffer = buffer;
    this.ambienceOsc.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 120; // Very deep

    this.ambienceGain = ctx.createGain();
    this.ambienceGain.gain.value = 0.05; 

    this.ambienceOsc.connect(filter);
    filter.connect(this.ambienceGain);
    this.ambienceGain.connect(ctx.destination);

    this.ambienceOsc.start();
    this.isAmbiencePlaying = true;

    // 2. Start Random Nature Sounds Loop
    this.scheduleNextNatureSound();
  }

  stopAmbience() {
    if (this.ambienceOsc) {
        try { this.ambienceOsc.stop(); } catch(e) {}
        this.ambienceOsc.disconnect();
        this.ambienceOsc = null;
    }
    if (this.natureInterval) {
        clearTimeout(this.natureInterval);
        this.natureInterval = null;
    }
    this.isAmbiencePlaying = false;
  }

  private scheduleNextNatureSound() {
      if (this.isMuted) return;
      // Random time between 3 and 7 minutes (180s - 420s)
      // For demo purposes/testing, reducing to 30s-60s so you can hear it, 
      // but in real app roughly 5 mins is good.
      // Let's do 3-6 minutes as requested.
      const delay = (Math.random() * (360000 - 180000)) + 180000; 
      
      this.natureInterval = window.setTimeout(() => {
          this.playRandomNatureSound();
          this.scheduleNextNatureSound();
      }, delay);
  }

  private playRandomNatureSound() {
      if (Math.random() > 0.5) {
          this.playBirdChirp();
      } else {
          this.playWindRustle();
      }
  }

  private playBirdChirp() {
      const ctx = this.getContext();
      if (!ctx || this.isMuted) return;

      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Bird: High freq sine with quick slides
      osc.frequency.setValueAtTime(4000, t);
      osc.frequency.linearRampToValueAtTime(5000, t + 0.1);
      osc.frequency.linearRampToValueAtTime(3500, t + 0.2);
      osc.frequency.linearRampToValueAtTime(4500, t + 0.3);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.05); // Fade in
      gain.gain.linearRampToValueAtTime(0, t + 0.4);     // Fade out

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
  }

  private playWindRustle() {
      const ctx = this.getContext();
      if (!ctx || this.isMuted) return;

      const t = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 3; 
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // White noise
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.linearRampToValueAtTime(1200, t + 1.5); // Move filter up
      filter.frequency.linearRampToValueAtTime(600, t + 3);   // Move filter down

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 1.5); // Swell
      gain.gain.linearRampToValueAtTime(0, t + 3);     // Fade

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(t);
  }


  // --- Tones ---

  private playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0, vol: number = 0.1) {
    const ctx = this.getContext();
    if (!ctx || this.isMuted) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
    
    gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
  }

  // --- ASMR Typing ---
  playTypingSound() {
      const ctx = this.getContext();
      if (!ctx || this.isMuted) return;

      const t = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(2000 + Math.random() * 500, t); 
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.setValueAtTime(150 + Math.random() * 50, t);
      osc2.type = 'triangle';
      gain2.gain.setValueAtTime(0.1, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t);
      osc2.stop(t + 0.1);
  }

  playClick() {
    this.playTone(600, 'sine', 0.1, 0, 0.05);
  }

  playSuccess(msg: string = 'Успешно!') {
    // Improved "Magical" arpeggio (C Maj 7: C5, E5, G5, B5)
    // with sparkle effect (high sine waves)
    const ctx = this.getContext();
    if (ctx && !this.isMuted) {
        const t = ctx.currentTime;
        // Arpeggio
        this.playTone(523.25, 'sine', 0.6, 0, 0.2); // C5
        this.playTone(659.25, 'sine', 0.6, 0.08, 0.2); // E5
        this.playTone(783.99, 'sine', 0.6, 0.16, 0.2); // G5
        this.playTone(987.77, 'sine', 1.0, 0.24, 0.15); // B5 (Longer sustain)
        
        // Sparkle overlay
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1500, t);
        osc.frequency.exponentialRampToValueAtTime(3000, t + 0.4);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.4);
    }
    
    if (this.notifier) this.notifier(msg, 'success');
  }

  playGoal(msg: string = 'Цель достигнута!') {
    this.playTone(523.25, 'triangle', 0.2, 0);
    this.playTone(659.25, 'triangle', 0.2, 0.1);
    this.playTone(783.99, 'triangle', 0.6, 0.2);
    this.playTone(1046.50, 'triangle', 0.8, 0.3);
    
    if (this.notifier) this.notifier(msg, 'success');
  }

  playAchievement(msg: string = 'Достижение разблокировано!') {
    const ctx = this.getContext();
    if (!ctx) return;
    
    [440, 440, 440, 554, 659, 880].forEach((freq, i) => {
        this.playTone(freq, 'square', 0.2, i * 0.1, 0.05);
    });
    
    if (this.notifier) this.notifier(msg, 'achievement');
  }

  playNotification(title: string) {
    this.playTone(880, 'sine', 0.5, 0, 0.2);
    this.playTone(440, 'sine', 0.5, 0.1, 0.2);

    if (this.notifier) this.notifier(title, 'info');

    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Daily Organizer", { 
            body: title,
            icon: '/icon.png'
        });
    }
  }

  playError() {
      this.playTone(150, 'sawtooth', 0.3, 0, 0.1);
  }
}

export const SoundManager = new SoundManagerClass();