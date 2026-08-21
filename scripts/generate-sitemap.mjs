// scripts/generate-sitemap.mjs
// Auto-génère le sitemap.xml avec toutes les pages (y compris les événements)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SITE_URL = 'https://sortirici.github.io';
const TODAY = new Date().toISOString().split('T')[0];
const DIST = join(process.cwd(), 'dist');

const urls = [];

// Pages statiques
urls.push({ loc: `${SITE_URL}/`, lastmod: TODAY, priority: '1.0' });
urls.push({ loc: `${SITE_URL}/departement/`, lastmod: TODAY, priority: '0.9' });
urls.push({ loc: `${SITE_URL}/sources/`, lastmod: TODAY, priority: '0.7' });
urls.push({ loc: `${SITE_URL}/mentions/`, lastmod: TODAY, priority: '0.5' });

// Départements
const dataDir = join(process.cwd(), 'public', 'data');
try {
  const deptFiles = readdirSync(dataDir)
    .filter(f => f.startsWith('events-') && f.endsWith('.json') && f !== 'events-index.json')
    .map(f => f.replace('events-', '').replace('.json', ''));

  for (const dept of deptFiles) {
    urls.push({ loc: `${SITE_URL}/departement/${dept}/`, lastmod: TODAY, priority: '0.8' });

    // Événements du département
    try {
      const events = JSON.parse(readFileSync(join(dataDir, `events-${dept}.json`), 'utf-8'));
      for (const e of events) {
        const slug = e.slug || String(e.uid);
        urls.push({
          loc: `${SITE_URL}/evenement/${slug}/`,
          lastmod: e.dateMaj ? e.dateMaj.split('T')[0] : TODAY,
          priority: '0.6',
        });
      }
    } catch {}
  }
} catch {}

// Piliers Catégorie + Ville + Intentions (Cocon Sémantique)
try {
  const cats = new Set();
  const villeCount = new Map();
  for (const dept of deptFiles) {
    try {
      const evts = JSON.parse(readFileSync(join(dataDir, `events-${dept}.json`), 'utf-8'));
      for (const e of evts) {
        if (e.categorie) cats.add(e.categorie);
        if (e.lieuCommune) villeCount.set(e.lieuCommune, (villeCount.get(e.lieuCommune) || 0) + 1);
      }
    } catch {}
  }
  for (const c of cats) {
    urls.push({ loc: `${SITE_URL}/categorie/${c}/`, lastmod: TODAY, priority: '0.7' });
  }
  for (const [v, n] of villeCount) {
    if (n >= 3) urls.push({ loc: `${SITE_URL}/ville/${encodeURIComponent(v)}/`, lastmod: TODAY, priority: '0.6' });
  }
  urls.push({ loc: `${SITE_URL}/gratuit/`, lastmod: TODAY, priority: '0.7' });
  urls.push({ loc: `${SITE_URL}/enfants/`, lastmod: TODAY, priority: '0.7' });
} catch {}

// Génération XML
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

writeFileSync(join(DIST, 'sitemap.xml'), xml, 'utf-8');
console.log(`✓ Sitemap généré avec ${urls.length} URLs`);