// Schémas de données unifiés pour SortirIci
// Zéro PII, zéro risque, full open data

/**
 * Schéma d'entrée OpenAgenda (source principale)
 */
export interface OpenAgendaEvent {
  uid: number;
  slug: string;
  canonicalUrl: string;
  title: { fr: string };
  description?: { fr: string };
  longDescription?: { fr: string };
  keywords?: { fr: string[] };
  image?: string;
  thumbnail?: string;
  updatedAt: string;
  daterange_fr?: string;
  firstDateBegin: string;
  firstDateEnd?: string;
  lastDateBegin?: string;
  lastDateEnd?: string;
  timings?: string;
  locationUid: number;
  locationCoordinates: { lon: number; lat: number };
  locationName: string;
  locationAddress: string;
  locationDistrict?: string;
  locationInsee: string;
  locationPostalCode: string;
  locationCity: string;
  locationDepartment: string;
  locationRegion: string;
  locationCountryCode: string;
  locationImage?: string;
  locationPhone?: string;
  locationWebsite?: string;
  locationLinks?: string;
  locationTags?: string;
  locationDescriptionFr?: string;
  locationAccessFr?: string;
  attendancemode?: string;
  onlineAccessLink?: string;
  status?: string;
  ageMin?: number;
  ageMax?: number;
  originAgendaTitle: string;
  originAgendaUid: number;
  // PII À SUPPRIMER :
  contributorEmail?: string;
  contributorContactNumber?: string;
  contributorContactName?: string;
  contributorContactPosition?: string;
}

/**
 * Schéma d'entrée Ministère Culture (CSV festivals)
 */
export interface MinistryFestival {
  id: string;
  nom: string;
  description: string;
  dateDebut: string;
  dateFin: string;
  lieu: string;
  adresse: string;
  codePostal: string;
  commune: string;
  departement: string;
  region: string;
  latitude: number;
  longitude: number;
  type: string;
  theme: string;
  publicVise: string;
  gratuit: boolean;
  siteWeb: string;
  email: string; // PII À SUPPRIMER
  telephone: string; // PII À SUPPRIMER
}

/**
 * Schéma d'entrée Portails Open Data locaux (Clermont, Guérande, etc.)
 */
export interface LocalOpenDataEvent {
  uid: string;
  titre: string;
  description: string;
  dateDebut: string;
  dateFin: string;
  lieu: string;
  adresse: string;
  codePostal: string;
  commune: string;
  codeInsee: string;
  latitude: number;
  longitude: number;
  categorie: string;
  motsCles: string[];
  organisateur: string; // PII potentiel - à anonymiser
  emailOrganisateur?: string; // PII À SUPPRIMER
  telephoneOrganisateur?: string; // PII À SUPPRIMER
  siteWeb: string;
  gratuit: boolean;
  sourceUrl: string;
  licence: string;
}

/**
 * SCHÉMA NORMALISÉ UNIFIÉ (SORTIE PIPELINE)
 * Zéro PII, faits purs uniquement
 */
export interface NormalizedEvent {
  // Identifiants
  uid: string;                    // UID source préfixé (ex: "oa-10244524", "mc-fest-123")
  source: string;                 // Slug source (ex: "openagenda-orleans", "ministere-culture")
  sourceUrl: string;              // URL canonique source
  licence: string;                // Licence source (lov2, fr-lo, odc-odbl)

  // Contenu événement
  titre: string;
  descriptionCourte: string;      // Max 300 chars, strip HTML
  dateDebut: string;              // ISO 8601
  dateFin: string;                // ISO 8601
  horaires?: string;              // Ex: "14:00-16:30"
  categorie: string;              // Une des 15 catégories fixes
  motsCles: string[];             // Mots-clés normalisés
  gratuit: boolean;
  prixIndicatif?: string;         // Ex: "5-15€" si dispo

  // Lieu
  lieuNom: string;
  lieuAdresse: string;
  lieuCodePostal: string;
  lieuCommune: string;
  lieuCodeInsee: string;
  lieuLatitude: number;
  lieuLongitude: number;
  lieuDepartement: string;
  lieuRegion: string;

  // Métadonnées
  dateMaj: string;                // ISO 8601 (updatedAt source)
  statut: 'programme' | 'annule' | 'reporte' | 'termine';
  modeAcces: 'sur_place' | 'en_ligne' | 'hybride';

  // Généré
  slug: string;                   // URL-friendly pour /evenement/[slug]/
  departementNumero: string;      // Ex: "45" pour index par département
}

/**
 * 15 CATÉGORIES FIXES (Taxonomie normalisée)
 */
export const CATEGORIES = [
  'concert', 'theatre', 'exposition', 'spectacle', 'festival',
  'cinema', 'danse', 'cirque', 'lecture', 'conference',
  'atelier', 'marche', 'foire', 'sport', 'enfants'
] as const;

export type Categorie = typeof CATEGORIES[number];

/**
 * Mapping mots-clés source → Catégorie fixe
 */
export const CATEGORY_MAPPING: Record<string, Categorie[]> = {
  'concert': ['concert', 'musique', 'live', 'show', 'spectacle musical'],
  'theatre': ['theatre', 'pièce', 'comedie', 'drame', 'scene'],
  'exposition': ['exposition', 'expo', 'vernissage', 'galerie', 'musee', 'art'],
  'spectacle': ['spectacle', 'one man show', 'humour', 'cabaret', 'magie'],
  'festival': ['festival', 'festiv', 'biennale', 'rencontres'],
  'cinema': ['cinema', 'film', 'projection', 'cine-club', 'avant-premiere'],
  'danse': ['danse', 'ballet', 'contemporain', 'hip-hop', 'breakdance'],
  'cirque': ['cirque', 'arts du cirque', 'jonglage', 'acrobatie'],
  'lecture': ['lecture', 'rencontre auteur', 'dedicace', 'poesie', 'litterature'],
  'conference': ['conference', 'colloque', 'seminaire', 'table ronde', 'debats'],
  'atelier': ['atelier', 'stage', 'initiation', 'pratique', 'diy', 'faire soi-meme'],
  'marche': ['marche', 'marche de noel', 'brocante', 'vide-grenier', 'artisanat'],
  'foire': ['foire', 'salon', 'exposition commerciale', 'fete foraine'],
  'sport': ['sport', 'course', 'match', 'tournoi', 'rando', 'velo', 'marche'],
  'enfants': ['enfant', 'famille', 'jeune public', 'spectacle jeune', 'animation', 'jeux'],
};

/**
 * Schéma index par département (fichier JSON statique)
 */
export interface DepartementIndex {
  departement: string;        // Numéro département (ex: "45")
  nom: string;                // Nom département (ex: "Loiret")
  region: string;             // Région (ex: "Centre-Val de Loire")
  totalEvents: number;
  events: NormalizedEvent[];  // Events de CE département seulement
  lastUpdated: string;        // ISO 8601
  sources: string[];          // Sources contributrices
}

/**
 * Schéma healthcheck sources
 */
export interface SourceHealth {
  source: string;
  status: 'ok' | 'error' | 'warning';
  lastFetch: string;
  eventCount: number;
  latencyMs: number;
  error?: string;
  consecutiveErrors: number;
}