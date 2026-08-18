/**
 * build-index.js — Construit les index JSON par département
 * Génère data/events-{dept}.json pour chaque département
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NORM_DIR = join(__dirname, '..', 'data', 'normalized');
const INDEX_DIR = join(__dirname, '..', 'public', 'data');
const DATA_DIR = join(__dirname, '..', 'data');

mkdirSync(INDEX_DIR, { recursive: true });

const events = JSON.parse(readFileSync(join(NORM_DIR, 'enriched.json'), 'utf-8'));

// Index par département
const byDept = {};
for (const e of events) {
  const dept = e.departementNumero || '00';
  if (!byDept[dept]) byDept[dept] = [];
  byDept[dept].push(e);
}

// Écrire les fichiers par département
const deptMeta = [];
for (const [dept, evts] of Object.entries(byDept)) {
  // Limiter à 200 events récents par département
  const sorted = evts.sort((a, b) => new Date(b.dateDebut) - new Date(a.dateDebut));
  const recent = sorted.slice(0, 200);
  const filepath = join(INDEX_DIR, `events-${dept}.json`);
  writeFileSync(filepath, JSON.stringify(recent, null, 2), 'utf-8');
  deptMeta.push({
    departement: dept,
    nom: evts[0]?.lieuRegion || '',
    totalEvents: sorted.length,
    visibleEvents: recent.length,
  });
  console.log(`📁 events-${dept}.json: ${recent.length} events (${sorted.length} total)`);
}

// Index global
writeFileSync(join(INDEX_DIR, 'events-index.json'), JSON.stringify({
  lastUpdated: new Date().toISOString(),
  totalEvents: events.length,
  totalDepartements: Object.keys(byDept).length,
  departements: deptMeta,
  sources: [...new Set(events.map(e => e.source))],
}, null, 2), 'utf-8');

// Sitemap
const urls = [
  'https://sortirici.github.io/',
  'https://sortirici.github.io/departements/',
  'https://sortirici.github.io/sources/',
  'https://sortirici.github.io/mentions/',
  ...Object.keys(byDept).map(d => `https://sortirici.github.io/departement/${d}/`),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod></url>`).join('\n')}
</urlset>`;
writeFileSync(join('public', 'sitemap.xml'), sitemap, 'utf-8');

console.log(`\n✅ Build index: ${events.length} events, ${Object.keys(byDept).length} départements`);