export class AmbientPad {
  private ctx: AudioContext | null = null;
  private mainGain: GainNode | null = null;

  init() {
    if (this.ctx) return;
    const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtor) return;
    
    this.ctx = new AudioCtor();
    this.mainGain = this.ctx.createGain();
    this.mainGain.gain.value = 0;
    this.mainGain.connect(this.ctx.destination);

    // Deep drone 
    const freqs = [110.0, 164.81, 220.0]; 
    freqs.forEach(f => {
      const osc1 = this.ctx!.createOscillator();
      const osc2 = this.ctx!.createOscillator();
      const oscGain = this.ctx!.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.value = f;
      osc2.frequency.value = f * 1.01; // slight detune

      oscGain.gain.value = 0.5 / freqs.length;
      
      osc1.connect(oscGain);
      osc2.connect(oscGain);
      oscGain.connect(this.mainGain!);

      osc1.start();
      osc2.start();
    });
  }

  updateState(state: string, enabled: boolean) {
    if (!this.ctx && enabled) this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended' && enabled) {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    let target = 0;
    if (enabled) {
      if (state === 'idle') target = 0.3;
      else if (state === 'resting') target = 0.1;
      else target = 0.0; // thinking, excited
    }

    this.mainGain?.gain.setTargetAtTime(target, now, 1.5);
  }
}

export const ambientSound = new AmbientPad();
