/**
 * normalize.js — Normalise toutes les sources vers un schéma unique
 * Zéro PII : suppression de tous les emails, téléphones, noms organisateurs
 *
 * Parsers supportés :
 *  - 'openagenda' : format OpenAgenda legacy (export CSV/data.gouv) ET API native v2
 *  - 'csv'        : formats CSV génériques
 *  - 'paris'      : Que Faire à Paris ? (opendata.paris.fr)
 *  - 'nantes'     : Agenda Nantes Métropole
 *  - 'tours'      : Agenda Tours Métropole Val de Loire
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

// Filet de sécurité : un événement dont la date de début est passée de plus de 30 jours
// est considéré comme périmé et n'est pas capturé (les APIs renvoient tout l'historique).
const MAX_PAST_DAYS = 30;

function isTooOld(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false; // date illisible → on garde par précaution
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_PAST_DAYS);
  return d < cutoff;
}

/** Nettoie un texte HTML → texte brut */
function cleanHtml(text) {
  return String(text || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/** Supprime les emails et numéros de téléphone (zéro PII) */
function sanitizeText(text) {
  return String(text || '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email supprimé]')
    .replace(/(?:\+33|0)[1-9](?:[\s.-]?\d{2}){4}/g, '[téléphone supprimé]')
    .trim();
}

/**
 * Parse une valeur de coordonnées vers { lat, lon }.
 * Accepte : {lat, lon} | {latitude, longitude} | "lat,lon" | [lon, lat] (convention OpenDataSoft)
 */
function parseCoords(value) {
  if (!value) return { lat: 0, lon: 0 };
  if (typeof value === 'string') {
    const parts = value.split(',').map(s => parseFloat(s.trim()));
    return { lat: parts[0] || 0, lon: parts[1] || 0 };
  }
  if (Array.isArray(value)) {
    return { lat: parseFloat(value[1]) || 0, lon: parseFloat(value[0]) || 0 };
  }
  if (typeof value === 'object') {
    return {
      lat: parseFloat(value.lat ?? value.latitude) || 0,
      lon: parseFloat(value.lon ?? value.longitude ?? value.lng) || 0,
    };
  }
  return { lat: 0, lon: 0 };
}

function normalizeOpenAgenda(item, sourceId) {
  // Handle multiple API export formats:
  // Format A: { title: { fr: '...' } } — native OpenAgenda API (v2)
  // Format B: { title_fr: '...' }     — data.gouv.fr export / legacy
  function getLocalized(obj, field) {
    const val = obj[field];
    if (typeof val === 'object' && val !== null) return val.fr || val.en || '';
    if (typeof val === 'string') return val;
    const frVal = obj[field + '_fr'];
    if (typeof frVal === 'string') return frVal;
    return '';
  }

  function getField(obj, ...fields) {
    for (const f of fields) {
      if (obj[f] !== undefined && obj[f] !== null) {
        return obj[f];
      }
    }
    return '';
  }

  const loc = item.location && typeof item.location === 'object' ? item.location : {};

  const titre = getLocalized(item, 'title') || item.title_fr || item.titre || '';
  if (!titre) return null;

  const desc = sanitizeText(cleanHtml(getLocalized(item, 'description') || item.description_fr || ''));
  const rawLongDesc = typeof item.longdescription_fr === 'string' ? item.longdescription_fr
    : (item.longDescription && typeof item.longDescription === 'object'
      ? (item.longDescription.fr || item.longDescription.en || '') : '');
  const longDesc = sanitizeText(rawLongDesc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());

  // Dates : legacy (date_debut, firstdate_begin…) OU API native v2 (firstDate + firstTimeStart, timings[])
  let debut = getField(item, 'date_debut', 'firstDateBegin', 'firstdate_begin', 'firstday', 'dateDebut', 'date') || '';
  if (!debut && item.firstDate) {
    debut = item.firstDate + (item.firstTimeStart ? 'T' + item.firstTimeStart : '');
  }
  if (!debut && Array.isArray(item.timings) && item.timings[0] && item.timings[0].start) {
    debut = item.timings[0].start;
  }
  let fin = getField(item, 'date_fin', 'firstDateEnd', 'firstdate_end', 'lastdate_end', 'lastDateEnd', 'lastday', 'dateFin') || debut;
  if ((!fin || fin === debut) && item.lastDate) {
    fin = item.lastDate + (item.lastTimeEnd ? 'T' + item.lastTimeEnd : '');
  }
  if ((!fin || fin === debut) && Array.isArray(item.timings) && item.timings.length > 0) {
    const last = item.timings[item.timings.length - 1];
    if (last && last.end) fin = last.end;
  }

  const coords = parseCoords(
    item.locationCoordinates || item.location_coordinates || item.geo_point_2d
    || (loc.latitude != null ? { lat: loc.latitude, lon: loc.longitude } : null)
    || (item.latitude != null ? { lat: item.latitude, lon: item.longitude } : null)
  );
  const insee = getField(item, 'code_insee', 'locationInsee', 'location_insee', 'codeInsee', 'insee') || loc.insee || '';

  // Keywords : chaîne (legacy) OU tableau OU { fr: [...] } (API native v2)
  let keywordsRaw = item.keywords_fr;
  if (!keywordsRaw && item.keywords) {
    if (Array.isArray(item.keywords)) keywordsRaw = item.keywords;
    else if (Array.isArray(item.keywords.fr)) keywordsRaw = item.keywords.fr;
    else if (typeof item.keywords.fr === 'string') keywordsRaw = item.keywords.fr.split('|');
    else keywordsRaw = [];
  }
  const keywords = Array.isArray(keywordsRaw)
    ? keywordsRaw
    : String(keywordsRaw || '').split(';').map(s => s.trim()).filter(Boolean);

  const conditions = typeof item.conditions_fr === 'string' ? item.conditions_fr
    : (item.conditions && typeof item.conditions === 'object' ? (item.conditions.fr || item.conditions.en || '') : '');
  const gratuit = keywords.join(' ').toLowerCase().includes('gratuit') ||
    /gratuit|libre/i.test(conditions);
  const prix = '';

  const nomLieu = getField(item, 'locationName', 'location_name', 'lieuNom') || loc.name || '';
  const adresse = getField(item, 'locationAddress', 'location_address', 'lieuAdresse', 'address', 'adresse') || loc.address || '';
  const cp = getField(item, 'locationPostalCode', 'location_postalcode', 'lieuCodePostal', 'postalCode') || loc.postalCode || '';
  const commune = getField(item, 'commune', 'locationCity', 'location_city', 'lieuCommune', 'city') || loc.city || item.city || '';
  const dept = getField(item, 'locationDepartment', 'location_department', 'lieuDepartement', 'department') || loc.department || item.department || getDepartmentFromInsee(insee);
  const region = getField(item, 'locationRegion', 'location_region', 'lieuRegion', 'region') || loc.region || item.region || '';
  const updated = getField(item, 'updatedAt', 'updatedat', 'dateMaj') || new Date().toISOString();

  return {
    uid: `oa-${item.uid || Math.random().toString(36).substring(2, 10)}`,
    source: sourceId,
    sourceUrl: item.canonicalUrl || item.canonicalurl || item.url || '',
    licence: 'lov2',
    titre,
    descriptionCourte: desc.substring(0, 300),
    descriptionLongue: longDesc.substring(0, 2000),
    dateDebut: debut,
    dateFin: fin,
    categorie: classifyCategory(titre, desc, keywords),
    motsCles: keywords.slice(0, 10),
    gratuit,
    prixIndicatif: prix,
    lieuNom: nomLieu,
    lieuAdresse: adresse,
    lieuCodePostal: cp,
    lieuCommune: commune,
    lieuCodeInsee: insee,
    lieuLatitude: coords.lat,
    lieuLongitude: coords.lon,
    coordinates: coords.lat ? `${coords.lat},${coords.lon}` : '',
    lieuDepartement: dept,
    lieuRegion: region,
    dateMaj: updated,
    statut: 'programme',
    modeAcces: 'sur_place',
    slug: (item.slug || slugify(titre + '-' + (item.uid || ''))).substring(0, 80),
    departementNumero: getDepartmentFromInsee(insee),
    image: typeof item.image === 'string' ? item.image : '',
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
    descriptionLongue: (item.descriptionLongue || '').substring(0, 2000),
    dateDebut: item.dateDebut || item.date_debut || item.startDate || '',
    dateFin: item.dateFin || item.date_fin || item.endDate || '',
    categorie: classifyCategory(item.titre || '', item.description || '', []),
    motsCles: [],
    gratuit: item.gratuit === true || item.gratuit === 'true' || item.gratuit === 'oui',
    prixIndicatif: sanitizeText(item.prix || ''),
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

/**
 * Parser Paris — Que Faire à Paris ? (opendata.paris.fr)
 * date_start→dateDebut, date_end→dateFin, title→titre, address_city→lieuCommune,
 * lat_lon→coordinates ("lat,lon"), price_type→gratuit, description→descriptionCourte
 */
function normalizeParis(item, sourceId) {
  const titre = item.title || '';
  if (!titre) return null;
  const desc = sanitizeText(cleanHtml(item.description || item.lead_text || ''));
  const loc0 = Array.isArray(item.locations) && item.locations[0] ? item.locations[0] : null;
  const coords = parseCoords(item.lat_lon || (loc0 && loc0.address_lat_lon) || null);
  const cp = String(item.address_zipcode || (loc0 && loc0.address_zipCode) || '');
  const commune = item.address_city || (loc0 && loc0.address_city) || '';
  const dept = cp ? getDepartmentFromInsee(cp) : (commune === 'Paris' ? '75' : '');
  const gratuit = /gratuit/i.test(item.price_type || '');
  const keywords = [item.qfap_tags, ...(Array.isArray(item.universe_tags) ? item.universe_tags : [])].filter(Boolean);

  return {
    uid: `paris-${item.id || item.event_id || Math.random().toString(36).substring(2, 10)}`,
    source: sourceId,
    sourceUrl: item.url || '',
    licence: 'lov2',
    titre,
    descriptionCourte: desc.substring(0, 300),
    descriptionLongue: desc.substring(0, 2000),
    dateDebut: item.date_start || '',
    dateFin: item.date_end || item.date_start || '',
    categorie: classifyCategory(titre, desc, keywords),
    motsCles: keywords.slice(0, 10),
    gratuit,
    prixIndicatif: sanitizeText(cleanHtml(item.price_detail || '')),
    lieuNom: item.address_name || (loc0 && loc0.address_name) || '',
    lieuAdresse: item.address_street || (loc0 && loc0.address_street) || '',
    lieuCodePostal: cp,
    lieuCommune: commune,
    lieuCodeInsee: '',
    lieuLatitude: coords.lat,
    lieuLongitude: coords.lon,
    coordinates: coords.lat ? `${coords.lat},${coords.lon}` : '',
    lieuDepartement: dept,
    lieuRegion: '',
    dateMaj: item.updated_at || new Date().toISOString(),
    statut: 'programme',
    modeAcces: 'sur_place',
    slug: slugify(`${titre}-${item.id || ''}`).substring(0, 80),
    departementNumero: dept,
    image: item.cover_url || '',
  };
}

/**
 * Parser Nantes — Agenda Nantes Métropole
 * nom→titre, date→dateDebut, ville→lieuCommune, code_insee→lieuCodeInsee, lieu→lieuNom,
 * description_evt→descriptionCourte, gratuit→gratuit, heure_debut/heure_fin→timings (dateDebut/dateFin), adresse→lieuAdresse
 */
function normalizeNantes(item, sourceId) {
  const titre = item.nom || '';
  if (!titre) return null;
  const date = item.date || '';
  const heureDebut = item.heure_debut || '';
  const heureFin = item.heure_fin || '';
  const dateDebut = date + (heureDebut ? `T${heureDebut}` : '');
  const dateFin = date + (heureFin ? `T${heureFin}` : (heureDebut ? `T${heureDebut}` : ''));
  const insee = String(item.code_insee || item.code_commune || '');
  const coords = parseCoords(item.location_latlong);
  const gratuit = item.gratuit === 'oui' || item.gratuit === true || item.gratuit === 'true' || item.gratuit === '1';
  const description = sanitizeText(item.description_evt || item.description || '');
  const keywords = [
    ...(Array.isArray(item.types_libelles) ? item.types_libelles : []),
    ...(Array.isArray(item.themes_libelles) ? item.themes_libelles : []),
  ];

  return {
    uid: `nantes-${item.id_manif || Math.random().toString(36).substring(2, 10)}`,
    source: sourceId,
    sourceUrl: item.lien_agenda || '',
    licence: 'lov2',
    titre,
    descriptionCourte: String(description).substring(0, 300),
    descriptionLongue: String(description).substring(0, 2000),
    dateDebut,
    dateFin,
    categorie: classifyCategory(titre, description, keywords),
    motsCles: keywords.slice(0, 10),
    gratuit,
    prixIndicatif: sanitizeText(item.precisions_tarifs_evt || item.precisions_tarifs || ''),
    lieuNom: item.lieu || '',
    lieuAdresse: item.adresse || '',
    lieuCodePostal: String(item.code_postal || ''),
    lieuCommune: item.ville || '',
    lieuCodeInsee: insee,
    lieuLatitude: coords.lat,
    lieuLongitude: coords.lon,
    coordinates: coords.lat ? `${coords.lat},${coords.lon}` : '',
    lieuDepartement: getDepartmentFromInsee(insee),
    lieuRegion: '',
    dateMaj: new Date().toISOString(),
    statut: 'programme',
    modeAcces: 'sur_place',
    slug: slugify(`${titre}-${item.id_manif || ''}`).substring(0, 80),
    departementNumero: getDepartmentFromInsee(insee),
    image: item.media_url || '',
  };
}

/**
 * Parser Tours — Tours Métropole Val de Loire (publidata)
 * name→titre, start_at→dateDebut, end_at→dateFin, city→lieuCommune,
 * geo_coordinates→coordinates, department_insee_code→code INSEE (département),
 * full_text_description→description
 */
function normalizeTours(item, sourceId) {
  const titre = item.name || item.full_name || '';
  if (!titre) return null;
  const desc = sanitizeText(item.full_text_description || cleanHtml(item.rich_description || ''));
  const coords = parseCoords(item.geo_coordinates);
  const deptInsee = String(item.department_insee_code || '');
  const communeInsee = String(item.city_insee_code || '');
  const cp = String(item.postal_code || '');
  const dept = deptInsee || getDepartmentFromInsee(communeInsee || cp);
  const gratuit = /gratuit/i.test(String(item.fees || '')) || /gratuit/i.test(desc);
  const keywords = [
    ...(Array.isArray(item.type) ? item.type : []),
    ...(Array.isArray(item.tags) ? item.tags : []),
    ...(Array.isArray(item.themes) ? item.themes : []),
  ];
  const places = Array.isArray(item.places) ? item.places.join(', ') : (item.places || '');

  return {
    uid: `tours-${item.publidata_uuid || slugify(titre)}`,
    source: sourceId,
    sourceUrl: Array.isArray(item.url) ? item.url[0] : (item.url || ''),
    licence: 'lov2',
    titre,
    descriptionCourte: desc.substring(0, 300),
    descriptionLongue: desc.substring(0, 2000),
    dateDebut: item.start_at || '',
    dateFin: item.end_at || item.start_at || '',
    categorie: classifyCategory(titre, desc, keywords),
    motsCles: keywords.slice(0, 10),
    gratuit,
    prixIndicatif: sanitizeText(String(item.fees || '')).substring(0, 200),
    lieuNom: places,
    lieuAdresse: item.geographic_address || item.postal_address || '',
    lieuCodePostal: cp,
    lieuCommune: item.city || '',
    lieuCodeInsee: communeInsee || deptInsee,
    lieuLatitude: coords.lat,
    lieuLongitude: coords.lon,
    coordinates: coords.lat ? `${coords.lat},${coords.lon}` : '',
    lieuDepartement: dept,
    lieuRegion: item.region || '',
    dateMaj: new Date().toISOString(),
    statut: 'programme',
    modeAcces: 'sur_place',
    slug: slugify(`${titre}-${item.publidata_uuid || ''}`).substring(0, 80),
    departementNumero: dept,
    image: Array.isArray(item.images_url) ? item.images_url[0] : (item.images_url || ''),
  };
}

const PARSERS = {
  openagenda: normalizeOpenAgenda,
  csv: normalizeCSV,
  paris: normalizeParis,
  nantes: normalizeNantes,
  tours: normalizeTours,
};

function main() {
  const results = [];
  const files = [
    { id: 'openagenda-orleans', file: 'openagenda-orleans.json', parser: 'openagenda' },
    { id: 'openagenda-loiret', file: 'openagenda-loiret.json', parser: 'openagenda' },
    { id: 'clermont-agenda', file: 'clermont-agenda.json', parser: 'openagenda' },
    { id: 'guerande-agenda', file: 'guerande-agenda.json', parser: 'openagenda' },
    { id: 'meudon-agenda', file: 'meudon-agenda.json', parser: 'openagenda' },
    { id: 'labaule-agenda', file: 'labaule-agenda.json', parser: 'openagenda' },
    { id: 'nantes-culture', file: 'nantes-culture.json', parser: 'nantes' },
    { id: 'ministere-festivals', file: 'ministere-festivals.json', parser: 'csv' },
    { id: 'bordeaux-agenda', file: 'bordeaux-agenda.json', parser: 'openagenda' },
    { id: 'toulouse-spectacles', file: 'toulouse-spectacles.json', parser: 'csv' },
    { id: 'vendee-tourinsoft', file: 'vendee-tourinsoft.json', parser: 'csv' },
    { id: 'martigues-agenda', file: 'martigues-agenda.csv', parser: 'csv' },
    { id: 'grenoble-culturel', file: 'grenoble-culturel.csv', parser: 'csv' },
    { id: 'occitanie-sorties', file: 'occitanie-sorties.json', parser: 'openagenda' },
    { id: 'idf-evenements-publics', file: 'idf-evenements-publics.json', parser: 'openagenda' },
    { id: 'tours-metropole', file: 'tours-metropole.json', parser: 'tours' },
    { id: 'nice-evenements', file: 'nice-evenements.json', parser: 'openagenda' },
    { id: 'calvados-evenements', file: 'calvados-evenements.json', parser: 'openagenda' },
    { id: 'gpso-evenements', file: 'gpso-evenements.json', parser: 'openagenda' },
    { id: 'nantes-metropole-evenements', file: 'nantes-metropole-evenements.json', parser: 'nantes' },
    { id: 'paris-evenements', file: 'paris-evenements.json', parser: 'paris' },
    { id: 'haute-garonne-grand-ouest', file: 'haute-garonne-grand-ouest.json', parser: 'openagenda' },
    { id: 'chenonceaux-agenda', file: 'chenonceaux-agenda.json', parser: 'openagenda' },
  ];

  for (const { id, file, parser } of files) {
    const filepath = join(RAW_DIR, file);
    try {
      const content = readFileSync(filepath, 'utf-8');
      let items;
      try {
        items = JSON.parse(content);
        // Wrappers : extraire le tableau d'événements quand le JSON est un objet
        if (items && !Array.isArray(items)) {
          if (items.events) items = items.events;       // OpenAgenda API native (ex: Calvados)
          else if (items.data) items = items.data;      // data.gouv.fr exports
          else if (items.objetsTouristiques) items = items.objetsTouristiques; // Nice
          else if (Array.isArray(items.results)) items = items.results;
        }
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

      const parse = PARSERS[parser] || normalizeOpenAgenda;
      const normalized = items
        .filter(Boolean)
        .map(item => parse(item, id))
        .filter(Boolean)
        // Validation : titre + date + lieu obligatoires
        .filter(e => e.titre && e.dateDebut && (e.lieuNom || e.lieuCommune))
        // Filet de sécurité : exclure les événements dont la date de début
        // est déjà passée de plus de 30 jours
        .filter(e => !isTooOld(e.dateDebut));

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
