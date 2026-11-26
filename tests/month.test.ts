import { test } from 'node:test'
import assert from 'node:assert/strict'
import { localISO, monthCells, shiftMonth } from '../src/lib/month'

test('monthCells começa na segunda e fecha semanas inteiras', () => {
  const nov = monthCells('2026-11') // 1º de novembro de 2026 é domingo
  assert.equal(nov.indexOf('2026-11-01'), 6)
  assert.equal(nov.length % 7, 0)
  assert.equal(nov.filter(Boolean).length, 30)
})

test('monthCells cobre fevereiro bissexto', () => {
  assert.equal(monthCells('2028-02').filter(Boolean).length, 29)
})

test('shiftMonth vira o ano', () => {
  assert.equal(shiftMonth('2026-12', 1), '2027-01')
  assert.equal(shiftMonth('2026-01', -1), '2025-12')
})

test('localISO não pula de dia à noite', () => {
  assert.equal(localISO(new Date(2026, 10, 26, 23, 30)), '2026-11-26')
})
