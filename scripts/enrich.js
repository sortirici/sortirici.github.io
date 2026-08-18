/**
 * enrich.js — Enrichit les événements (catégories, géocodage INSEE)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NORM_DIR = join(__dirname, '..', 'data', 'normalized');
const DATA_DIR = join(__dirname, '..', 'data');

const events = JSON.parse(readFileSync(join(NORM_DIR, 'deduped.json'), 'utf-8'));

// Enrichissement : marquer les événements passés
const now = new Date();
for (const e of events) {
  const endDate = new Date(e.dateFin || e.dateDebut);
  if (endDate < now) e.statut = 'termine';
  else if (endDate < new Date(now.getTime() + 7 * 86400000)) e.statut = 'programme';
  if (e.gratuit) e.prixIndicatif = 'Gratuit';
}

writeFileSync(join(NORM_DIR, 'enriched.json'), JSON.stringify(events, null, 2), 'utf-8');
console.log(`Enrich: ${events.length} events enrichis`);