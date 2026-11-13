const fs = require('node:fs');
// Keep browser-compatible builds reproducible from the vendored PDF.js modules.
for (const name of ['pdf', 'pdf.worker']) {
  const source = fs.readFileSync(`vendor/${name}.min.mjs`, 'utf8');
  if (!/export\{[^}]+\};\s*$/.test(source)) throw Error(`Unexpected PDF.js exports: ${name}`);
  const classic = source.replace(/export\{[^}]+\};\s*$/, '').replaceAll('import.meta.url', 'moduleUrl');
  fs.writeFileSync(`vendor/${name}.classic.js`, `(function () {\nconst moduleUrl = document.currentScript.src;\n${classic}\n})();\n`);
}
const quote = fs.readFileSync('quote.mjs', 'utf8')
  .replaceAll('export function ', 'function ').replaceAll('export async function ', 'async function ')
  .replace("const pdfjs = await import('./vendor/pdf.min.mjs');", 'const pdfjs = globalThis.pdfjsLib;')
  .replace("new URL('./vendor/pdf.worker.min.mjs', import.meta.url).href", "new URL('vendor/pdf.worker.classic.js', document.baseURI).href");
fs.writeFileSync('quote.js', `(function () {\n${quote}\nglobalThis.PulsoQuote = Object.freeze({ parseQuoteLines, readQuotePdf });\n})();\n`);
