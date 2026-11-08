/** Web app de ventas. Publicar con "Ejecutar como: usuario que accede". */
const HEADERS = ['Fecha de alta', 'Nombre', 'Capitas', 'Forma de ingreso', 'Plan', 'Valor del plan', 'Ganancia', 'Ganancia real'];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Ventas de prepagas')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function listBooks() {
  const files = salesFolder_().getFilesByType(MimeType.GOOGLE_SHEETS);
  const books = [];
  while (files.hasNext()) {
    const file = files.next();
    if (!file.isTrashed()) books.push({ id: file.getId(), name: file.getName() });
  }
  books.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const lastId = PropertiesService.getUserProperties().getProperty('ventasBookId');
  return { books: books, lastId: lastId || '' };
}

function salesFolder_() {
  const root = DriveApp.getRootFolder();
  const folders = root.getFoldersByName('ventasApp');
  return folders.hasNext() ? folders.next() : root.createFolder('ventasApp');
}

function selectBook(bookId) {
  const book = openAuthorizedBook_(bookId);
  PropertiesService.getUserProperties().setProperty('ventasBookId', book.getId());
  return readBook_(book);
}

function createBook(title) {
  const name = String(title || '').trim();
  if (!name) throw new Error('Ingresá un nombre para el documento.');
  if (name.length > 120) throw new Error('El nombre del documento es demasiado largo.');
  const book = SpreadsheetApp.create(name);
  DriveApp.getFileById(book.getId()).moveTo(salesFolder_());
  const sheet = book.getSheets()[0];
  sheet.setName('Mi prepaga');
  prepareHeader_(sheet);
  PropertiesService.getUserProperties().setProperty('ventasBookId', book.getId());
  return readBook_(book);
}

function refreshBook(bookId) {
  return readBook_(openAuthorizedBook_(bookId));
}

function addSale(bookId, prepaga, input) {
  const book = openAuthorizedBook_(bookId);
  const sheet = book.getSheetByName(String(prepaga || ''));
  if (!sheet) throw new Error('La prepaga seleccionada no existe.');
  const payload = validateSale_(input);
  const row = nextSaleRow_(sheet);
  const date = new Date(payload.year, payload.month - 1, payload.day);
  sheet.getRange(row, 1, 1, 7).setValues([[
    date, safeText_(payload.name), payload.capitas, safeText_(payload.ingreso),
    safeText_(payload.plan), payload.valor, payload.ganancia,
  ]]);
  sheet.getRange(row, 1).setNumberFormat('dd/MM/yyyy');
  sheet.getRange(row, 6, 1, 3).setNumberFormat('$ #,##0.00');
  const real = sheet.getRange(row, 8);
  if (payload.real !== null) real.setValue(payload.real);
  else if (payload.ganancia !== null) real.setFormula('=G' + row + '*2');
  else real.clearContent();
  SpreadsheetApp.flush();
  return readBook_(book);
}

function createPrepaga(bookId, proposedName) {
  const book = openAuthorizedBook_(bookId);
  const name = prepagaName_(proposedName);
  if (book.getSheets().some(s => s.getName().toLocaleLowerCase() === name.toLocaleLowerCase())) {
    throw new Error('Ya existe una prepaga con ese nombre.');
  }
  const sheet = book.insertSheet(name);
  prepareHeader_(sheet);
  SpreadsheetApp.flush();
  return readBook_(book);
}

