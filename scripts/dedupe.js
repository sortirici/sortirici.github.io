/**
 * dedupe.js — Supprime les doublons (UID source + titre + date + lieu)
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NORM_DIR = join(__dirname, '..', 'data', 'normalized');

const events = JSON.parse(readFileSync(join(NORM_DIR, 'all.json'), 'utf-8'));

const seen = new Set();
const deduped = [];

for (const e of events) {
  const key = `${e.source}|${e.titre}|${e.dateDebut}|${e.lieuCommune}`.toLowerCase();
  if (!seen.has(key)) {
    seen.add(key);
    deduped.push(e);
  }
}

writeFileSync(join(NORM_DIR, 'deduped.json'), JSON.stringify(deduped, null, 2), 'utf-8');
console.log(`Dedup: ${events.length} → ${deduped.length} (${events.length - deduped.length} doublons supprimés)`);