import assert from 'node:assert/strict'
import { test } from 'node:test'
import { playSound } from '../src/sounds.ts'

const patterns = {
  select: [0.018], toggle: [0.022, 0.02], note: [0.022],
  correct: [0.025, 0.024], error: [0.032], erase: [0.022],
  undo: [0.021, 0.02], hint: [0.024, 0.022, 0.02],
  pause: [0.022], resume: [0.022], complete: [0.027, 0.026, 0.025, 0.026],
  failure: [0.03, 0.028, 0.027], newGame: [0.023, 0.023],
}

test('all effects have twice the peak gain and preserve the fade envelope', async () => {
  const gains = []
  const starts = []
  const stops = []
  let resumes = 0
  let contexts = 0
  const original = globalThis.AudioContext
  globalThis.AudioContext = class {
    constructor() { contexts += 1 }
    state = 'suspended'
    currentTime = 0
    destination = {}
    async resume() { resumes += 1; this.state = 'running' }
    createOscillator() {
      return {
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {}, start(time) { starts.push(time) }, stop(time) { stops.push(time) },
      }
    }
    createGain() {
      const events = []
      gains.push(events)
      return {
        gain: {
          setValueAtTime(value, time) { events.push([value, time]) },
          exponentialRampToValueAtTime(value, time) { events.push([value, time]) },
        },
        connect() {},
      }
    }
  }
  try {
    for (const [effect, volumes] of Object.entries(patterns)) {
      const offset = gains.length
      await playSound(effect)
      assert.equal(gains.length - offset, volumes.length)
      volumes.forEach((volume, index) => {
        const events = gains[offset + index]
        assert.equal(events[0][0], 0.0001)
        assert.equal(events[1][0], volume * 2)
        assert.equal(events[2][0], 0.0001)
        assert.ok(Math.abs(events[1][1] - starts[offset + index] - 0.008) < 1e-10)
        assert.ok(stops[offset + index] > events[2][1])
      })
      // Even summing every tone peak (a conservative bound) stays well below 1.
      assert.ok(volumes.reduce((sum, volume) => sum + volume * 2, 0) < 0.25)
    }
    assert.equal(contexts, 1)
    assert.equal(resumes, 1)
  } finally {
    globalThis.AudioContext = original
  }
})
