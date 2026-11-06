import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDaySlots, busyRanges, isTimeAvailable, toHHMM, toMin } from '../src/lib/scheduling'
import type { BarbershopAppointment } from '../src/types/tenant'

const apt = (o: Partial<BarbershopAppointment>) =>
  ({ id: 'a', date: '2026-11-10', time: '10:00', barberId: 'b1', status: 'confirmed', durationMin: 30, ...o }) as BarbershopAppointment

test('toMin / toHHMM são inversas e viram o dia', () => {
  assert.equal(toMin('09:30'), 570)
  assert.equal(toHHMM(570), '09:30')
  assert.equal(toHHMM(1440), '00:00')
  assert.equal(toHHMM(1470), '00:30')
})

test('busyRanges ignora cancelado, outro barbeiro, outra data e o ignoreId', () => {
  const list = [
    apt({ id: '1' }),
    apt({ id: '2', status: 'cancelled', time: '11:00' }),
    apt({ id: '3', barberId: 'b2', time: '12:00' }),
    apt({ id: '4', date: '2026-11-11', time: '13:00' }),
    apt({ id: '5', time: '14:00', durationMin: 0 }),
  ]
  assert.deepEqual(busyRanges(list, 'b1', '2026-11-10'), [
    { start: 600, end: 630 },
    { start: 840, end: 870 }, // duração 0 cai no padrão de 30
  ])
  assert.equal(busyRanges(list, 'b1', '2026-11-10', '1').length, 1)
})

test('slots: ocupado bloqueia por sobreposição, não só por início igual', () => {
  const slots = buildDaySlots({ step: 30, duration: 45, busy: [{ start: 600, end: 630 }], open: '09:00', close: '12:00' })
  const free = (t: string) => slots.find(s => s.time === t)?.available
  assert.equal(free('09:00'), true)  // 09:00–09:45 termina antes das 10:00
  assert.equal(free('09:30'), false) // 09:30–10:15 invade 10:00–10:30
  assert.equal(free('10:30'), true)
})

test('slots: não estoura o fechamento', () => {
  const slots = buildDaySlots({ step: 30, duration: 60, busy: [], open: '09:00', close: '11:00' })
  assert.deepEqual(slots.map(s => s.time), ['09:00', '09:30', '10:00'])
})

test('slots: fechamento à meia-noite conta como 24:00', () => {
  const slots = buildDaySlots({ step: 60, duration: 60, busy: [], open: '22:00', close: '00:00' })
  assert.deepEqual(slots.map(s => s.time), ['22:00', '23:00'])
})

test('slots: hoje corta horários que já passaram', () => {
  const now = new Date(2026, 10, 10, 10, 15)
  const slots = buildDaySlots({ step: 30, duration: 30, busy: [], open: '09:00', close: '12:00', now, date: '2026-11-10' })
  assert.deepEqual(slots.map(s => s.time), ['10:30', '11:00', '11:30'])
  const other = buildDaySlots({ step: 30, duration: 30, busy: [], open: '09:00', close: '10:00', now, date: '2026-11-11' })
  assert.equal(other.length, 2)
})

test('isTimeAvailable: encostar no fim do outro é permitido', () => {
  const busy = [{ start: 600, end: 630 }]
  assert.equal(isTimeAvailable('10:30', 30, busy), true)
  assert.equal(isTimeAvailable('09:45', 30, busy), false)
})

test('slots: diz por que não dá — ocupado (já tem gente) ou não cabe (invade o próximo)', () => {
  // corte + barba (50 min) com cliente marcado 10:00–10:50
  const slots = buildDaySlots({ step: 30, duration: 50, busy: [{ start: 600, end: 650 }], open: '09:00', close: '12:00' })
  const at = (t: string) => slots.find(s => s.time === t)
  assert.equal(at('09:00')?.available, true)        // 09:00–09:50
  assert.equal(at('09:30')?.block, 'nao-cabe')      // livre, mas 09:30–10:20 invade
  assert.equal(at('10:00')?.block, 'ocupado')
  assert.equal(at('10:30')?.block, 'ocupado')       // ainda dentro do 10:00–10:50
  assert.equal(at('11:00')?.available, true)
  assert.equal(at('11:00')?.block, undefined)
})
