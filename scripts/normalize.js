/**
 * normalize.js — Normalise toutes les sources vers un schéma unique
 * Zéro PII : suppression de tous les emails, téléphones, noms organisateurs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(__dirname, '..', 'data', 'raw');
const NORM_DIR = join(__dirname, '..', 'data', 'normalized');
mkdirSync(NORM_DIR, { recursive: true });

const CATEGORIES = [
  'concert', 'theatre', 'exposition', 'spectacle', 'festival',
  'cinema', 'danse', 'cirque', 'lecture', 'conference',
  'atelier', 'marche', 'foire', 'sport', 'enfants'
];

const CATEGORY_KEYWORDS = {
  concert: ['concert', 'musique', 'live', 'show', 'musical', 'orchestre', 'chorale', 'jazz', 'rock', 'pop', 'classique'],
  theatre: ['theatre', 'pièce', 'comedie', 'drame', 'scene', 'one man', 'humour', 'improvisation'],
  exposition: ['exposition', 'expo', 'vernissage', 'galerie', 'musee', 'art', 'photo', 'peinture', 'sculpture'],
  spectacle: ['spectacle', 'cabaret', 'magie', 'cirque', 'variété'],
  festival: ['festival', 'festiv', 'biennale', 'rencontres'],
  cinema: ['cinema', 'film', 'projection', 'cine-club', 'avant-premiere', 'documentaire'],
  danse: ['danse', 'ballet', 'contemporain', 'hip-hop', 'breakdance', 'tango', 'salsa'],
  cirque: ['cirque', 'jonglage', 'acrobatie', 'clown'],
  lecture: ['lecture', 'rencontre auteur', 'dedicace', 'poesie', 'litterature', 'livre', 'bibliotheque'],
  conference: ['conference', 'colloque', 'seminaire', 'table ronde', 'debats', 'conférence'],
  atelier: ['atelier', 'stage', 'initiation', 'pratique', 'diy', 'faire soi-meme', 'apprendre'],
  marche: ['marche', 'brocante', 'vide-grenier', 'artisanat', 'marché'],
  foire: ['foire', 'salon', 'fête foraine', 'foire'],
  sport: ['sport', 'course', 'match', 'tournoi', 'rando', 'velo', 'marche', 'athletisme', 'competition'],
  enfants: ['enfant', 'famille', 'jeune public', 'animation', 'jeux', 'atelier enfant', 'éveil'],
};

function classifyCategory(title, description, keywords) {
  const text = `${title} ${description || ''} ${(keywords || []).join(' ')}`.toLowerCase();
  let bestCategory = 'spectacle';
  let bestScore = 0;
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = words.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; bestCategory = cat; }
  }
  return bestCategory;
}

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

function getDepartmentFromInsee(insee) {
  if (!insee) return '00';
  if (insee.startsWith('97') || insee.startsWith('98')) return insee.substring(0, 3);
  return insee.substring(0, 2);
}

function normalizeOpenAgenda(item, sourceId) {
  const titre = item.title?.fr || item.title || '';
  const description = (item.description?.fr || item.description || '').substring(0, 300);
  const debut = item.firstDateBegin || item.firstdate_begin || '';
  const fin = item.lastDateEnd || item.lastdate_end || item.firstDateEnd || item.firstdate_end || debut;
  const coords = item.locationCoordinates || { lon: 0, lat: 0 };
  const insee = item.locationInsee || item.location_insee || '';
  const gratuit = (item.keywords_fr || item.keywords?.fr || []).join(' ').toLowerCase().includes('gratuit') ||
    item.conditions_fr?.toLowerCase().includes('gratuit');
  const keywordArray = (item.keywords_fr || item.keywords?.fr || []).join('|').split('|');

  return {
    uid: `oa-${item.uid || item.uid}`,
    source: sourceId,
    sourceUrl: item.canonicalUrl || item.canonicalurl || '',
    licence: 'lov2',
    titre,
    descriptionCourte: description.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
    dateDebut: debut,
    dateFin: fin || debut,
    categorie: classifyCategory(titre, description, keywordArray),
    motsCles: keywordArray.slice(0, 10),
    gratuit,
    prixIndicatif: '',
    lieuNom: item.locationName || item.location_name || '',
    lieuAdresse: item.locationAddress || item.location_address || '',
    lieuCodePostal: item.locationPostalCode || item.location_postalcode || '',
    lieuCommune: item.locationCity || item.location_city || '',
    lieuCodeInsee: insee,
    lieuLatitude: coords.lat || 0,
    lieuLongitude: coords.lon || 0,
    lieuDepartement: getDepartmentFromInsee(insee),
    lieuRegion: item.locationRegion || item.location_region || '',
    dateMaj: item.updatedAt || item.updatedat || new Date().toISOString(),
    statut: 'programme',
    modeAcces: 'sur_place',
    slug: slugify(`${titre}-${item.uid || item.uid}`),
    departementNumero: getDepartmentFromInsee(insee),
    // PII SUPPRIMÉES: contributorEmail, contributorContactNumber, contributorContactName, contributorContactPosition
  };
}

function normalizeCSV(item, sourceId) {
  // Generic CSV normalization - adapt to specific column names
  return {
    uid: `csv-${sourceId}-${item.id || item.uid || Math.random().toString(36).substring(2, 10)}`,
    source: sourceId,
    sourceUrl: item.url || item.siteWeb || '',
    licence: 'lov2',
    titre: item.titre || item.title || item.nom || '',
    descriptionCourte: (item.description || '').substring(0, 300),
    dateDebut: item.dateDebut || item.date_debut || item.startDate || '',
    dateFin: item.dateFin || item.date_fin || item.endDate || '',
    categorie: classifyCategory(item.titre || '', item.description || '', []),
    motsCles: [],
    gratuit: item.gratuit === true || item.gratuit === 'true' || item.gratuit === 'oui',
    prixIndicatif: item.prix || '',
    lieuNom: item.lieu || item.lieu_nom || item.location || '',
    lieuAdresse: item.adresse || item.address || '',
    lieuCodePostal: item.codePostal || item.code_postal || item.postalCode || '',
    lieuCommune: item.commune || item.ville || item.city || '',
    lieuCodeInsee: item.codeInsee || item.code_insee || item.insee || '',
    lieuLatitude: parseFloat(item.latitude || item.lat || 0),
    lieuLongitude: parseFloat(item.longitude || item.lon || item.lng || 0),
    lieuDepartement: getDepartmentFromInsee(item.codeInsee || item.code_insee || item.insee),
    lieuRegion: item.region || '',
    dateMaj: new Date().toISOString(),
    statut: 'programme',
    modeAcces: 'sur_place',
    slug: slugify(`${item.titre || item.title || item.nom || ''}-${sourceId}`),
    departementNumero: getDepartmentFromInsee(item.codeInsee || item.code_insee || item.insee),
  };
}

function main() {
  const results = [];
  const files = [
    { id: 'openagenda-orleans', file: 'openagenda-orleans.json', parser: 'openagenda' },
    { id: 'openagenda-loiret', file: 'openagenda-loiret.json', parser: 'openagenda' },
    { id: 'clermont-agenda', file: 'clermont-agenda.json', parser: 'openagenda' },
    { id: 'guerande-agenda', file: 'guerande-agenda.json', parser: 'openagenda' },
    { id: 'meudon-agenda', file: 'meudon-agenda.json', parser: 'openagenda' },
    { id: 'labaule-agenda', file: 'labaule-agenda.json', parser: 'openagenda' },
    { id: 'nantes-culture', file: 'nantes-culture.json', parser: 'openagenda' },
    { id: 'ministere-festivals', file: 'ministere-festivals.json', parser: 'csv' },
    { id: 'bordeaux-agenda', file: 'bordeaux-agenda.json', parser: 'openagenda' },
    { id: 'toulouse-spectacles', file: 'toulouse-spectacles.json', parser: 'csv' },
    { id: 'vendee-tourinsoft', file: 'vendee-tourinsoft.json', parser: 'csv' },
    { id: 'martigues-agenda', file: 'martigues-agenda.csv', parser: 'csv' },
    { id: 'grenoble-culturel', file: 'grenoble-culturel.csv', parser: 'csv' },
    { id: 'loiret-openagenda', file: 'loiret-openagenda.json', parser: 'openagenda' },
  ];

  for (const { id, file, parser } of files) {
    const filepath = join(RAW_DIR, file);
    try {
      const content = readFileSync(filepath, 'utf-8');
      let items;
      try {
        items = JSON.parse(content);
        if (items.events) items = items.events;
        if (items.data) items = items.data;
        if (!Array.isArray(items)) items = [items];
      } catch {
        // CSV fallback
        const lines = content.split('\n').slice(1);
        const headers = lines[0]?.split(',').map(h => h.trim()) || [];
        items = lines.slice(1).filter(Boolean).map(l => {
          const vals = l.split(',').map(v => v.replace(/^"|"$/g, ''));
          return headers.reduce((o, h, i) => ({ ...o, [h]: vals[i] || '' }), {});
        });
      }

      const normalized = items
        .filter(Boolean)
        .map(item => parser === 'openagenda' ? normalizeOpenAgenda(item, id) : normalizeCSV(item, id))
        .filter(e => e.titre && e.dateDebut && e.lieuCommune);

      const outPath = join(NORM_DIR, `${id}.json`);
      writeFileSync(outPath, JSON.stringify(normalized, null, 2), 'utf-8');
      console.log(`✅ ${id}: ${normalized.length} events normalisés`);
      results.push(...normalized);
    } catch (err) {
      console.log(`⚠️ ${id}: ${err.message}`);
    }
  }

  const totalPath = join(NORM_DIR, 'all.json');
  writeFileSync(totalPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nTotal: ${results.length} events normalisés`);
}

main();