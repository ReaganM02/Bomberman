export type SoundName = 'bomb-place' | 'explosion' | 'pickup' | 'death' | 'menu';

export class AudioSystem {
  private context?: AudioContext;
  private master?: GainNode;
  private compressor?: DynamicsCompressorNode;

  play(name: SoundName): void {
    const context = this.getContext();
    if (!context) return;
    if (name === 'explosion') {
      this.playExplosion(context);
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const settings = {
      'bomb-place': [170, 0.07, 0.1],
      pickup: [680, 0.12, 0.08],
      death: [90, 0.28, 0.12],
      menu: [420, 0.055, 0.06],
    } satisfies Record<Exclude<SoundName, 'explosion'>, [number, number, number]>;
    const [frequency, duration, volume] = settings[name];

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.55), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(this.output);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  dispose(): void {
    void this.context?.close();
  }

  private getContext(): AudioContext | undefined {
    if (!this.context) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      this.context = Ctor ? new Ctor() : undefined;
      if (this.context) this.createOutputChain(this.context);
    }
    if (this.context?.state === 'suspended') void this.context.resume();
    return this.context;
  }

  private get output(): AudioNode {
    if (!this.master || !this.context) throw new Error('Audio output requested before context initialization.');
    return this.master;
  }

  private createOutputChain(context: AudioContext): void {
    this.compressor = context.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 7;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.18;

    this.master = context.createGain();
    this.master.gain.value = 0.95;
    this.master.connect(this.compressor).connect(context.destination);
  }

  private playExplosion(context: AudioContext): void {
    const now = context.currentTime;
    this.playExplosionThump(context, now);
    this.playExplosionCrack(context, now);
    this.playExplosionRumble(context, now);
  }

  private playExplosionThump(context: AudioContext, now: number): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(92, now);
    oscillator.frequency.exponentialRampToValueAtTime(34, now + 0.34);
    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    oscillator.connect(gain).connect(this.output);
    oscillator.start(now);
    oscillator.stop(now + 0.38);
  }

  private playExplosionCrack(context: AudioContext, now: number): void {
    const bufferSize = Math.floor(context.sampleRate * 0.22);
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      const decay = 1 - i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * decay * decay;
    }

    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    noise.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2100, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.2);
    filter.Q.value = 0.9;
    gain.gain.setValueAtTime(0.34, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    noise.connect(filter).connect(gain).connect(this.output);
    noise.start(now);
    noise.stop(now + 0.23);
  }

  private playExplosionRumble(context: AudioContext, now: number): void {
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(48, now + 0.03);
    oscillator.frequency.exponentialRampToValueAtTime(26, now + 0.5);
    filter.type = 'lowpass';
    filter.frequency.value = 150;
    gain.gain.setValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.56);
    oscillator.connect(filter).connect(gain).connect(this.output);
    oscillator.start(now + 0.02);
    oscillator.stop(now + 0.58);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
