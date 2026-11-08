const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = vm.createContext({});
vm.runInContext(fs.readFileSync('Code.gs', 'utf8'), context);
const sale = vm.runInContext(`validateSale_({
  fecha:'2026-11-03', nombre:'Cliente Prueba', capitas:'2', ingreso:'Particular',
  plan:'1500', valor:'100.000,50', ganancia:'25.000', gananciaReal:''
})`, context);
assert.equal(sale.valor, 100000.5);
assert.equal(sale.ganancia, 25000);
assert.equal(sale.real, null);
assert.throws(() => vm.runInContext(`validateSale_({fecha:'2026-02-31'})`, context));

const preparedRows = [
  ['23/09/2026','Cliente 1',1,'Particular','100',100000,20000,40000],
  ['02/10/2026','Cliente 2',1,'Particular','100',100000,20000,40000],
  ['', '', '', '', '', '', '', ''],
];
context.mockSheet = {
  getLastRow: () => 4,
  getRange: (row, col) => col === 8
    ? { getFormulas: () => [[''], [''], ['=G4*2']] }
    : { getValues: () => preparedRows },
};
assert.equal(vm.runInContext('nextSaleRow_(mockSheet)', context), 4);
console.log('Validación y selección de fila verificadas.');
