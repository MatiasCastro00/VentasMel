const navy = { red: 0.07, green: 0.20, blue: 0.29 };
const white = { red: 1, green: 1, blue: 1 };
const stripe = { red: 0.95, green: 0.97, blue: 0.98 };
const teal = { red: 0.06, green: 0.47, blue: 0.43 };
const paidGreen = { red: 0.82, green: 0.95, blue: 0.87 };
const red = { red: 0.72, green: 0.16, blue: 0.20 };
const legacyWidths = [130, 280, 86, 190, 230, 158, 140, 172, 125, 210, 178, 150, 182, 158, 132];
const orderedWidths = [130, 280, 86, 190, 230, 158, 178, 140, 172, 125, 210, 150, 182, 158, 132];
const paidFormula = '=$O2="Sí"';

export function googleSheetStyleRequests(sheet) {
  const sheetId = sheet.sheetId;
  const ordered = !!sheet.ordered, gain = ordered ? 8 : 7, total = ordered ? 6 : 10;
  const widths = ordered ? orderedWidths : legacyWidths;
  const rows = Math.max(2, sheet.gridProperties?.rowCount || 1000);
  const requests = [];
  if ((sheet.gridProperties?.columnCount || 0) < 15) {
    requests.push({ appendDimension: { sheetId, dimension: 'COLUMNS', length: 15 - (sheet.gridProperties?.columnCount || 0) } });
  }
  requests.push({ updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1, hideGridlines: true } }, fields: 'gridProperties.frozenRowCount,gridProperties.hideGridlines' } });
  requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 48 }, fields: 'pixelSize' } });
  requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'ROWS', startIndex: 1, endIndex: rows }, properties: { pixelSize: 32 }, fields: 'pixelSize' } });
  widths.forEach((pixelSize, index) => requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: index, endIndex: index + 1 }, properties: { pixelSize }, fields: 'pixelSize' } }));
  for (const index of (ordered ? [7, 10, 13] : [6, 9, 13])) requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: index, endIndex: index + 1 }, properties: { hiddenByUser: true }, fields: 'hiddenByUser' } });
  for (const index of [5, total, gain]) requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: index, endIndex: index + 1 }, properties: { hiddenByUser: false }, fields: 'hiddenByUser' } });
  if (!(sheet.bandedRanges || []).length) requests.push({ addBanding: { bandedRange: { range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: 15 }, rowProperties: { headerColorStyle: { rgbColor: navy }, firstBandColorStyle: { rgbColor: white }, secondBandColorStyle: { rgbColor: stripe } } } } });
  requests.push({ repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 15 }, cell: { userEnteredFormat: { backgroundColor: navy, textFormat: { foregroundColor: white, bold: true, fontSize: 10 }, verticalAlignment: 'MIDDLE', wrapStrategy: 'WRAP' } }, fields: 'userEnteredFormat.backgroundColor,userEnteredFormat.textFormat,userEnteredFormat.verticalAlignment,userEnteredFormat.wrapStrategy' } });
  requests.push({ repeatCell: { range: { sheetId, startRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 }, cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: 'userEnteredFormat.textFormat.bold' } });
  requests.push({ repeatCell: { range: { sheetId, startRowIndex: 1, startColumnIndex: gain, endColumnIndex: gain + 1 }, cell: { userEnteredFormat: { textFormat: { bold: true, foregroundColor: teal } } }, fields: 'userEnteredFormat.textFormat.bold,userEnteredFormat.textFormat.foregroundColor' } });
  requests.push({ repeatCell: { range: { sheetId, startRowIndex: 1, startColumnIndex: total, endColumnIndex: total + 1 }, cell: { userEnteredFormat: { textFormat: { bold: true, foregroundColor: red } } }, fields: 'userEnteredFormat.textFormat.bold,userEnteredFormat.textFormat.foregroundColor' } });
  for (const index of [5, gain, total]) requests.push({ repeatCell: { range: { sheetId, startRowIndex: 1, startColumnIndex: index, endColumnIndex: index + 1 }, cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"$" #,##0.00' } } }, fields: 'userEnteredFormat.numberFormat' } });
  const paidRule={ranges:[{sheetId,startRowIndex:1,startColumnIndex:0,endColumnIndex:15}],booleanRule:{condition:{type:'CUSTOM_FORMULA',values:[{userEnteredValue:paidFormula}]},format:{backgroundColor:paidGreen}}};
  const paidIndex=(sheet.conditionalFormats||[]).findIndex(rule=>rule.booleanRule?.condition?.values?.some(value=>value.userEnteredValue===paidFormula));
  if(paidIndex<0)requests.push({addConditionalFormatRule:{rule:paidRule,index:0}});else if(sheet.conditionalFormats[paidIndex].booleanRule?.format?.textFormat)requests.push({updateConditionalFormatRule:{index:paidIndex,rule:paidRule}});
  if (!sheet.basicFilter) requests.push({ setBasicFilter: { filter: { range: { sheetId, startRowIndex: 0, endRowIndex: rows, startColumnIndex: 0, endColumnIndex: 15 } } } });
  return requests;
}

export async function applyGoogleSheetStyle(sheet, sendRequests) {
  const requests = googleSheetStyleRequests(sheet);
  const isOptional = request => !!(request.addBanding || request.addConditionalFormatRule || request.updateConditionalFormatRule || request.setBasicFilter);
  const core = requests.filter(request => !isOptional(request));
  if (core.length) await sendRequests(core);
  const failures = [];
  for (const request of requests.filter(isOptional)) {
    try { await sendRequests([request]); }
    catch (error) { failures.push(error.message || 'Error de Google Sheets'); }
  }
  return failures;
}
