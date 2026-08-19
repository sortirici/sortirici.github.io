/**
 * fetch-sources.js — Récupération des données depuis les APIs open data
 * Sources: OpenAgenda, Ministère Culture, Portails open data locaux, Mobilizon
 * Toutes les sources ont des licences ouvertes vérifiées (lov2, fr-lo, odc-odbl, agpl-3.0)
 *
 * Script auto-généré à partir des fichiers présents dans data/raw/
 * 39 sources : 37 OpenAgenda (via agendas ID ou OpenDataSoft), 1 Mobilizon, 1 CSV
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, '..', 'data', 'raw');

mkdirSync(RAW_DIR, { recursive: true });

const SOURCES = [
  // ═══════════════════════════════════════════════════════════════
  // SOURCES OpenDataSoft (API explore v2.1 — data.*.fr)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'openagenda-orleans',
    name: 'OpenAgenda Orléans Métropole',
    url: 'https://data.orleans-metropole.fr/api/explore/v2.1/catalog/datasets/agenda-orleans-metropole/exports/json?limit=10000',
    format: 'json',
    licence: 'lov2',
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
    name: 'Agenda culturel Nantes (bibliothèques)',
    url: 'https://data.nantesmetropole.fr/api/explore/v2.1/catalog/datasets/244400404_agenda-animations-culturelles-bibliotheque-municipale-nantes/exports/json?limit=5000',
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
    url: 'https://opendata.nicecotedazur.org/data/storage/f/2026-05-09T06:06:01.384Z/events-public.json',
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
    id: 'nantes-metropole-evenements',
    name: 'Agenda des événements Nantes Métropole',
    url: 'https://data.nantesmetropole.fr/api/explore/v2.1/catalog/datasets/244400404_agenda-evenements-nantes-metropole_v2/exports/json?limit=10000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'tours-metropole',
    name: 'Événements Tours Métropole',
    url: 'https://data.tours-metropole.fr/api/explore/v2.1/catalog/datasets/evenements-tours-metropole-val-de-loire/exports/json?limit=10000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'paris-evenements',
    name: 'Que Faire à Paris ? Événements',
    url: 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/exports/json?limit=10000',
    format: 'json',
    licence: 'odc-odbl',
  },
  {
    id: 'haute-garonne-grand-ouest',
    name: 'Agenda Grand Ouest Toulousain (OpenAgenda)',
    url: 'https://data.haute-garonne.fr/api/explore/v2.1/catalog/datasets/agenda-du-grand-ouest-toulousain/exports/json?limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'chenonceaux-agenda',
    name: 'Agenda CC Autour de Chenonceaux',
    url: 'https://data.cc-autourdechenonceaux.fr/api/explore/v2.1/catalog/datasets/attractivite-intramuros-api-agenda/exports/json?limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'gpso-evenements',
    name: 'Événements GPSO (OpenAgenda)',
    url: 'https://data.seineouest.fr/api/explore/v2.1/catalog/datasets/openagenda-gpso/exports/json?limit=10000',
    format: 'json',
    licence: 'fr-lo',
  },

  // ═══════════════════════════════════════════════════════════════
  // SOURCES OpenAgenda API directe (agendas/{id}/events.json)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'openagenda-loiret',
    name: "OpenAgenda Loiret — L'Agenda du Loiret",
    url: 'https://openagenda.com/agendas/36668061/events.json?page=1&oaq%5Bpassed%5D=1&limit=5000',
    format: 'json',
    licence: 'fr-lo',
  },
  {
    id: 'calvados-evenements',
    name: 'Événements Calvados (OpenAgenda)',
    url: 'https://openagenda.com/agendas/11317568/events.json?page=1&oaq%5Bpassed%5D=1&limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'martigues-agenda',
    name: 'Agenda Martigues (CSV OpenAgenda)',
    url: 'https://openagenda.com/agendas/65550273/events.v2.csv?oaq%5Bpassed%5D=1',
    format: 'csv',
    licence: 'lov2',
  },
  {
    id: 'rouen-metropole-evenements',
    name: 'Événements Rouen Normandie Métropole (agrégat OpenAgenda)',
    url: 'https://openagenda.com/agendas/11362982/events.json?page=1&oaq%5Bpassed%5D=1&limit=10000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'villeurbanne-agenda-culturel',
    name: 'Agenda culturel Villeurbanne (OpenAgenda)',
    url: 'https://openagenda.com/agendas/1168665/events.json?page=1&oaq%5Bpassed%5D=1&limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'draguignan-evenements',
    name: 'Événements Draguignan (OpenAgenda)',
    url: 'https://openagenda.com/agendas/1276382/events.json?page=1&oaq%5Bpassed%5D=1&limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'criquiers-evenements',
    name: "Comité des fêtes de Criquiers (OpenAgenda)",
    url: 'https://openagenda.com/agendas/81198/events.json?page=1&oaq%5Bpassed%5D=1&limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'jardins-ouverts-2026',
    name: 'Jardins Ouverts 2026 (OpenAgenda)',
    url: 'https://openagenda.com/agendas/326750/events.json?page=1&oaq%5Bpassed%5D=1&limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'jnarchi-bourgogne-franche-comte',
    name: 'JNArchi 2026 Bourgogne-Franche-Comté (OpenAgenda)',
    url: 'https://openagenda.com/agendas/355525/events.json?page=1&oaq%5Bpassed%5D=1&limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'jep-centre-val-de-loire',
    name: 'JEP 2026 Centre-Val de Loire (OpenAgenda)',
    url: 'https://openagenda.com/agendas/54621/events.json?page=1&oaq%5Bpassed%5D=1&limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'jep-bretagne',
    name: 'JEP 2026 Bretagne (OpenAgenda)',
    url: 'https://openagenda.com/agendas/4907315/events.json?page=1&oaq%5Bpassed%5D=1&limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'jep-normandie',
    name: 'JEP 2026 Normandie (OpenAgenda)',
    url: 'https://openagenda.com/agendas/6229160/events.json?page=1&oaq%5Bpassed%5D=1&limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'jep-hauts-de-france',
    name: 'JEP 2026 Hauts-de-France (OpenAgenda)',
    url: 'https://openagenda.com/agendas/6003796/events.json?page=1&oaq%5Bpassed%5D=1&limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'jep-corse',
    name: 'JEP 2026 Corse (OpenAgenda)',
    url: 'https://openagenda.com/agendas/8167460/events.json?page=1&oaq%5Bpassed%5D=1&limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'jep-grand-est',
    name: 'JEP 2026 Grand Est (OpenAgenda)',
    url: 'https://openagenda.com/agendas/7446108/events.json?page=1&oaq%5Bpassed%5D=1&limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'jep-bourgogne-franche-comte',
    name: 'JEP 2026 Bourgogne-Franche-Comté (OpenAgenda)',
    url: 'https://openagenda.com/agendas/6593724/events.json?page=1&oaq%5Bpassed%5D=1&limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'jep-pays-de-la-loire',
    name: 'JEP 2026 Pays de la Loire (OpenAgenda)',
    url: 'https://openagenda.com/agendas/4455567/events.json?page=1&oaq%5Bpassed%5D=1&limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'jep-auvergne-rhone-alpes',
    name: 'JEP 2026 Auvergne-Rhône-Alpes (OpenAgenda)',
    url: 'https://openagenda.com/agendas/2470317/events.json?page=1&oaq%5Bpassed%5D=1&limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'jep-paca',
    name: "JEP 2026 Provence-Alpes-Côte d'Azur (OpenAgenda)",
    url: 'https://openagenda.com/agendas/2476341/events.json?page=1&oaq%5Bpassed%5D=1&limit=5000',
    format: 'json',
    licence: 'lov2',
  },
  {
    id: 'jep-nouvelle-aquitaine',
    name: 'JEP 2026 Nouvelle-Aquitaine (OpenAgenda)',
    url: 'https://openagenda.com/agendas/686106/events.json?page=1&oaq%5Bpassed%5D=1&limit=5000',
    format: 'json',
    licence: 'lov2',
  },

  // ═══════════════════════════════════════════════════════════════
  // MOBILIZON (GraphQL API)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'mobilizon-france',
    name: 'Mobilizon.fr — Événements France entière',
    url: 'https://mobilizon.fr/api',
    format: 'json',
    licence: 'agpl-3.0',
  },
];

async function fetchSource(source) {
  const start = Date.now();
  try {
    let text;
    const filepath = join(RAW_DIR, `${source.id}.${source.format === 'csv' ? 'csv' : 'json'}`);

    // Mobilizon uses GraphQL — POST a search query
    if (source.id === 'mobilizon-france') {
      const query = {
        query: `
          query SearchEvents($page: Int, $limit: Int) {
            searchEvents(page: $page, limit: $limit) {
              elements {
                ... on Event {
                  uuid
                  title
                  description
                  beginsOn
                  endsOn
                  category
                  tags { title }
                  physicalAddress {
                    description
                    locality
                    postalCode
                    region
                    country
                    geom
                  }
                  url
                  picture { url }
                }
              }
              total
            }
          }
        `,
        variables: { page: 1, limit: 10000 },
      };
      const response = await fetch(source.url, {
        method: 'POST',
        signal: AbortSignal.timeout(60000),
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(query),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const json = await response.json();
      const events = json?.data?.searchEvents?.elements || [];
      text = JSON.stringify(events, null, 2);
    } else {
      const response = await fetch(source.url, {
        signal: AbortSignal.timeout(source.format === 'csv' ? 120000 : 30000),
        headers: { 'Accept': 'application/json, text/csv' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      text = await response.text();
    }

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