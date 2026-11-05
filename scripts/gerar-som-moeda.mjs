// Gera public/som-moeda.wav (depois: ffmpeg -i public/som-moeda.wav -b:a 128k public/som-moeda.mp3 e apaga o .wav): o MESMO "plim" de moeda que o painel toca em
// Web Audio (src/lib/bookingAlert.ts), renderizado em arquivo. Serve pro
// barbeiro escolher como som da notificação no Android (o navegador não deixa
// o site escolher o som do push). Uso: node scripts/gerar-som-moeda.mjs
import { writeFileSync } from 'node:fs'

const RATE = 44100
const DUR = 1.1
const n = Math.floor(RATE * DUR)
const out = new Float32Array(n)

function coinHit(at, freq, gain) {
  for (const [ratio, amp] of [[1, 1], [2.76, 0.42], [5.4, 0.18], [8.93, 0.08]]) {
    const decay = 0.55 / ratio + 0.12
    const f = freq * ratio
    const start = Math.floor(at * RATE)
    const end = Math.min(n, Math.floor((at + decay) * RATE))
    for (let i = start; i < end; i++) {
      const t = (i - start) / RATE
      // ataque 4 ms, queda exponencial até ~0 em `decay`
      const env = t < 0.004 ? t / 0.004 : Math.exp((-Math.log(gain * amp / 0.0001) * (t - 0.004)) / (decay - 0.004))
      out[i] += Math.sin(2 * Math.PI * f * t) * gain * amp * env
    }
  }
}

function jingle(at) {
  const len = Math.floor(RATE * 0.09)
  const start = Math.floor(at * RATE)
  let prevIn = 0, prevOut = 0
  const rc = 1 / (2 * Math.PI * 5000), dt = 1 / RATE, a = rc / (rc + dt)
  for (let i = 0; i < len; i++) {
    const x = (Math.random() * 2 - 1) * (1 - i / len)
    const y = a * (prevOut + x - prevIn) // passa-alta ~5 kHz
    prevIn = x; prevOut = y
    out[start + i] += y * 0.12
  }
}

const t = 0.02
jingle(t)
coinHit(t + 0.03, 1975.5, 0.5)
coinHit(t + 0.15, 2637.0, 0.6)

// normaliza com folga e grava WAV PCM 16-bit mono
let peak = 0
for (const v of out) peak = Math.max(peak, Math.abs(v))
const scale = 0.89 / peak
const buf = Buffer.alloc(44 + n * 2)
buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8)
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22)
buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34)
buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i] * scale)) * 32767), 44 + i * 2)
const file = new URL('../public/som-moeda.wav', import.meta.url)
writeFileSync(file, buf)
console.log('ok', file.pathname, buf.length, 'bytes')
