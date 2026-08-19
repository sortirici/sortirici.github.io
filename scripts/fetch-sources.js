/**
 * fetch-sources.js — Récupération des données depuis les APIs open data
 * Sources: OpenAgenda, Ministère Culture, Portails open data locaux
 * Toutes les sources ont des licences ouvertes vérifiées (lov2, fr-lo, odc-odbl)
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, '..', 'data', 'raw');

mkdirSync(RAW_DIR, { recursive: true });

const SOURCES = [
  {
    id: 'openagenda-orleans',
    name: 'OpenAgenda Orléans Métropole',
    url: 'https://data.orleans-metropole.fr/api/explore/v2.1/catalog/datasets/agenda-orleans-metropole/exports/json?limit=10000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'openagenda-loiret',
    name: 'OpenAgenda Loiret',
    url: 'https://openagenda.com/agendas/36668061/events.json?limit=5000&oaq%5Bpassed%5D=1',
    format: 'json',
    licence: 'fr-lo',
  },
  {
    id: 'clermont-agenda',
    name: 'Agenda Clermont-Ferrand',
    url: 'https://opendata.clermontmetropole.eu/api/explore/v2.1/catalog/datasets/agenda-vcf/exports/json?limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'guerande-agenda',
    name: 'Agenda Guérande',
    url: 'https://data.capatlantique.fr/api/explore/v2.1/catalog/datasets/214400699_agenda-de-la-ville-de-guerande/exports/json?limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'meudon-agenda',
    name: 'Agenda Meudon',
    url: 'https://data.meudon.fr/api/explore/v2.1/catalog/datasets/openagenda/exports/json?limit=5000',
    format: 'json',
    licence: 'fr-lo',
  },
  {
    id: 'labaule-agenda',
    name: 'Agenda La Baule',
    url: 'https://data.capatlantique.fr/api/explore/v2.1/catalog/datasets/214400558_agenda-la-baule-escoublac/exports/json?limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'nantes-culture',
    name: 'Agenda culturel Nantes',
    url: 'https://data.nantesmetropole.fr/api/explore/v2.1/catalog/datasets/244400404_agenda-animations-culturelles-bibliotheque-municipale-nantes/exports/json?limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'ministere-festivals',
    name: 'Festivals France (Ministère Culture)',
    url: 'https://data.culture.gouv.fr/api/explore/v2.1/catalog/datasets/panorama-des-festivals/exports/json?limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'bordeaux-agenda',
    name: 'Agenda Bordeaux Métropole',
    url: 'https://datahub.bordeaux-metropole.fr/api/explore/v2.1/catalog/datasets/met_agenda/exports/json?limit=5000',
    format: 'json',
    licence: 'fr-lo',
  },
  {
    id: 'toulouse-spectacles',
    name: 'Salles spectacles Toulouse',
    url: 'https://data.toulouse-metropole.fr/api/explore/v2.1/catalog/datasets/theatres-et-salles-de-spectacles/exports/json?limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'vendee-tourinsoft',
    name: 'Agenda Vendée (Tourinsoft)',
    url: 'https://wcf.tourinsoft.com/Syndication/3.0/cdt85/e5d817f6-7b50-4b7f-854c-b642df05d7a6/objects?$format=json&$top=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'martigues-agenda',
    name: 'Agenda Martigues',
    url: 'https://openagenda.com/agendas/65550273/events.v2.csv?oaq%5Bpassed%5D=1',
    format: 'csv',
    licence: 'lov2',
  },
  {
    id: 'grenoble-culturel',
    name: 'Agenda culturel Grenoble',
    url: 'https://data.metropolegrenoble.fr/sites/default/files/dataset/2024/01/04/124583ce-be69-4627-ada0-c36c466d44ad/agenda_culturel_de_grenoble.csv',
    format: 'csv',
    licence: 'odc-odbl',
  },
  {
    id: 'occitanie-sorties',
    name: 'Agendas participatifs des sorties en Occitanie',
    url: 'https://data.laregion.fr/api/explore/v2.1/catalog/datasets/agendas-participatif-des-sorties-en-occitanie/exports/json?limit=10000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'idf-evenements-publics',
    name: 'Événements publics Île-de-France',
    url: 'https://data.iledefrance.fr/api/explore/v2.1/catalog/datasets/evenements-publics-cibul/exports/json?limit=10000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'nice-evenements',
    name: "Événements Nice Côte d'Azur",
    url: 'http://opendata.nicecotedazur.org/data/storage/f/2026-05-09T06:06:01.384Z/events-public.json',
    format: 'json',
    licence: 'lov2',
  },
  // === NOUVELLES SOURCES ===
  // Calvados (Normandie) — OpenAgenda API directe
  {
    id: 'calvados-evenements',
    name: 'Événements Calvados (OpenAgenda)',
    url: 'https://openagenda.com/agendas/11317568/events.json?page=1&oaq%5Bpassed%5D=1&key=8a4568494128ff4e57e91284ae275fb2&limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  // GPSO — Grand Paris Seine Ouest (Hauts-de-Seine)
  {
    id: 'gpso-evenements',
    name: 'Événements GPSO (OpenAgenda)',
    url: 'https://data.seineouest.fr/api/explore/v2.1/catalog/datasets/openagenda-gpso/exports/json?limit=10000',
    format: 'json',
    licence: 'fr-lo',
  },
  // Nantes Métropole — Agenda global des événements
  {
    id: 'nantes-metropole-evenements',
    name: 'Agenda des événements Nantes Métropole',
    url: 'https://data.nantesmetropole.fr/api/explore/v2.1/catalog/datasets/244400404_agenda-evenements-nantes-metropole_v2/exports/json?limit=10000',
    format: 'json',
    licence: 'lov2',
  },
  // Tours Métropole Val de Loire
  {
    id: 'tours-metropole',
    name: 'Événements Tours Métropole',
    url: 'https://data.tours-metropole.fr/api/explore/v2.1/catalog/datasets/evenements-tours-metropole-val-de-loire/exports/json?limit=10000',
    format: 'json',
    licence: 'lov2',
  },
  // Paris — Que Faire à Paris ?
  {
    id: 'paris-evenements',
    name: 'Que Faire à Paris ? Événements',
    url: 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/exports/json?limit=10000',
    format: 'json',
    licence: 'odc-odbl',
  },
  // Haute-Garonne — Grand Ouest Toulousain
  {
    id: 'haute-garonne-grand-ouest',
    name: 'Agenda Grand Ouest Toulousain (OpenAgenda)',
    url: 'https://data.haute-garonne.fr/api/explore/v2.1/catalog/datasets/agenda-du-grand-ouest-toulousain/exports/json?limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  // CC Autour de Chenonceaux (Indre-et-Loire)
  {
    id: 'chenonceaux-agenda',
    name: 'Agenda CC Autour de Chenonceaux',
    url: 'https://data.cc-autourdechenonceaux.fr/api/explore/v2.1/catalog/datasets/attractivite-intramuros-api-agenda/exports/json?limit=5000',
    format: 'json',
    licence: 'lov2',
  },
];

async function fetchSource(source) {
  const start = Date.now();
  try {
    const response = await fetch(source.url, {
      signal: AbortSignal.timeout(30000),
      headers: { 'Accept': 'application/json, text/csv' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const text = await response.text();
    const filepath = join(RAW_DIR, `${source.id}.${source.format === 'csv' ? 'csv' : 'json'}`);
    writeFileSync(filepath, text, 'utf-8');
    const elapsed = Date.now() - start;
    console.log(`✅ ${source.id} — ${(text.length / 1024).toFixed(1)}KB — ${elapsed}ms`);
    return { source: source.id, status: 'ok', bytes: text.length, latencyMs: elapsed };
  } catch (err) {
    console.error(`❌ ${source.id} — ${err.message}`);
    return { source: source.id, status: 'error', error: err.message, latencyMs: Date.now() - start };
  }
}

async function main() {
  console.log(`Fetching ${SOURCES.length} sources...`);
  const results = await Promise.allSettled(SOURCES.map(fetchSource));
  const health = results.map(r => r.status === 'fulfilled' ? r.value : {
    source: 'unknown', status: 'error', error: r.reason?.message || 'Unknown error'
  });
  writeFileSync(join(RAW_DIR, '..', 'fetch-results.json'), JSON.stringify(health, null, 2), 'utf-8');
  const ok = health.filter(h => h.status === 'ok').length;
  const err = health.filter(h => h.status === 'error').length;
  console.log(`\nDone: ${ok} OK, ${err} errors (${SOURCES.length} total)`);
}

main().catch(console.error);