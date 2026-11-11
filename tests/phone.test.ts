import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatPhoneBR, phoneDigits } from '../src/lib/phone'

test('dígitos: tira máscara', () => {
  assert.equal(phoneDigits('(13) 99000-0003'), '13990000003')
  assert.equal(phoneDigits(null), '')
})

test('formata celular e fixo', () => {
  assert.equal(formatPhoneBR('13990000003'), '(13) 99000-0003')
  assert.equal(formatPhoneBR('1332345678'), '(13) 3234-5678')
  assert.equal(formatPhoneBR('5513990000003'), '(13) 99000-0003')
})

test('o que não é número brasileiro volta como veio', () => {
  assert.equal(formatPhoneBR('+1 212 555 0199'), '+1 212 555 0199')
  assert.equal(formatPhoneBR(''), '')
})
