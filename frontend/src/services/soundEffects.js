class SoundEffects {
  playTone(freq = 520, duration = 0.15) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }
  playIncomingRequest() { this.playTone(660, 0.18); }
  playAccept() { this.playTone(780, 0.15); }
  playRejectOrBlock() { this.playTone(300, 0.2); }
}
export const sounds = new SoundEffects();