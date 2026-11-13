(function () {
'use strict';
const legacyWidths = [15, 30, 10, 20, 24, 18, 16, 18, 14, 32, 18, 16, 20, 17, 15];
const orderedWidths = [15, 30, 10, 20, 24, 18, 18, 16, 18, 14, 32, 16, 20, 17, 15];

function addStyle(xml, tag, entry) {
  const full = new RegExp(`<${tag} count="(\\d+)"([^>]*)>([\\s\\S]*?)<\\/${tag}>`);
  const empty = new RegExp(`<${tag} count="(\\d+)"([^>]*)\\/>`);
  const match = xml.match(full) || xml.match(empty);
  if (!match) throw new Error(`No se pudo preparar el formato de Excel: ${tag}.`);
  const count = Number(match[1]);
  const replacement = `<${tag} count="${count + 1}"${match[2]}>${match[3] || ''}${entry}</${tag}>`;
  return { xml: xml.replace(match[0], replacement), index: count };
}

function styledSheet(xml, headerStyle, greenStyle, stripeStyle, gainStyle, redStyle, ordered, lastRow) {
  xml = xml.replace(/<c\b[^>]*\br="[A-Z]+1"[^>]*>/g, cell => {
    const withoutStyle = cell.replace(/\s+s="\d+"/, '');
    return withoutStyle.replace(/>$/, ` s="${headerStyle}">`);
  });
  const hasPane = /<pane\b/.test(xml);
  xml = xml.replace(/<sheetView\b([^>]*?)(\/?)>/, (_, attributes, selfClosing) => {
    const opening = `<sheetView${attributes.replace(/\s+showGridLines="[^"]*"/, '')} showGridLines="0">`;
    const pane = hasPane ? '' : '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/>';
    return selfClosing ? `${opening}${pane}</sheetView>` : `${opening}${pane}`;
  });
  const lastStyled = Math.max(30, lastRow + 20);
  const total = ordered ? 'G' : 'K', gain = ordered ? 'I' : 'H';
  const rule = `<conditionalFormatting sqref="A2:O${lastStyled}"><cfRule type="expression" dxfId="${greenStyle}" priority="1"><formula>$O2="Sí"</formula></cfRule><cfRule type="expression" dxfId="${stripeStyle}" priority="4"><formula>MOD(ROW(),2)=0</formula></cfRule></conditionalFormatting><conditionalFormatting sqref="${total}2:${total}${lastStyled}"><cfRule type="expression" dxfId="${redStyle}" priority="2"><formula>ISNUMBER(${total}2)</formula></cfRule></conditionalFormatting><conditionalFormatting sqref="${gain}2:${gain}${lastStyled}"><cfRule type="expression" dxfId="${gainStyle}" priority="3"><formula>ISNUMBER(${gain}2)</formula></cfRule></conditionalFormatting>`;
  const before = /<(dataValidations|hyperlinks|printOptions|pageMargins|pageSetup|headerFooter|drawing|legacyDrawing|extLst)\b/;
  const position = xml.search(before);
  return position < 0 ? xml.replace('</worksheet>', `${rule}</worksheet>`) : `${xml.slice(0, position)}${rule}${xml.slice(position)}`;
}

async function buildStyledExcel(book, XLSX, JSZip) {
  const lastRows = [], orderedSheets = [];
  for (const title of book.SheetNames) {
    const sheet = book.Sheets[title];
    const ordered = String(sheet.G1?.v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().startsWith('TOTAL BONIFIC');
    orderedSheets.push(ordered);
    const end = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']).e.r : 0;
    let lastSale = 1;
    for (let row = 1; row <= end; row++) if (sheet[`B${row + 1}`]?.v) lastSale = row + 1;
    lastRows.push(lastSale);
    const columns = [...(sheet['!cols'] || [])];
    const widths = ordered ? orderedWidths : legacyWidths, hidden = ordered ? [7, 10, 13] : [6, 9, 13];
    widths.forEach((wch, index) => { columns[index] = { wch, ...(columns[index] || {}), ...(hidden.includes(index) ? { hidden: true } : [5,ordered?6:10,ordered?8:7].includes(index) ? { hidden: false } : {}) }; });
    sheet['!cols'] = columns;
    sheet['!rows'] ||= [];
    sheet['!rows'][0] = { ...(sheet['!rows'][0] || {}), hpt: 35 };
    sheet['!autofilter'] ||= { ref: `A1:O${lastSale}` };
    for (let row = 2; row <= end + 1; row++) for (const column of (ordered ? ['F', 'G', 'I'] : ['F', 'H', 'K'])) {
      const cell = sheet[`${column}${row}`];
      if (cell && (cell.t === 'n' || cell.f) && !cell.z) cell.z = '"$" #,##0.00';
    }
  }

  const zip = await JSZip.loadAsync(XLSX.write(book, { type: 'array', bookType: 'xlsx', compression: true }));
  let styles = await zip.file('xl/styles.xml').async('string');
  let added = addStyle(styles, 'fonts', '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>');
  styles = added.xml;
  const headerFont = added.index;
  added = addStyle(styles, 'fills', '<fill><patternFill patternType="solid"><fgColor rgb="FF12344B"/><bgColor indexed="64"/></patternFill></fill>');
  styles = added.xml;
  const headerFill = added.index;
  added = addStyle(styles, 'cellXfs', `<xf numFmtId="0" fontId="${headerFont}" fillId="${headerFill}" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>`);
  styles = added.xml;
  const headerStyle = added.index;
  added = addStyle(styles, 'dxfs', '<dxf><fill><patternFill patternType="solid"><fgColor rgb="FFD8F5E7"/><bgColor indexed="64"/></patternFill></fill></dxf>');
  styles = added.xml;
  const paidStyle = added.index;
  added = addStyle(styles, 'dxfs', '<dxf><fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F8"/><bgColor indexed="64"/></patternFill></fill></dxf>');
  styles = added.xml;
  const stripeStyle = added.index;
  added = addStyle(styles, 'dxfs', '<dxf><font><b/><color rgb="FF08786D"/></font><fill><patternFill patternType="solid"><fgColor rgb="FFE2F5F0"/><bgColor indexed="64"/></patternFill></fill></dxf>');
  styles = added.xml;
  const gainStyle = added.index;
  added = addStyle(styles, 'dxfs', '<dxf><font><b/><color rgb="FFB82933"/></font></dxf>');
  styles = added.xml;
  const redStyle = added.index;
  zip.file('xl/styles.xml', styles);
  for (let index = 0; index < book.SheetNames.length; index++) {
    const path = `xl/worksheets/sheet${index + 1}.xml`;
    const xml = await zip.file(path).async('string');
    zip.file(path, styledSheet(xml, headerStyle, paidStyle, stripeStyle, gainStyle, redStyle, orderedSheets[index], lastRows[index]));
  }
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

globalThis.PulsoExcel = Object.freeze({ buildStyledExcel });
})();
