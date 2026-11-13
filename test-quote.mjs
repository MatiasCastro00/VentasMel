import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseQuoteLines, readQuotePdf } from './quote.mjs';

const prices = ['Nombre del titular: Persona de prueba Fecha: 13/11/2026',
  'Precio Total $645.219,00', 'Bonificación Especial -$161.304,75',
  'Bonificación Pago Débito -$32.260,95', 'Automático',
  'Deducción por Aportes -$127.102,37', 'Capital Social Cooperativo $58.714,93',
  'Diferencia a pagar $383.265,86'];
for (const heading of ['Plan a cotizar: AS 200 SC', 'Datos personales Plan a cotizar: AS 200 SC']) {
  assert.deepEqual(parseQuoteLines([heading, ...prices]), {
    provider: 'Avalian', name: 'Persona de prueba', plan: 'AS 200 SC',
    value: 645219, discounts: [161304.75, 32260.95]
  });
}
const sancor = ['Cotización de Persona de prueba', 'DETALLE PLAN 1500 B', 'Valor de plan $100.000,00'];
assert.equal(parseQuoteLines(sancor).provider, 'Sancor');
for (const lines of [[], ['Documento cualquiera'], ...sancor.map(line => [line]),
  sancor.slice(0, 2), ['Omint', 'Cotización de Persona'], ['Avalian', ...prices]]) {
  assert.throws(() => parseQuoteLines(lines), /Formato de cotización no encontrado/);
}
assert.throws(() => parseQuoteLines([...sancor.slice(0, 2), 'Valor de plan sin importe']), /No se pudieron leer/);
assert.equal(parseQuoteLines(['Omint', 'Cotización de Persona de prueba', 'Plan: 2500', 'Valor del plan (2 cápitas) $100.000,00']).provider, 'Omint');
assert.throws(() => parseQuoteLines(['Datos personales Plan a cotizar: AS 200 SC', 'Precio Total $100']), /Avalian/);

// Optional integration check against a local reference, without storing personal PDFs.
if (process.argv[2]) {
  globalThis.DOMMatrix ??= class {};
  const bytes = await readFile(process.argv[2]);
  const quote = await readQuotePdf({ name: 'reference.pdf', size: bytes.length,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
  assert.equal(quote.provider, 'Avalian');
  assert.equal(quote.plan, 'AS 200 SC');
  assert.equal(quote.value, 645219);
  assert.deepEqual(quote.discounts, [161304.75, 32260.95]);
  assert.ok(quote.name);
}
console.log('Importación de cotizaciones verificada.');
