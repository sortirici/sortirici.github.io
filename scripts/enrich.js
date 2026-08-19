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

// Enrichissement : filtrer les événements à venir uniquement
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // début du jour

const upcoming = [];
const passed = [];

for (const e of events) {
  const endDate = new Date(e.dateFin || e.dateDebut);
  if (isNaN(endDate.getTime())) {
    // Date invalide → on garde par précaution
    if (e.gratuit) e.prixIndicatif = 'Gratuit';
    upcoming.push(e);
  } else if (endDate >= today) {
    // Événement aujourd'hui ou à venir
    if (e.gratuit) e.prixIndicatif = 'Gratuit';
    e.statut = 'programme';
    upcoming.push(e);
  } else {
    // Événement passé
    e.statut = 'passe';
    passed.push(e);
  }
}

writeFileSync(join(NORM_DIR, 'enriched.json'), JSON.stringify(upcoming, null, 2), 'utf-8');
console.log(`Enrich: ${upcoming.length} events à venir, ${passed.length} events passés exclus`);