export type SoundEffect =
  | 'select'
  | 'toggle'
  | 'note'
  | 'correct'
  | 'error'
  | 'erase'
  | 'undo'
  | 'hint'
  | 'pause'
  | 'resume'
  | 'complete'
  | 'failure'
  | 'newGame'

type WaveType = OscillatorType

interface Tone {
  frequency: number
  endFrequency?: number
  delay?: number
  duration: number
  volume: number
  type?: WaveType
}

const SOUND_PATTERNS: Record<SoundEffect, readonly Tone[]> = {
  select: [
    { frequency: 560, duration: 0.035, volume: 0.018, type: 'sine' },
  ],
  toggle: [
    { frequency: 440, duration: 0.055, volume: 0.022, type: 'sine' },
    { frequency: 660, delay: 0.045, duration: 0.07, volume: 0.02, type: 'sine' },
  ],
  note: [
    { frequency: 740, endFrequency: 820, duration: 0.065, volume: 0.022, type: 'sine' },
  ],
  correct: [
    { frequency: 620, duration: 0.08, volume: 0.025, type: 'sine' },
    { frequency: 820, delay: 0.055, duration: 0.11, volume: 0.024, type: 'sine' },
  ],
  error: [
    { frequency: 190, endFrequency: 145, duration: 0.16, volume: 0.032, type: 'triangle' },
  ],
  erase: [
    { frequency: 360, endFrequency: 250, duration: 0.09, volume: 0.022, type: 'sine' },
  ],
  undo: [
    { frequency: 430, duration: 0.07, volume: 0.021, type: 'sine' },
    { frequency: 320, delay: 0.055, duration: 0.09, volume: 0.02, type: 'sine' },
  ],
  hint: [
    { frequency: 523.25, duration: 0.12, volume: 0.024, type: 'sine' },
    { frequency: 659.25, delay: 0.08, duration: 0.13, volume: 0.022, type: 'sine' },
    { frequency: 783.99, delay: 0.16, duration: 0.17, volume: 0.02, type: 'sine' },
  ],
  pause: [
    { frequency: 360, endFrequency: 260, duration: 0.12, volume: 0.022, type: 'sine' },
  ],
  resume: [
    { frequency: 300, endFrequency: 440, duration: 0.12, volume: 0.022, type: 'sine' },
  ],
  complete: [
    { frequency: 523.25, duration: 0.16, volume: 0.027, type: 'sine' },
    { frequency: 659.25, delay: 0.09, duration: 0.17, volume: 0.026, type: 'sine' },
    { frequency: 783.99, delay: 0.18, duration: 0.18, volume: 0.025, type: 'sine' },
    { frequency: 1046.5, delay: 0.3, duration: 0.32, volume: 0.026, type: 'sine' },
  ],
  failure: [
    { frequency: 246.94, duration: 0.17, volume: 0.03, type: 'triangle' },
    { frequency: 196, delay: 0.13, duration: 0.18, volume: 0.028, type: 'triangle' },
    { frequency: 146.83, delay: 0.27, duration: 0.28, volume: 0.027, type: 'triangle' },
  ],
  newGame: [
    { frequency: 392, duration: 0.1, volume: 0.023, type: 'sine' },
    { frequency: 523.25, delay: 0.07, duration: 0.15, volume: 0.023, type: 'sine' },
  ],
}

let audioContext: AudioContext | null = null

function getAudioContext() {
  audioContext ??= new AudioContext()
  return audioContext
}

function scheduleTone(context: AudioContext, tone: Tone) {
  const start = context.currentTime + (tone.delay ?? 0)
  const end = start + tone.duration
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = tone.type ?? 'sine'
  oscillator.frequency.setValueAtTime(tone.frequency, start)
  if (tone.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(tone.endFrequency, end)
  }

  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(tone.volume, start + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, end)

  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(start)
  oscillator.stop(end + 0.02)
}

export async function playSound(effect: SoundEffect) {
  try {
    const context = getAudioContext()
    if (context.state === 'suspended') await context.resume()
    SOUND_PATTERNS[effect].forEach((tone) => scheduleTone(context, tone))
  } catch {
    // 音频不可用时保持游戏静默运行。
  }
}
