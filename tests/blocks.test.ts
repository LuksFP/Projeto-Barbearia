import test from 'node:test'
import assert from 'node:assert/strict'
import { affectedBy, blockRanges, describeBlock, fullDayBlock, isClosedWeekday, type ScheduleBlock } from '../src/lib/blocks'
import { buildDaySlots } from '../src/lib/scheduling'
import type { BarbershopAppointment } from '../src/types/tenant'

const block = (o: Partial<ScheduleBlock>): ScheduleBlock => ({
  id: 'k', barbershopId: 's', barberId: null, weekdays: null,
  dateFrom: null, dateTo: null, startTime: null, endTime: null, reason: '', ...o,
})
const apt = (o: Partial<BarbershopAppointment>) =>
  ({ id: 'a', date: '2026-12-07', time: '12:30', barberId: 'b1', status: 'confirmed', durationMin: 30, ...o }) as BarbershopAppointment

// 2026-12-06 é domingo, 07 é segunda
const domingo = block({ weekdays: [0] })
const almoco = block({ barberId: 'b1', weekdays: [1, 2, 3, 4, 5], startTime: '12:00', endTime: '13:00' })
const ferias = block({ barberId: 'b2', dateFrom: '2026-12-07', dateTo: '2026-12-09' })

test('dia da semana fechado vale pra todos, o dia inteiro', () => {
  assert.ok(fullDayBlock([domingo], 'b1', '2026-12-06'))
  assert.ok(fullDayBlock([domingo], '', '2026-12-06')) // barbearia sem barbeiro cadastrado
  assert.equal(fullDayBlock([domingo], 'b1', '2026-12-07'), undefined)
})

test('pausa fixa só pega o barbeiro dela, nos dias dela', () => {
  assert.deepEqual(blockRanges([almoco], 'b1', '2026-12-07'), [{ start: 720, end: 780, blocked: true }])
  assert.deepEqual(blockRanges([almoco], 'b2', '2026-12-07'), [])
  assert.deepEqual(blockRanges([almoco], 'b1', '2026-12-06'), [])
  assert.equal(fullDayBlock([almoco], 'b1', '2026-12-07'), undefined)
})

test('bloqueio por datas inclui as duas pontas', () => {
  for (const d of ['2026-12-07', '2026-12-09']) assert.ok(fullDayBlock([ferias], 'b2', d))
  assert.equal(fullDayBlock([ferias], 'b2', '2026-12-10'), undefined)
  assert.equal(fullDayBlock([ferias], 'b2', '2026-12-06'), undefined)
})

test('grade marca "bloqueado" e libera o horário que encosta na pausa', () => {
  const slots = buildDaySlots({ step: 30, duration: 30, open: '11:00', close: '14:00', busy: blockRanges([almoco], 'b1', '2026-12-07') })
  const by = Object.fromEntries(slots.map(s => [s.time, s]))
  assert.equal(by['11:30'].available, true)
  assert.equal(by['12:00'].block, 'bloqueado')
  assert.equal(by['13:00'].available, true)
  // atendimento longo que invadiria a pausa também é "bloqueado"
  const longos = buildDaySlots({ step: 30, duration: 60, open: '11:00', close: '14:00', busy: blockRanges([almoco], 'b1', '2026-12-07') })
  assert.equal(longos.find(s => s.time === '11:30')?.block, 'bloqueado')
})

test('dia inteiro cobre barbearia que fecha depois da meia-noite', () => {
  const slots = buildDaySlots({ step: 60, duration: 60, open: '18:00', close: '02:00', busy: blockRanges([domingo], 'b1', '2026-12-06') })
  assert.ok(slots.length > 0 && slots.every(s => !s.available))
})

test('afetados: só abertos, de hoje pra frente, que batem com o bloqueio', () => {
  const list = [
    apt({ id: 'sim' }),
    apt({ id: 'encosta', time: '13:00' }),
    apt({ id: 'invade', time: '11:45' }),
    apt({ id: 'cancelado', status: 'cancelled' }),
    apt({ id: 'feito', status: 'done' }),
    apt({ id: 'outro', barberId: 'b2' }),
    apt({ id: 'passado', date: '2026-11-30' }),
  ]
  assert.deepEqual(affectedBy(almoco, list, '2026-12-01').map(a => a.id), ['invade', 'sim'])
})

test('descrição do bloqueio', () => {
  assert.equal(describeBlock(almoco), 'Seg a Sex · 12:00 às 13:00')
  assert.equal(describeBlock(ferias), '07/12 a 09/12 · dia inteiro')
  assert.equal(describeBlock(block({ weekdays: [6, 2] })), 'Ter, Sáb · dia inteiro')
  assert.equal(isClosedWeekday(domingo), true)
  assert.equal(isClosedWeekday(almoco), false)
})
