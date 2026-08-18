/**
 * healthcheck.js — Teste chaque source et génère sources-health.json
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

const sources = [
  'openagenda-orleans', 'openagenda-loiret', 'clermont-agenda',
  'guerande-agenda', 'meudon-agenda', 'labaule-agenda', 'nantes-culture',
  'ministere-festivals', 'bordeaux-agenda', 'toulouse-spectacles',
  'vendee-tourinsoft', 'martigues-agenda', 'grenoble-culturel', 'loiret-openagenda'
];

// Lire les résultats du dernier fetch
let fetchResults = [];
try {
  fetchResults = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'fetch-results.json'), 'utf-8'));
} catch {}

// Lire les événements normalisés
let allEvents = [];
try {
  allEvents = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'normalized', 'enriched.json'), 'utf-8'));
} catch {}

// Compter par source
const counts = {};
for (const e of allEvents) {
  counts[e.source] = (counts[e.source] || 0) + 1;
}

const health = sources.map(s => {
  const fetch = fetchResults.find(f => f.source === s);
  return {
    source: s,
    status: fetch?.status || 'unknown',
    lastFetch: fetch ? new Date().toISOString() : null,
    eventCount: counts[s] || 0,
    latencyMs: fetch?.latencyMs || 0,
    error: fetch?.error || null,
    consecutiveErrors: fetch?.status === 'error' ? 1 : 0,
  };
});

writeFileSync(join(PUBLIC_DIR, 'sources-health.json'), JSON.stringify(health, null, 2), 'utf-8');
const ok = health.filter(h => h.status === 'ok').length;
const err = health.filter(h => h.status === 'error').length;
console.log(`Healthcheck: ${ok} OK, ${err} errors (${sources.length} total)`);