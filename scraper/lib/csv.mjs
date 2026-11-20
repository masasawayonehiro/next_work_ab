import fs from 'node:fs';
import path from 'node:path';

// ダブルクォート・カンマ・改行に対応した簡易CSVパーサ。1行目をヘッダーとしてオブジェクトの配列を返す
export function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [header, ...body] = rows;
  return { header, rows: body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? '']))) };
}

export const readCsv = (file) => parseCsv(fs.readFileSync(file, 'utf8'));

// Excelで文字化けしないようBOM付きUTF-8で書き出す
export function writeCsv(file, cols, rows) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.map(cell).join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))];
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '﻿' + lines.join('\r\n'));
}
