import { test } from 'node:test'
import assert from 'node:assert/strict'
import { waNumber } from '../src/lib/whatsapp'
import { buildWhatsappUrl } from '../src/lib/clubBilling'

test('número só com DDD ganha o 55, inclusive no DDD 55', () => {
  assert.equal(waNumber('(13) 99999-9999'), '5513999999999')
  assert.equal(waNumber('(55) 99999-9999'), '5555999999999')
  assert.equal(waNumber('(13) 3333-4444'), '551333334444')
})

test('número que já veio com 55 não ganha outro', () => {
  assert.equal(waNumber('+55 13 99999-9999'), '5513999999999')
})

test('lembrete, reativação e cobrança montam o link com o 55', () => {
  assert.equal(buildWhatsappUrl('13999999999', 'Oi João'), 'https://wa.me/5513999999999?text=Oi%20Jo%C3%A3o')
})
