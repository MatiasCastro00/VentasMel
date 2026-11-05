const plain = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

function amount(text) {
  const match = String(text).match(/\$\s*(-?\s*[\d.,\s]+)/);
  if (!match) return null;
  let raw = match[1].replace(/\s/g, '').replace(/[^\d.,-]/g, '');
  if (raw.includes(',') && raw.includes('.')) raw = raw.lastIndexOf(',') > raw.lastIndexOf('.') ? raw.replaceAll('.', '').replace(',', '.') : raw.replaceAll(',', '');
  else if (raw.includes(',')) raw = raw.replace(',', '.');
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parseAvalian(lines) {
  const result = { provider: 'Avalian', name: '', plan: '', value: null, discounts: [] };
  let inPrices = false;
  for (const text of lines) {
    const normalized = plain(text);
    if (normalized.startsWith('NOMBRE DEL TITULAR:')) result.name = String(text).replace(/^\s*Nombre\s+del\s+titular\s*:\s*/i, '').split(/\s+Fecha\s*:/i)[0].trim();
    if (normalized.startsWith('PLAN A COTIZAR:')) {
      result.plan = String(text).replace(/^\s*Plan\s+a\s+cotizar\s*:\s*/i, '').trim();
      inPrices = true;
    } else if (inPrices && normalized.startsWith('PRECIO TOTAL')) result.value = amount(text);
    else if (inPrices && normalized.startsWith('BONIFICACION ')) {
      const value = amount(text);
      if (value !== null) result.discounts.push(Math.abs(value));
    } else if (inPrices && (normalized.startsWith('DIFERENCIA A PAGAR') || normalized.startsWith('CONSIDERACIONES GENERALES'))) inPrices = false;
  }
  if (!result.name || !result.plan || result.value === null) throw new Error('No se pudieron leer nombre, plan y Precio Total de la cotización de Avalian.');
  return result;
}

export function parseQuoteLines(lines) {
  if (lines.some(text => plain(text).startsWith('PLAN A COTIZAR:')) && lines.some(text => plain(text).startsWith('PRECIO TOTAL'))) return parseAvalian(lines);
  const result = { provider: 'Sancor', name: '', plan: '', value: null, discounts: [] };
  for (const text of lines) {
    const normalized = plain(text);
    if (normalized.startsWith('COTIZACION DE ')) result.name = String(text).replace(/^\s*COTIZACI[ÓO]N\s+DE\s+/i, '').trim();
    else if (normalized.startsWith('DETALLE ')) result.plan = String(text).replace(/^\s*DETALLE\s+/i, '').trim().replace(/^PLAN\s+/i, '');
    else if (normalized.startsWith('VALOR DE PLAN')) result.value = amount(text);
    else if (normalized.startsWith('BONIFICACION POR GRUPO DE AFINIDAD')) {
      const value = amount(text);
      if (value !== null) result.discounts.push(Math.abs(value));
    }
  }
  if (!result.name && !result.plan && result.value === null) throw new Error('No se reconoció una cotización compatible en el PDF.');
  return result;
}

export async function readQuotePdf(file) {
  if (!/\.pdf$/i.test(file.name) || file.size > 15 * 1024 * 1024) throw new Error('Elegí un PDF de hasta 15 MB.');
  const pdfjs = await import('./vendor/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.min.mjs', import.meta.url).href;
  const loading = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useSystemFonts: true });
  try {
    const document = await loading.promise;
    const lines = [];
    for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 10); pageNumber++) {
      const content = await (await document.getPage(pageNumber)).getTextContent();
      const groups = new Map();
      for (const item of content.items) {
        if (!item.str?.trim()) continue;
        const y = Math.round(item.transform[5]);
        if (!groups.has(y)) groups.set(y, []);
        groups.get(y).push(item);
      }
      for (const group of groups.values()) lines.push(group.sort((a, b) => a.transform[4] - b.transform[4]).map(item => item.str.trim()).join(' '));
    }
    return parseQuoteLines(lines);
  } finally { await loading.destroy(); }
}
