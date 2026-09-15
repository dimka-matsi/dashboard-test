#!/usr/bin/env node
/**
 * Проверка бюджета production-сборки: суммарный gzip JS+CSS ≤ BUNDLE_LIMIT_KB (по умолчанию 200).
 * Использование: node scripts/check-bundle-size.mjs [путь к dist]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(process.argv[2] ?? path.join(here, '../apps/web/dist'));
const limitKb = Number(process.env.BUNDLE_LIMIT_KB ?? 200);
const limit = limitKb * 1024;

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

const counted = walk(dist).filter((file) => /\.(js|mjs|css)$/.test(file));
if (counted.length === 0) {
  console.error(`В ${dist} нет JS/CSS файлов — сборка не найдена`);
  process.exit(1);
}

const rows = counted.map((file) => {
  const raw = readFileSync(file);
  return {
    file: path.relative(dist, file),
    raw: raw.length,
    gzip: gzipSync(raw, { level: 9 }).length,
  };
});
const total = rows.reduce((sum, row) => sum + row.gzip, 0);
const kb = (bytes) => (bytes / 1024).toFixed(1).padStart(7);

console.log('\nБюджет production-сборки (gzip -9):');
for (const row of rows) console.log(`  ${kb(row.gzip)} КБ  (${kb(row.raw)} КБ raw)  ${row.file}`);
console.log(`  ${'-'.repeat(60)}`);
console.log(`  ${kb(total)} КБ  итого при лимите ${limitKb} КБ\n`);

if (total > limit) {
  console.error(`Сборка превышает бюджет на ${kb(total - limit)} КБ`);
  process.exit(1);
}
