let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  // Browsers can suspend a context that was created before a user gesture, or
  // after a tab was backgrounded — resume defensively every time.
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

/**
 * A short, soft two-note chime for "the assistant replied" — synthesized directly,
 * no audio file to host or load. Only ever call this from inside a real user
 * gesture handler (e.g. the send-message click), never on page load or any other
 * unprompted moment — browsers block audio autoplay without one, and even where
 * they don't, an unprompted sound on app open is the wrong kind of surprising.
 */
export function playReplyChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes: { freq: number; start: number; duration: number }[] = [
    { freq: 740, start: 0, duration: 0.09 },   // F#5
    { freq: 988, start: 0.08, duration: 0.14 }, // B5 — a soft upward resolve
  ];

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = note.freq;
    osc.connect(gain);
    gain.connect(ctx.destination);

    const startAt = now + note.start;
    const endAt = startAt + note.duration;
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(0.08, startAt + 0.015); // gentle, not jarring
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    osc.start(startAt);
    osc.stop(endAt + 0.02);
  }
}