function renamePrepaga(bookId, oldName, proposedName) {
  const book = openAuthorizedBook_(bookId);
  const sheet = book.getSheetByName(String(oldName || ''));
  if (!sheet) throw new Error('La prepaga ya no existe. Actualizá la planilla.');
  const name = prepagaName_(proposedName);
  if (book.getSheets().some(s => s !== sheet && s.getName().toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('Ya existe una prepaga con ese nombre.');
  sheet.setName(name);
  SpreadsheetApp.flush();
  return readBook_(book);
}

function deletePrepaga(bookId, name) {
  const book = openAuthorizedBook_(bookId);
  const sheet = book.getSheetByName(String(name || ''));
  if (!sheet) throw new Error('La prepaga ya no existe. Actualizá la planilla.');
  if (book.getSheets().length <= 1) throw new Error('Debe quedar al menos una prepaga en la planilla.');
  book.deleteSheet(sheet);
  SpreadsheetApp.flush();
  return readBook_(book);
}

function prepagaName_(proposedName) {
  const name = String(proposedName || '').trim();
  if (!name || name.length > 31 || /[\\/*?:\[\]]/.test(name) || /^'|'$/.test(name)) throw new Error('Usá un nombre de 1 a 31 caracteres sin \\/ * ? : [ ].');
  return name;
}

function openAuthorizedBook_(id) {
  const bookId = String(id || '').trim();
  if (!/^[a-zA-Z0-9_-]{20,}$/.test(bookId)) throw new Error('Elegí una planilla válida.');
  // Al ejecutar como usuario que accede, Google verifica sus permisos aquí.
  try { return SpreadsheetApp.openById(bookId); }
  catch (_) { throw new Error('No se pudo abrir la planilla con esta cuenta. Revisá sus permisos.'); }
}

function prepareHeader_(sheet) {
  sheet.getRange(1, 1, 1, 8).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, 8).setBackground('#17324d').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, 8, 160);
  sheet.setColumnWidth(2, 250);
  sheet.setColumnWidth(4, 200);
}

function readBook_(book) {
  const sheets = book.getSheets().map(sheet => {
    const last = Math.max(sheet.getLastRow(), 1);
    const range = sheet.getRange(1, 1, last, 8);
    const values = range.getValues();
    const display = range.getDisplayValues();
    const formulas = range.getFormulas();
    const sales = [];
    for (let i = 1; i < values.length; i++) {
      if (!values[i][1]) continue;
      sales.push({
        row: i + 1,
        date: display[i][0],
        name: String(values[i][1]),
        capitas: values[i][2],
        ingreso: String(values[i][3] || ''),
        plan: String(values[i][4] || ''),
        valor: typeof values[i][5] === 'number' ? values[i][5] : display[i][5],
        ganancia: typeof values[i][6] === 'number' ? values[i][6] : display[i][6],
        real: typeof values[i][7] === 'number' ? values[i][7] : display[i][7],
        realFormula: formulas[i][7],
      });
    }
    return { name: sheet.getName(), sales: sales };
  });
  return { id: book.getId(), name: book.getName(), url: book.getUrl(), sheets: sheets };
}

function nextSaleRow_(sheet) {
  const last = Math.max(sheet.getLastRow(), 1);
  if (last < 2) return 2;
  const values = sheet.getRange(2, 1, last - 1, 8).getValues();
  const formulas = sheet.getRange(2, 8, last - 1, 1).getFormulas();
  for (let i = 0; i < values.length; i++) {
    if (values[i].slice(0, 7).some(v => v !== '' && v !== null)) continue;
    const row = i + 2;
    const summary = formulas[i][0];
    if (/^=SUM\(/i.test(summary)) {
      sheet.insertRowsBefore(row, 1);
      const match = summary.match(/^=SUM\(H(\d+):H(\d+)\)$/i);
      if (match && Number(match[2]) === row - 1) {
        sheet.getRange(row + 1, 8).setFormula('=SUM(H' + match[1] + ':H' + row + ')');
      }
      return row;
    }
    return row;
  }
  return last + 1;
}

function validateSale_(input) {
  const item = input || {};
  const date = String(item.fecha || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!date) throw new Error('Ingresá una fecha válida.');
  const year = Number(date[1]), month = Number(date[2]), day = Number(date[3]);
  const checked = new Date(year, month - 1, day);
  if (checked.getFullYear() !== year || checked.getMonth() !== month - 1 || checked.getDate() !== day) throw new Error('Ingresá una fecha válida.');
  const name = String(item.nombre || '').trim();
  const ingreso = String(item.ingreso || '').trim();
  const plan = String(item.plan || '').trim();
  const capitas = Number(item.capitas);
  if (!name || !ingreso || !plan || name.length > 160 || ingreso.length > 100 || plan.length > 100) throw new Error('Completá nombre, forma de ingreso y plan.');
  if (!Number.isInteger(capitas) || capitas < 1) throw new Error('Cápitas debe ser un entero positivo.');
  return { year, month, day, name, ingreso, plan, capitas,
    valor: money_(item.valor, 'el valor del plan', true),
    ganancia: money_(item.ganancia, 'la ganancia', false),
    real: money_(item.gananciaReal, 'la ganancia real', false) };
}

function money_(text, label, required) {
  let raw = String(text == null ? '' : text).trim().replace(/[$\s]/g, '');
  if (!raw) { if (required) throw new Error('Ingresá ' + label + '.'); return null; }
  if (raw.indexOf(',') >= 0) raw = raw.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) raw = raw.replace(/\./g, '');
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(label + ' debe ser un número no negativo.');
  return value;
}

function safeText_(value) {
  return /^=/.test(value) ? "'" + value : value;
}
