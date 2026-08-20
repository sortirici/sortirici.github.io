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
/**
 * Corrige la typographie et les erreurs courantes dans les textes français.
 * Appliqué aux descriptions longues pour améliorer la qualité SEO/GEO.
 */
function correctText(text) {
  if (!text) return '';
  let t = String(text);
  // 1. Décoder les entités HTML courantes
  t = t.replace(/&amp;/g, '&')
       .replace(/&nbsp;/g, ' ')
       .replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>')
       .replace(/&quot;/g, '"')
       .replace(/&#39;/g, "'")
       .replace(/&eacute;/g, 'é')
       .replace(/&egrave;/g, 'è')
       .replace(/&ecirc;/g, 'ê')
       .replace(/&euml;/g, 'ë')
       .replace(/&agrave;/g, 'à')
       .replace(/&acirc;/g, 'â')
       .replace(/&ccedil;/g, 'ç')
       .replace(/&ugrave;/g, 'ù')
       .replace(/&ocirc;/g, 'ô')
       .replace(/&icirc;/g, 'î')
       .replace(/&iuml;/g, 'ï');
  // 2. Espaces insécables avant la ponctuation haute
  t = t.replace(/(\s)?([:;!?])(\s)/g, ' $2 ');
  t = t.replace(/(\s)?([:;!?])(?=[\s<])/g, ' $2');
  // 3. Supprimer les espaces multiples
  t = t.replace(/  +/g, ' ');
  // 4. Espace après la ponctuation (pas avant)
  t = t.replace(/([.,])([^\s\d<])/g, '$1 $2');
  // 5. Guillemets français
  t = t.replace(/"([^"]*)"/g, '« $1 »');
  // 6. Apostrophes correctes
  t = t.replace(/(\w)'(\w)/g, "$1'$2");
  // 7. Capitales accentuées (mots courants)
  const accents = [
    ['A ', 'À '], ['E ', 'É '], ['E,', 'É,'], ['E.', 'É.'],
    ['A,', 'À,'], ['A.', 'À.'],
    ['Et ', 'Et '],  // "Et" en début de phrase → "Et"
  ];
  for (const [from, to] of accents) {
    // On ne touche pas aux balises HTML
    t = t.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
  }
  return t.trim();
}

function sanitizeText(text) {
  return String(text || '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email supprimé]')
    .replace(/(?:\+33|0)[1-9](?:[\s.-]?\d{2}){4}/g, '[téléphone supprimé]')
    .trim();
}

/**
 * deduplicateDescription — Supprime le contenu dupliqué des plateformes sources
 * dans les descriptions d'événements :
 *  - URLs pointant vers openagenda.com, mobilizon.fr, et les domaines sources
 *  - Mentions "BILLETTERIE", "Réservez vos billets", "Retrouvez cet événement sur"
 *    et autres appels à l'action des plateformes (billetterie, réservation)
 *  - Copyrights (©, (c)) et marques déposées (®, ™)
 */
function deduplicateDescription(text, sourceId) {
  if (!text) return '';
  let t = String(text);

  // 1. Supprimer les markdown links pointant vers les plateformes sources
  //    [text](https://openagenda. com/...) — supprime tout le lien (texte + URL)
  t = t.replace(/\[([^\]]*)\]\((https?:\/\/[^)]*?(?:openagenda|mobilizon)[^)]*)\)/gi, '');
  //    URLs nues avec espace avant le point (ex: "https://openagenda. com/fr/...")
  t = t.replace(/https?:\/\/\S*?openagenda\s*\.?\s*com\S*/gi, '');
  t = t.replace(/https?:\/\/\S*?mobilizon\.fr\S*/gi, '');
  //    Références nues aux domaines (ex: "openagenda. com/fr/...")
  t = t.replace(/openagenda\s*\.\s*com\S*/gi, '');
  t = t.replace(/mobilizon\.fr\S*/gi, '');
  //    Nettoyer les parenthèses vides et crochets vides laissés par les suppressions
  t = t.replace(/\(\)/g, '');
  t = t.replace(/\[\]/g, '');
  t = t.replace(/\(\s*\)/g, '');

  // 2. Supprimer les appels à l'action des plateformes
  t = t.replace(/\[{1,3}\**\s*BILLETTERIE\s*\**\]{1,3}\([^)]*\)/gi, '');
  t = t.replace(/\*{0,3}BILLETTERIE\*{0,3}/gi, '');
  t = t.replace(/R[ée]servez\s+(vos|votre)\s+(billets?|place|entr[ée]e|pass)\s*/gi, '');
  t = t.replace(/Retrouvez\s+(cet\s+)?(l['\u2019])?[ée]v[ée]nements?\s+sur\s+/gi, '');
  t = t.replace(/Pour\s+plus\s+d['\u2019]informations\s*:?\s*https?:\/\/[^\s)]+/gi, '');
  t = t.replace(/En\s+savoir\s+plus\s*:?\s*https?:\/\/[^\s)]+/gi, '');
  t = t.replace(/https?:\/\/[^\s)]+[^.]*?Cliquez\s+ici/gi, '');
  t = t.replace(/Cliquez\s+ici[^.]*?https?:\/\/[^\s)]+/gi, '');

  // 3. Supprimer les copyrights et marques déposées
  t = t.replace(/\([cC]\)\s*/g, '');
  t = t.replace(/\s*©\s*[A-Za-z\u00C0-\u024F]+(?:\s+[A-Za-z\u00C0-\u024F]+){0,1}/g, '');
  t = t.replace(/\s*©/g, '');
  t = t.replace(/Cr[ée]dit\s+(photo|illustration)\s*/gi, '');
  t = t.replace(/®/g, '');
  t = t.replace(/™/g, '');

  // 4. Nettoyer les séparateurs, balises ###, espaces et résidus
  t = t.replace(/\s+/g, ' ').trim();
  t = t.replace(/\s*###\s*/g, ' ');
  t = t.replace(/_{3,}/g, '');
  t = t.replace(/---+/g, '');
  // Nettoyer les espaces avant la ponctuation
  t = t.replace(/\s+,/g, ',');
  t = t.replace(/\s+\./g, '.');
  t = t.replace(/\s+;/g, ';');
  t = t.replace(/\s+:/g, ':');
  t = t.replace(/\s+/g, ' ').trim();

  return t;
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

  const desc = correctText(sanitizeText(cleanHtml(getLocalized(item, 'description') || item.description_fr || '')));
  const rawLongDesc = typeof item.longdescription_fr === 'string' ? item.longdescription_fr
    : (item.longDescription && typeof item.longDescription === 'object'
      ? (item.longDescription.fr || item.longDescription.en || '') : '');
  // Keep structural HTML tags, remove dangerous ones + sanitize PII
  let safeLongDesc = rawLongDesc
    .replace(/<!--[\s\S]*?-->/g, '')                              // Remove HTML comments
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')           // Remove script + content
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')             // Remove style + content
    .replace(/<\/?(?:iframe|object|embed|form|input)\b[^>]*>/gi, ''); // Remove dangerous tags (keep content)
  safeLongDesc = safeLongDesc.replace(/\s+/g, ' ').trim();
  const longDesc = correctText(sanitizeText(safeLongDesc));

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

/**
 * Parser Mobilizon — API GraphQL publique (mobilizon.fr)
 * title→titre, beginsOn→dateDebut, endsOn→dateFin,
 * physicalAddress{locality,postalCode,region,country,geom}→lieu,
 * tags[].title→motsCles, category→categorie, picture.url→image
 * Seuls les événements en France sont conservés (physicalAddress.country === 'France')
 */
const DEPT_NAME_TO_CODE = {
  'ain': '01', 'aisne': '02', 'allier': '03', 'alpes-de-haute-provence': '04', 'hautes-alpes': '05',
  'alpes-maritimes': '06', 'ardèche': '07', 'ardeche': '07', 'ardennes': '08', 'ariège': '09', 'ariege': '09',
  'aube': '10', 'aude': '11', 'aveyron': '12', 'bouches-du-rhône': '13', 'bouches-du-rhone': '13',
  'calvados': '14', 'cantal': '15', 'charente': '16', 'charente-maritime': '17', 'cher': '18',
  'corrèze': '19', 'correze': '19', 'corse-du-sud': '2a', 'haute-corse': '2b', 'côte-d\'or': '21',
  'cote-d\'or': '21', 'côtes-d\'armor': '22', 'cotes-d\'armor': '22', 'creuse': '23', 'dordogne': '24',
  'doubs': '25', 'drôme': '26', 'drome': '26', 'eure': '27', 'eure-et-loir': '28', 'finistère': '29',
  'finistere': '29', 'gard': '30', 'haute-garonne': '31', 'gers': '32', 'gironde': '33', 'hérault': '34',
  'herault': '34', 'ille-et-vilaine': '35', 'indre': '36', 'indre-et-loire': '37', 'isère': '38',
  'isere': '38', 'jura': '39', 'landes': '40', 'loir-et-cher': '41', 'loire': '42', 'haute-loire': '43',
  'loire-atlantique': '44', 'loiret': '45', 'lot': '46', 'lot-et-garonne': '47', 'lozère': '48',
  'lozere': '48', 'maine-et-loire': '49', 'manche': '50', 'marne': '51', 'haute-marne': '52',
  'mayenne': '53', 'meurthe-et-moselle': '54', 'meuse': '55', 'morbihan': '56', 'moselle': '57',
  'nièvre': '58', 'nievre': '58', 'nord': '59', 'oise': '60', 'orne': '61', 'pas-de-calais': '62',
  'puy-de-dôme': '63', 'puy-de-dome': '63', 'pyrénées-atlantiques': '64', 'pyrenees-atlantiques': '64',
  'hautes-pyrénées': '65', 'hautes-pyrenees': '65', 'pyrénées-orientales': '66', 'pyrenees-orientales': '66',
  'bas-rhin': '67', 'haut-rhin': '68', 'rhône': '69', 'rhone': '69', 'haute-saône': '70',
  'haute-saone': '70', 'saône-et-loire': '71', 'saone-et-loire': '71', 'sarthe': '72', 'savoie': '73',
  'haute-savoie': '74', 'paris': '75', 'seine-maritime': '76', 'seine-et-marne': '77', 'yvelines': '78',
  'deux-sèvres': '79', 'deux-sevres': '79', 'somme': '80', 'tarn': '81', 'tarn-et-garonne': '82',
  'var': '83', 'vaucluse': '84', 'vendée': '85', 'vendee': '85', 'vienne': '86', 'haute-vienne': '87',
  'vosges': '88', 'yonne': '89', 'territoire de belfort': '90', 'essonne': '91', 'hauts-de-seine': '92',
  'seine-saint-denis': '93', 'val-de-marne': '94', 'val-d\'oise': '95',
};

const DEPT_CODE_TO_NAME = Object.fromEntries(
  Object.entries(DEPT_NAME_TO_CODE).map(([name, code]) => [code, name])
);

function getDeptCodeFromName(name) {
  if (!name) return '';
  let n = String(name).toLowerCase().trim();
  // Gère les préfixes "Département de/du/des"
  n = n.replace(/^d[ée]partement (de la |du |des |de )?/, '').trim();
  // Gère "Métropole de Lyon" → 69
  if (n === 'métropole de lyon' || n === 'metropole de lyon') return '69';
  // Gère "Collectivité européenne d'Alsace" → 67 (Bas-Rhin, siège Strasbourg)
  if (n.includes('alsace')) return '67';
  return DEPT_NAME_TO_CODE[n] || '';
}

function normalizeMobilizon(item, sourceId) {
  const titre = item.title || '';
  if (!titre) return null;
  const addr = item.physicalAddress || {};
  // On ne garde que les événements géolocalisés en France
  const country = (addr.country || '').toLowerCase();
  if (country && country !== 'france') return null;
  if (!country && !addr.locality && !addr.region) return null;

  const desc = sanitizeText(cleanHtml(item.description || ''));
  // geom Mobilizon : "lon;lat"
  let lat = 0, lon = 0;
  if (typeof addr.geom === 'string' && addr.geom.includes(';')) {
    const [gLon, gLat] = addr.geom.split(';').map(v => parseFloat(v.trim()));
    lon = gLon || 0;
    lat = gLat || 0;
  }
  const deptCode = getDeptCodeFromName(addr.region || addr.locality || '');
  const keywords = Array.isArray(item.tags) ? item.tags.map(t => t.title).filter(Boolean) : [];
  const gratuit = /gratuit|libre|gratis/i.test(desc + ' ' + keywords.join(' '));
  const categoryMap = {
    MUSIC: 'concert', THEATRE: 'theatre', PERFORMING_VISUAL_ARTS: 'exposition',
    SPORTS: 'sport', OUTDOORS_ADVENTURE: 'marche', FAMILY_EDUCATION: 'enfants',
    FOOD_DRINK: 'foire', BOOK_CLUBS: 'lecture', LEARNING: 'atelier',
    SCIENCE_TECH: 'conference', COMMUNITY: 'spectacle', PARTY: 'spectacle',
    MEETING: 'conference', CRAFTS: 'atelier', PHOTOGRAPHY: 'exposition',
  };
  const categorie = categoryMap[item.category] || classifyCategory(titre, desc, keywords);

  return {
    uid: `mob-${item.uuid || item.id || Math.random().toString(36).substring(2, 10)}`,
    source: sourceId,
    sourceUrl: item.url || '',
    licence: 'agpl-3.0',
    titre,
    descriptionCourte: desc.substring(0, 300),
    descriptionLongue: desc.substring(0, 2000),
    dateDebut: item.beginsOn || '',
    dateFin: item.endsOn || item.beginsOn || '',
    categorie,
    motsCles: keywords.slice(0, 10),
    gratuit,
    prixIndicatif: '',
    lieuNom: addr.description || addr.locality || '',
    lieuAdresse: '',
    lieuCodePostal: String(addr.postalCode || ''),
    lieuCommune: addr.locality || '',
    lieuCodeInsee: '',
    lieuLatitude: lat,
    lieuLongitude: lon,
    coordinates: lat ? `${lat},${lon}` : '',
    lieuDepartement: deptCode,
    lieuRegion: addr.region || '',
    dateMaj: item.updatedAt || new Date().toISOString(),
    statut: 'programme',
    modeAcces: 'sur_place',
    slug: slugify(`${titre}-${item.id || ''}`).substring(0, 80),
    departementNumero: deptCode,
    image: item.picture?.url || '',
  };
}

// ──── SEO/GEO Description Generator ────

const MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const DAYS_FR = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];

/**
 * Synonymes par catégorie pour la variation SEO
 */
const CATEGORY_SYNONYMS = {
  concert: ['concert', 'représentation musicale', 'soirée musicale', 'performance live', 'show'],
  theatre: ['spectacle vivant', 'pièce de théâtre', 'représentation', 'comédie', 'drame'],
  exposition: ['exposition', 'parcours artistique', 'galerie', 'présentation', 'rétrospective'],
  spectacle: ['spectacle', 'show', 'représentation', 'divertissement', 'animation scénique'],
  festival: ['festival', 'rencontre culturelle', 'programmation artistique', 'rendez-vous'],
  cinema: ['séance de cinéma', 'projection', 'film', 'avant-première', 'diffusion'],
  danse: ['spectacle de danse', 'représentation chorégraphique', 'ballet', 'show'],
  cirque: [' spectacle de cirque',  'numéro de cirque',  'performance circassienne'],
  lecture: ['rencontre littéraire', 'lecture publique', 'rendez-vous du livre', 'moment littéraire'],
  conference: ['conférence', 'rencontre-débat', 'table ronde', 'colloque', 'échange'],
  atelier: ['atelier', 'stage pratique', 'initiation', 'activité créative', 'moment d\'apprentissage'],
  marche: ['marché', 'foire', 'brocante', 'vide-grenier', 'rendez-vous commerçant'],
  foire: ['foire', 'salon', 'grand rendez-vous', 'fête foraine', 'manifestation'],
  sport: ['événement sportif', 'compétition', 'rencontre sportive', 'rendez-vous du sport'],
  enfants: ['activité pour enfants', 'animation familiale', 'rendez-vous jeune public', 'loisir créatif'],
};

/** Accroches SEO par catégorie (phrases d'ouverture variées — neutres, factuelles) */
const SEO_HOOKS = {
  concert: [
    'Un concert est programmé à l\'agenda culturel',
    'Un rendez-vous musical est proposé',
    'La programmation musicale locale s\'enrichit de cet événement',
  ],
  theatre: [
    'Une pièce de théâtre est à l\'affiche',
    'Le théâtre s\'invite à la programmation culturelle',
    'Un spectacle vivant est proposé au public',
  ],
  exposition: [
    'Une exposition est à découvrir',
    'Un parcours artistique est présenté',
    'Les œuvres sont mises à l\'honneur dans cette exposition',
  ],
  spectacle: [
    'Un spectacle est programmé',
    'La scène accueille une nouvelle représentation',
    'Un rendez-vous du spectacle vivant est proposé',
  ],
  festival: [
    'Un festival est organisé',
    'La programmation du festival est dévoilée',
    'Un rendez-vous culturel rassemble artistes et public',
  ],
  cinema: [
    'Une séance de cinéma est programmée',
    'Une projection est proposée au public',
    'Le cinéma s\'invite à la programmation',
  ],
  danse: [
    'Un spectacle de danse est présenté',
    'La danse est à l\'honneur dans cette représentation',
    'Une chorégraphie est proposée au public',
  ],
  cirque: [
    'Un spectacle de cirque est au programme',
    'Les arts du cirque sont à l\'honneur',
    'Une représentation circassienne est proposée',
  ],
  lecture: [
    'Un rendez-vous littéraire est organisé',
    'Une lecture publique est proposée',
    'Les mots sont à l\'honneur dans cette rencontre',
  ],
  conference: [
    'Une conférence est organisée',
    'Un temps d\'échange et de réflexion est proposé',
    'Une rencontre-débat est au programme',
  ],
  atelier: [
    'Un atelier est proposé aux participants',
    'Une activité pratique est organisée',
    'Un moment d\'apprentissage et de création est proposé',
  ],
  marche: [
    'Un marché est organisé',
    'Les commerçants et exposants vous accueillent',
    'Un rendez-vous commerçant est au programme',
  ],
  foire: [
    'Une foire est organisée',
    'Un salon rassemble exposants et visiteurs',
    'Une manifestation commerciale et festive est proposée',
  ],
  sport: [
    'Un événement sportif est organisé',
    'Une rencontre sportive est au programme',
    'La compétition rassemble les participants',
  ],
  enfants: [
    'Une activité pour enfants est proposée',
    'Un rendez-vous jeune public est organisé',
    'Une animation familiale est au programme',
  ],
};

const DEFAULT_SYNONYMS = ['événement', 'rendez-vous', 'animation', 'manifestation', 'sortie'];

function countWords(text) {
  return (text || '').split(/\s+/).filter(Boolean).length;
}

function formatFrenchDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dayName = DAYS_FR[d.getDay()];
  const dayNum = d.getDate();
  const month = MONTHS_FR[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName} ${dayNum} ${month} ${year}`;
}

function formatFrenchTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}h${m}`;
}

function pickRandom(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

function getCategorySynonym(categorie, avoid) {
  const syns = CATEGORY_SYNONYMS[categorie] || DEFAULT_SYNONYMS;
  const normalizedAvoid = avoid ? avoid.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
  const filtered = syns.filter(s => {
    const normalizedS = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return normalizedS !== normalizedAvoid;
  });
  if (filtered.length === 0) return syns[0] || 'événement';
  return pickRandom(filtered);
}

/** Mots féminins nécessitant "une" au lieu de "un" */
const FEMININE_SYNONYMS = new Set([
  'représentation musicale', 'soirée musicale', 'performance live',
  'représentation', 'comédie',
  'galerie', 'présentation', 'rétrospective',
  'rencontre culturelle', 'programmation artistique',
  'séance de cinéma', 'projection', 'avant-première', 'diffusion',
  'rencontre littéraire', 'lecture publique',
  'rencontre-débat', 'table ronde',
  'activité créative', 'initiation',
  'foire', 'brocante', 'fête foraine', 'manifestation',
  'rencontre sportive',
  'activité pour enfants', 'animation familiale', 'animation scénique',
  'compétition', 'performance circassienne',
  'conférence', 'chorale', 'danse',
  'rencontre', 'exposition',
]);

function getArticle(word) {
  if (!word) return 'un ';
  const w = word.trim().toLowerCase();
  if (FEMININE_SYNONYMS.has(w)) return 'une ';
  return 'un ';
}

function getHook(categorie) {
  const hooks = SEO_HOOKS[categorie];
  if (!hooks || hooks.length === 0) return 'Découvrez cet événement';
  return pickRandom(hooks);
}

/**
 * Remplace descriptionLongue par une description SEO/GEO générée à partir
 * des données structurées de l'événement (sans copier la description originale).
 *
 * @param {Object} eventData - Données normalisées de l'événement
 * @returns {string} Texte HTML structuré (800+ caractères, ~150 mots minimum)
 */
function generateSEODescription(eventData) {
  const {
    titre = '',
    dateDebut = '',
    dateFin = '',
    lieuCommune = '',
    lieuNom = '',
    categorie = 'spectacle',
    source = '',
    descriptionLongue: originalDesc = '',
    descriptionCourte: shortDesc = '',
    gratuit = false,
    prixIndicatif = '',
    lieuDepartement = '',
    departementNumero = '',
  } = eventData;

  if (!titre) return '';

  const ville = lieuCommune || 'la région';
  const lieu = lieuNom || ville;
  const dateDebutFmt = formatFrenchDate(dateDebut);
  const dateFinFmt = dateFin && dateFin !== dateDebut ? formatFrenchDate(dateFin) : null;
  const timeDebut = formatFrenchTime(dateDebut);
  const timeFin = dateFin && dateFin !== dateDebut ? formatFrenchTime(dateFin) : null;
  const isFree = gratuit === true || gratuit === 'true' || gratuit === 'oui';
  const syn = getCategorySynonym(categorie, categorie);
  const hook = getHook(categorie);

  // Construire les parties
  const parts = [];

  // 1️⃣ PHRASE D'ACCROCHE + INTRODUCTION
  parts.push(`<p><strong>${hook} à ${ville}.</strong> ${titre} est ${getArticle(syn)}` +
    `${syn} figurant au programme de l'agenda culturel de ${ville}${ville !== 'la région' ? ' et ses environs' : ''}.`);

  // Ajouter la date dans l'intro
  if (dateDebutFmt) {
    if (dateFinFmt && dateFinFmt !== dateDebutFmt) {
      parts[0] += ` Cet événement se déroule du ${dateDebutFmt} au ${dateFinFmt}.`;
    } else {
      parts[0] += ` Il a lieu le ${dateDebutFmt}.`;
    }
  }
  parts[0] += '</p>';

  // 2️⃣ CONTEXTE SEO (2-3 phrases utilisant catégorie, ville, département, titre)
  const contextHtml = generateSEODescriptionContexte(categorie, ville, titre, lieuDepartement);
  if (contextHtml) {
    parts.push(contextHtml);
  }

  // 3️⃣ SECTION « À PROPOS »
  // Préférer descriptionLongue si riche, sinon descriptionCourte comme matière première
  const richDesc = countWords(originalDesc) >= 50 ? originalDesc
    : countWords(shortDesc) >= 30 ? shortDesc
    : '';

  if (richDesc) {
    // Réécrire la description originale : changer l'ordre, reformuler, ne pas copier
    const rewritten = rewriteDescription(richDesc, titre, ville, categorie);
    parts.push(`<h3>À propos de ${titre}</h3>`);
    parts.push(`<p>${rewritten}</p>`);
  } else {
    // Les deux descriptions sont trop pauvres → générer une description riche
    const generated = generateRichFallbackDescription(titre, categorie, ville, lieu, dateDebutFmt);
    parts.push(`<h3>À propos de cet événement</h3>`);
    parts.push(`<p>${generated}</p>`);
  }

  // 4️⃣ PARAGRAPHE SPÉCIFIQUE À LA CATÉGORIE
  // Enfants/jeune public → activités familiales ; Concert/spectacle → genre musical
  const catPara = generateCategoryParagraph(categorie, titre, ville);
  if (catPara) {
    parts.push(catPara);
  }

  // 5️⃣ INFORMATIONS PRATIQUES
  parts.push('<h3>Informations pratiques</h3>');
  parts.push('<ul>');

  // Date et horaire
  if (dateDebutFmt) {
    if (dateFinFmt && dateFinFmt !== dateDebutFmt) {
      const dateInfo = `Du ${dateDebutFmt}` + (timeDebut ? ` à ${timeDebut}` : '') +
        ` au ${dateFinFmt}` + (timeFin ? ` à ${timeFin}` : '');
      parts.push(`<li><strong>Dates :</strong> ${dateInfo}</li>`);
    } else {
      const dateInfo = dateDebutFmt + (timeDebut ? ` à ${timeDebut}` : '') +
        (timeFin ? ` — ${timeFin}` : '');
      parts.push(`<li><strong>Date :</strong> ${dateInfo}</li>`);
    }
  }

  // Lieu
  const lieuParts = [];
  if (lieuNom) lieuParts.push(lieuNom);
  if (lieuCommune) lieuParts.push(lieuCommune);
  if (lieuParts.length > 0) {
    parts.push(`<li><strong>Lieu :</strong> ${lieuParts.join(', ')}</li>`);
  }

  // Département
  const deptCode = departementNumero || lieuDepartement || '';
  const deptName = deptCode && DEPT_CODE_TO_NAME[deptCode] ? DEPT_CODE_TO_NAME[deptCode] : '';
  if (deptName) {
    parts.push(`<li><strong>Département :</strong> ${deptName.charAt(0).toUpperCase() + deptName.slice(1)}</li>`);
  }

  // Catégorie
  parts.push(`<li><strong>Catégorie :</strong> ${categorie.charAt(0).toUpperCase() + categorie.slice(1)}</li>`);

  // Tarif
  if (isFree) {
    parts.push('<li><strong>Tarif :</strong> Gratuit — entrée libre</li>');
  } else if (prixIndicatif) {
    let prixClean = String(prixIndicatif)
      .replace(/<[^>]+>/g, '')
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '')
      .replace(/(?:\+33|0)[1-9](?:[\s.-]?\d{2}){4}/g, '')
      .replace(/https?:\/\/[^\s,;]+/g, '')
      .replace(/billetterie[^,;]*/gi, '')
      .replace(/ticketmaster[^,;]*/gi, '')
      .replace(/fnac[^,;]*/gi, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\\s+/g, ' ')
      .trim()
      .substring(0, 150);
    if (prixClean) {
      parts.push('<li><strong>Tarif :</strong> ' + prixClean + '</li>');
    } else {
      parts.push('<li><strong>Tarif :</strong> Consultez l\'organisateur pour les conditions tarifaires</li>');
    }
  } else {
    parts.push('<li><strong>Tarif :</strong> Consultez l\'organisateur pour les conditions tarifaires</li>');
  }

  // Accès
  if (ville) {
    parts.push(`<li><strong>Accès :</strong> Cet événement se déroule à ${lieuParts.length > 0 ? lieuParts.join(', ') : ville}. Vérifiez les modalités d'accès et de stationnement à proximité.</li>`);
  }

  parts.push('</ul>');

  // 6️⃣ ASSURER LA LONGUEUR MINIMALE (800 caractères / ~150 mots)
  let result = parts.join('\n');

  // Boucle de padding : tant qu'on est sous 150 mots, ajouter des paragraphes
  let safety = 0;
  while (countWords(result) < 150 && safety < 5) {
    const extraPara = generateExtraParagraph(categorie, ville);
    result = result + '\n' + extraPara;
    safety++;
  }

  // Fallback ultime si toujours sous 800 caractères
  if (result.length < 800 && countWords(result) < 150) {
    result += '\n<p>' + `${titre} est un événement à ne pas manquer organisé à ${ville}. Il s'adresse à tous les publics dans le cadre de la programmation culturelle locale.` + '</p>';
  }

  // Tronquer si dépasse (max 300 mots ≈ ~2000 caractères)
  const finalWords = countWords(result);
  if (finalWords > 350) {
    // Tronquer le dernier paragraphe (hors <ul>) pour rester autour de 300 mots
    const paragraphs = result.split('\n');
    let trimmed = [];
    let wc = 0;
    for (const p of paragraphs) {
      const pw = countWords(p);
      if (wc + pw > 320) break;
      trimmed.push(p);
      wc += pw;
    }
    result = trimmed.join('\n');
  }

  return result;
}

/**
 * Réécrit une description originale avec des formulations différentes :
 * change l'ordre, reformule, ne copie pas les phrases telles quelles.
 */
function rewriteDescription(original, titre, ville, categorie) {
  // Extraire les phrases
  let text = original
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Découper en phrases
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  if (sentences.length <= 2) {
    // Trop peu de phrases → reformuler différemment
    return `Cet événement, organisé à ${ville}, s'inscrit dans la programmation autour de ${titre}. ` +
      `Un rendez-vous à noter pour les personnes intéressées par cette thématique. ` +
      `L'organisation met tout en œuvre pour offrir un moment de qualité aux participants.`;
  }

  // Changer l'ordre (dernière phrase en premier, etc.)
  const reordered = [];
  if (sentences.length >= 3) {
    // Commencer par une phrase du milieu
    const midIdx = Math.floor(sentences.length / 2);
    reordered.push(sentences[midIdx]);
    // Ajouter la première phrase reformulée
    reordered.push(sentences[0]);
    // Ajouter les autres (sauf la dernière qu'on garde pour la fin)
    for (let i = 1; i < sentences.length; i++) {
      if (i !== midIdx && i !== 0 && i !== sentences.length - 1) {
        reordered.push(sentences[i]);
      }
    }
    if (sentences.length - 1 !== midIdx) {
      reordered.push(sentences[sentences.length - 1]);
    }
  } else {
    reordered.push(...sentences.reverse());
  }

  // Reformuler les débuts de phrase
  const reformulated = reordered.map((s, idx) => {
    let clean = s.trim();
    if (!clean) return '';
    // Changer les starters par des synonymes
    const starters = {
      'le ': 'Ce ',
      'la ': 'Cette ',
      'les ': 'Ces ',
      'cet': 'Ce',
      'cette': 'Cette',
      'ces': 'Ces',
      'vous': 'Les participants',
      'on ': 'L\'on ',
      'il y aura': 'Au programme',
      'au programme': 'Parmi les temps forts',
      'découvrez': 'Explorez',
      'venez': 'Rendez-vous',
      'retrouvez': 'Profitez',
      'assistez': 'Prenez part',
    };
    for (const [from, to] of Object.entries(starters)) {
      if (clean.toLowerCase().startsWith(from)) {
        clean = to + clean.substring(from.length);
        break;
      }
    }
    return clean;
  }).filter(Boolean);

  // Assembler avec des connecteurs variés
  const connectors = [
    ' ', ' ', ' ',
    ' Par ailleurs, ',
    ' De plus, ',
    ' En outre, ',
    ' Également, ',
    ' À noter : ',
    ' Pour information, ',
  ];
  let result = reformulated[0] || '';
  for (let i = 1; i < reformulated.length; i++) {
    const conn = pickRandom(connectors);
    result += conn + reformulated[i].toLowerCase().replace(/^(.)/, c => c.toUpperCase());
  }

  // Nettoyer les espaces
  result = result.replace(/\s+/g, ' ').trim();

  // Si le résultat ressemble trop à l'original, recommencer
  const simplified = text.replace(/[^a-z0-9\u00C0-\u024F ]/gi, '').toLowerCase().substring(0, 100);
  const resultSimplified = result.replace(/[^a-z0-9\u00C0-\u024F ]/gi, '').toLowerCase().substring(0, 100);
  if (simplified === resultSimplified && sentences.length > 2) {
    // Fallback : générer à partir des mots-clés seulement
    return generateRichFallbackDescription(titre, categorie, ville, '', '');
  }

  return result;
}

/**
 * Génère une description de substitution enrichie quand la description originale
 * est trop pauvre (< 50 mots). Utilise toutes les phrases générées pour garantir
 * une longueur suffisante.
 */
function generateRichFallbackDescription(titre, categorie, ville, lieu, date) {
  const syn = getCategorySynonym(categorie, categorie);
  const syn2 = getCategorySynonym(categorie, syn);
  const article = getArticle(syn).trim();
  const ceCette = FEMININE_SYNONYMS.has(syn) ? 'Cette' : 'Ce';
  const phrases = [
    `${ceCette} ${syn} intitulé${ceCette === 'Cette' ? 'e' : ''} « ${titre} » est proposé${ceCette === 'Cette' ? 'e' : ''} ${ville !== 'la région' ? 'dans la ville de ' + ville : 'dans la région'}.`,
    `${titre} s'inscrit dans la programmation culturelle locale et promet un moment de qualité aux visiteurs et aux habitants.`,
    `Organisé${ceCette === 'Cette' ? 'e' : ''} ${lieu ? 'au ' + lieu : 'dans un cadre adapté'}${ville !== 'la région' ? ' à ' + ville : ''}, ${ceCette.toLowerCase()} activité est accessible à tous les publics.`,
    `Que vous soyez passionné ou simple curieux, ${titre} est une occasion unique de découvrir ou redécouvrir l'univers du ${syn} dans des conditions privilégiées.`,
    `${ceCette} ${syn} s'annonce comme un temps fort de l'agenda culturel ${ville !== 'la région' ? 'de ' + ville : 'local'}, à ne surtout pas manquer.`,
    `${ville !== 'la région' ? 'La ville de ' + ville : 'La région'} propose une programmation riche et variée tout au long de l'année. ${titre} contribue à cette offre culturelle dynamique.`,
  ];

  // Utiliser TOUTES les phrases pour garantir une description riche
  return phrases.join(' ');
}

/**
 * Paragraphe de contexte SEO généré à partir de la catégorie, la ville,
 * le titre et le département. Ajoute 2-3 phrases de contexte après l'intro.
 */
function generateSEODescriptionContexte(categorie, ville, titre, departement) {
  const syn = getCategorySynonym(categorie, categorie);
  const ceCette = FEMININE_SYNONYMS.has(syn) ? 'Cette' : 'Ce';
  const deptCode = departement || '';
  const deptName = deptCode && DEPT_CODE_TO_NAME[deptCode] ? DEPT_CODE_TO_NAME[deptCode] : '';
  const deptPhrase = deptName ? ` dans le ${deptName.charAt(0).toUpperCase() + deptName.slice(1)}` : '';

  const contexts = [
    `<p>La ville de ${ville}${deptPhrase} propose une programmation culturelle riche et variée tout au long de l'année. ${ceCette} ${syn} s'inscrit dans cette offre et s'adresse à un large public désireux de découvrir de nouveaux horizons culturels.</p>`,
    `<p>L'agenda des sorties à ${ville}${deptPhrase} regorge de propositions pour tous les goûts et tous les âges. ${titre} fait partie de cette dynamique et contribue au rayonnement culturel de la région.</p>`,
    `<p>Que vous soyez résident ou visiteur de passage, ${ville}${deptPhrase} vous invite à découvrir ses talents et ses événements culturels. ${titre} est une excellente occasion de plonger au coeur de la scène ${syn} locale.</p>`,
    `<p>${ville}${deptPhrase} ne cesse d'enrichir son offre culturelle avec des événements variés. ${ceCette} ${syn} témoigne du dynamisme artistique de la commune et de l'engagement des acteurs locaux pour proposer des animations de qualité.</p>`,
  ];
  return `<p>${pickRandom(contexts)}</p>`;
}

/**
 * Paragraphe spécifique à la catégorie de l'événement.
 * - Enfants / jeune public : ajoute un paragraphe sur les activités familiales
 * - Concert / musique : ajoute un paragraphe sur le genre musical
 * - Spectacle : ajoute un paragraphe sur le genre de spectacle
 */
function generateCategoryParagraph(categorie, titre, ville) {
  const cat = categorie ? categorie.toLowerCase() : '';

  // Enfants / jeune public → activités familiales
  if (cat === 'enfants') {
    const familyParagraphs = [
      `Cet événement à ${ville} est spécialement conçu pour les enfants et les familles. Les plus jeunes pourront profiter d'activités ludiques et éducatives dans un cadre adapté, tandis que les parents apprécieront un moment de partage et de découverte en famille. Ateliers créatifs, jeux et animations sont au programme pour émerveiller petits et grands.`,
      `Idéal pour une sortie en famille à ${ville}, cet événement propose des animations spécialement pensées pour le jeune public. Ateliers manuels, activités d'éveil et espaces de jeu rythmeront cette journée placée sous le signe de la créativité et du divertissement pour toute la famille.`,
      `Les familles trouveront à ${ville} une programmation adaptée aux enfants, avec des activités qui stimulent la curiosité et l'imagination. ${titre} promet un moment d'émerveillement partagé entre parents et enfants, dans un environnement sécurisé et accueillant.`,
    ];
    return `<p>${pickRandom(familyParagraphs)}</p>`;
  }

  // Concert → genre musical
  if (cat === 'concert') {
    const musicParagraphs = [
      `Ce concert s'inscrit dans la riche tradition musicale de ${ville} et de sa région. Les amateurs de musique apprécieront la qualité de la programmation, qui met en lumière des artistes talentueux dans des genres variés allant du classique au contemporain, du jazz à la chanson française. Une expérience sonore unique à vivre en direct.`,
      `La scène musicale de ${ville} continue de rayonner avec des concerts qui célèbrent la diversité des genres musicaux. ${titre} promet une performance live de grande qualité dans une ambiance conviviale, portée par des musiciens passionnés.`,
    ];
    return `<p>${pickRandom(musicParagraphs)}</p>`;
  }

  // Spectacle → genre de spectacle
  if (cat === 'spectacle') {
    const spectacleParagraphs = [
      `Les amateurs de spectacles vivants trouveront à ${ville} une programmation éclectique mêlant théâtre, danse, humour et arts de la scène. ${titre} s'annonce comme un moment fort de la saison culturelle, porté par des artistes passionnés qui sauront captiver le public.`,
      `Le spectacle vivant à ${ville} rassemble des artistes de tous horizons pour offrir des représentations variées et accessibles à tous. ${titre} est l'occasion de vivre une expérience scénique unique dans un cadre chaleureux et intimiste.`,
    ];
    return `<p>${pickRandom(spectacleParagraphs)}</p>`;
  }

  return '';
}

/**
 * Paragraphe supplémentaire si le texte reste trop court.
 */
function generateExtraParagraph(categorie, ville) {
  const syn = getCategorySynonym(categorie, categorie);
  const ceCette = FEMININE_SYNONYMS.has(syn) ? 'Cette' : 'Ce';
  const extras = [
    `Pour ne rien manquer de l'actualité culturelle de ${ville}, consultez régulièrement l'agenda des sorties et découvrez l'ensemble des ${syn}s programmés près de chez vous.`,
    `Que vous soyez amateur ou connaisseur, ${ceCette.toLowerCase()} ${syn} est une occasion de profiter de l'offre culturelle de ${ville} et de ses alentours.`,
  ];
  return `<p>${pickRandom(extras)}</p>`;
}

const PARSERS = {
  openagenda: normalizeOpenAgenda,
  csv: normalizeCSV,
  paris: normalizeParis,
  nantes: normalizeNantes,
  tours: normalizeTours,
  mobilizon: normalizeMobilizon,
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
    // === NOUVELLES SOURCES OpenAgenda (extension départementale) ===
    { id: 'jep-centre-val-de-loire', file: 'jep-centre-val-de-loire.json', parser: 'openagenda' },
    { id: 'jnarchi-bourgogne-franche-comte', file: 'jnarchi-bourgogne-franche-comte.json', parser: 'openagenda' },
    { id: 'jardins-ouverts-2026', file: 'jardins-ouverts-2026.json', parser: 'openagenda' },
    { id: 'criquiers-evenements', file: 'criquiers-evenements.json', parser: 'openagenda' },
    { id: 'jep-bretagne', file: 'jep-bretagne.json', parser: 'openagenda' },
    { id: 'jep-normandie', file: 'jep-normandie.json', parser: 'openagenda' },
    { id: 'jep-hauts-de-france', file: 'jep-hauts-de-france.json', parser: 'openagenda' },
    { id: 'jep-corse', file: 'jep-corse.json', parser: 'openagenda' },
    { id: 'jep-grand-est', file: 'jep-grand-est.json', parser: 'openagenda' },
    { id: 'jep-bourgogne-franche-comte', file: 'jep-bourgogne-franche-comte.json', parser: 'openagenda' },
    { id: 'jep-pays-de-la-loire', file: 'jep-pays-de-la-loire.json', parser: 'openagenda' },
    { id: 'jep-auvergne-rhone-alpes', file: 'jep-auvergne-rhone-alpes.json', parser: 'openagenda' },
    { id: 'jep-paca', file: 'jep-paca.json', parser: 'openagenda' },
    { id: 'jep-nouvelle-aquitaine', file: 'jep-nouvelle-aquitaine.json', parser: 'openagenda' },
    { id: 'rouen-metropole-evenements', file: 'rouen-metropole-evenements.json', parser: 'openagenda' },
    { id: 'draguignan-evenements', file: 'draguignan-evenements.json', parser: 'openagenda' },
    { id: 'villeurbanne-agenda-culturel', file: 'villeurbanne-agenda-culturel.json', parser: 'openagenda' },
    // === MOBILIZON ===
    { id: 'mobilizon-france', file: 'mobilizon-france.json', parser: 'mobilizon' },
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
        .filter(e => !isTooOld(e.dateDebut))
        // Déduplication des descriptions : supprimer les contenus
        // dupliqués des plateformes (URLs, CTAs, copyrights)
        .map(e => {
          const cleanedCourte = deduplicateDescription(e.descriptionCourte, id);
          e.descriptionCourte = cleanedCourte;
          // NE PAS copier la description originale : générer une description SEO/GEO
          // à partir des données structurées de l'événement
          e.descriptionLongue = generateSEODescription({
            ...e,
            descriptionLongue: deduplicateDescription(e.descriptionLongue, id),
          });
          return e;
        });

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



export { generateSEODescription, generateSEODescriptionContexte, generateCategoryParagraph, generateRichFallbackDescription, countWords, DEPT_CODE_TO_NAME };