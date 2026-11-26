import { test } from 'node:test'
import assert from 'node:assert/strict'
import { transferSlots, buildTransferNotice } from '../src/lib/transfer'
import type { BarbershopAppointment } from '../src/types/tenant'

const apt = (over: Partial<BarbershopAppointment>): BarbershopAppointment => ({
  id: 'a', barbershopId: 'b', clientName: 'João Silva', clientPhone: '13999999999', barberId: 'r', barberName: 'Rafael',
  serviceId: 's', serviceName: 'Corte', date: '2030-03-10', time: '10:00', durationMin: 60, status: 'confirmed', ...over,
})
const shop = { open: '09:00', close: '18:00' }
const now = new Date('2030-03-01T08:00:00')
const free = (list: ReturnType<typeof transferSlots>) => list.filter(s => s.available).map(s => s.time)

test('o próprio horário não conta como ocupado', () => {
  const me = apt({})
  const slots = transferSlots({ apt: me, appointments: [me], date: me.date, barberId: 'r', shop, now })
  assert.ok(free(slots).includes('10:00'))
  assert.ok(free(slots).includes('10:30'))
})

test('horário de outro cliente do barbeiro escolhido fica bloqueado', () => {
  const me = apt({}), other = apt({ id: 'x', barberId: 'l', time: '14:00' })
  const slots = transferSlots({ apt: me, appointments: [me, other], date: me.date, barberId: 'l', shop, now })
  assert.ok(!free(slots).includes('14:00'))
  assert.ok(!free(slots).includes('13:30'), 'não cabe 60 min antes das 14:00')
  assert.ok(free(slots).includes('13:00'))
})

test('respeita o expediente do barbeiro de destino', () => {
  const me = apt({})
  const slots = transferSlots({ apt: me, appointments: [me], date: '2030-03-12', barberId: 'l', barber: { workStart: '12:00', workEnd: '16:00' }, shop, now })
  assert.deepEqual([free(slots)[0], free(slots).at(-1)], ['12:00', '15:00'])
})

test('hoje: horário que já passou some, mas o atual continua pra trocar só o barbeiro', () => {
  const me = apt({})
  const slots = transferSlots({ apt: me, appointments: [me], date: me.date, barberId: 'l', shop, now: new Date('2030-03-10T10:20:00') })
  assert.ok(free(slots).includes('10:00'))
  assert.ok(!free(slots).includes('09:00'))
})

test('aviso do WhatsApp diz o dia, a hora e o barbeiro novos', () => {
  const msg = buildTransferNotice('João Silva', 'Corvo', '2030-03-12', '15:00', 'Lucas')
  assert.match(msg, /^Olá, João!/)
  assert.match(msg, /12\/03 às 15:00/)
  assert.match(msg, /com Lucas/)
})
