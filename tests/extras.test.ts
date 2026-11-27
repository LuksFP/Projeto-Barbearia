import test from 'node:test'
import assert from 'node:assert/strict'
import { birthdaysOfMonth, isValidBirthday, lockMessage, loyaltyCard, manageUrl, parseMoney, DEFAULT_FEATURES } from '../src/lib/extras'

test('programas pra voltar começam desligados', () => {
  const f = DEFAULT_FEATURES
  assert.deepEqual([f.reviewsEnabled, f.loyaltyEnabled, f.packagesEnabled, f.birthdaysEnabled], [false, false, false, false])
})

test('parseMoney entende vírgula e milhar', () => {
  assert.equal(parseMoney('12,50'), 12.5)
  assert.equal(parseMoney('1.250,00'), 1250)
  assert.equal(parseMoney('12.5'), 12.5)
  assert.equal(parseMoney(''), 0)
  assert.equal(parseMoney('-3'), 0)
  assert.equal(parseMoney('abc'), 0)
})

test('fidelidade: meta, prêmio gasto e progresso', () => {
  assert.equal(loyaltyCard(9, 0, 10, 'x').available, 0)
  assert.equal(loyaltyCard(10, 0, 10, 'x').available, 1)
  const gasto = loyaltyCard(13, 1, 10, 'x')
  assert.deepEqual([gasto.available, gasto.progress], [0, 3])
})

test('aniversário: valida data e ordena o mês', () => {
  assert.equal(isValidBirthday(29, 2), true)
  assert.equal(isValidBirthday(31, 4), false)
  assert.equal(isValidBirthday(0, 1), false)
  const p = (name: string, day: number, month = 11) => ({ clientId: name, name, phone: '', day, month })
  assert.deepEqual(birthdaysOfMonth([p('a', 3), p('b', 28), p('c', 27), p('d', 27, 12)], new Date(2026, 10, 27)).map(x => x.name), ['c', 'b', 'a'])
})

test('link do horário e mensagens de trava', () => {
  assert.equal(manageUrl('https://x.app/', 'atlas', 'abc'), 'https://x.app/b/atlas/horario/abc')
  assert.match(lockMessage('prazo', 1), /1 hora antes/)
  assert.match(lockMessage('prazo', 2), /2 horas antes/)
})
