# Pipeline de Données — Spécifications Techniques

> **Projet :** SortirIci
> **Stack :** Node.js ESM — Zéro DB — Zéro serveur — Full static
> **Architecture :** Pipeline ETL séquentiel : `fetch → normalize → dedupe → enrich → build-index`
> **Documents de référence :** `src/lib/schemas.ts` (définitions TypeScript), scripts/ (implémentations)

---

## Table des matières

1. [Schémas d'entrée détaillés par type de source](#1-schémas-dentrée-détaillés-par-type-de-source)
2. [Logique de dédup complète](#2-logique-de-dédup-complète)
3. [Stratégie de test unitaire](#3-stratégie-de-test-unitaire)
4. [Gestion des erreurs et retry](#4-gestion-des-erreurs-et-retry)
5. [Annexes](#5-annexes)

---

## 1. Schémas d'entrée détaillés par type de source

### 1.1 Type A : OpenAgenda JSON (format natif OpenAgenda API)

**Sources concernées :**
- `openagenda-orleans` — `data.orleans-metropole.fr/…/exports/json`
- `openagenda-loiret` — `openagenda.com/agendas/36668061/events.json`
- `meudon-agenda` — `data.meudon.fr/…/openagenda/exports/json`
- `bordeaux-agenda` — `datahub.bordeaux-metropole.fr/…/met_agenda/exports/json`

**Format fichier :** `.json` — tableau d'objets OU objet racine avec champ `events` (détection auto)

**Schéma détaillé (entrée brute OpenAgenda) :**

| Champ | Type | Obligatoire | Description | Normalisation |
|-------|------|-------------|-------------|---------------|
| `uid` | `number` | ✅ | ID unique OpenAgenda | Préfixé `oa-` |
| `slug` | `string` | ✅ | Slug URL OpenAgenda | Conservé pour fallback |
| `canonicalUrl` | `string` | ✅ | URL canonique OpenAgenda | → `sourceUrl` |
| `title` | `{ fr: string }` | ✅ | Titre FR | → `titre` |
| `description` | `{ fr: string }` | ❌ | Description courte | Strip HTML, max 300 chars → `descriptionCourte` |
| `longDescription` | `{ fr: string }` | ❌ | Description longue | Ignoré après extraction courte |
| `keywords` | `{ fr: string[] }` | ❌ | Mots-clés | → `motsCles`, aussi utilisé pour catégorisation |
| `image` | `string` | ❌ | URL image | Préservé dans champ dédié (future spec média) |
| `thumbnail` | `string` | ❌ | URL miniature | Ignoré |
| `updatedAt` | `string` | ✅ | Date maj ISO 8601 | → `dateMaj` |
| `firstDateBegin` | `string` (ISO) | ✅ | Date début | → `dateDebut` |
| `firstDateEnd` | `string` (ISO) | ❌ | Date fin optionnelle | → `dateFin` (fallback = `dateDebut`) |
| `lastDateBegin` | `string` (ISO) | ❌ | Début de dernière occurrence | Ignoré |
| `lastDateEnd` | `string` (ISO) | ❌ | Fin de dernière occurrence | Utilisé comme `dateFin` si présent |
| `timings` | `string` | ❌ | Horaires libre | → `horaires` (future spec) |
| `locationUid` | `number` | ✅ | ID lieu OpenAgenda | Conservé pour track |
| `locationCoordinates` | `{ lon: number, lat: number }` | ✅ | Coordonnées WGS84 | → `lieuLatitude`/`lieuLongitude` |
| `locationName` | `string` | ✅ | Nom du lieu | → `lieuNom` |
| `locationAddress` | `string` | ✅ | Adresse | → `lieuAdresse` |
| `locationDistrict` | `string` | ❌ | Quartier | Conservé (future filtre) |
| `locationInsee` | `string` | ✅ | Code INSEE commune | → `lieuCodeInsee`, extrait `departementNumero` |
| `locationPostalCode` | `string` | ✅ | Code postal | → `lieuCodePostal` |
| `locationCity` | `string` | ✅ | Ville | → `lieuCommune` |
| `locationDepartment` | `string` | ❌ | Département (texte) | → `lieuDepartement` (par code INSEE) |
| `locationRegion` | `string` | ❌ | Région | → `lieuRegion` |
| `locationCountryCode` | `string` | ❌ | Pays | Vérifié `FR` sinon rejet |
| `attendancemode` | `string` | ❌ | `offline`/`online`/`mixed` | → `modeAcces` |
| `onlineAccessLink` | `string` | ❌ | Lien visio | Conservé si mode hybride |
| `status` | `string` | ❌ | `canceled`/`postponed`/`confirmed` | → `statut` |
| `ageMin` | `number` | ❌ | Âge minimum | Conservé (future filtre) |
| `ageMax` | `number` | ❌ | Âge maximum | Conservé (future filtre) |
| `originAgendaTitle` | `string` | ✅ | Nom agenda source | → `source` (ré-affecté via config) |
| `originAgendaUid` | `number` | ✅ | UID agenda source | Conservé |

**⚠ PII détectée (à supprimer impérativement dans normalize) :**
- `contributorEmail` → ignoré
- `contributorContactNumber` → ignoré
- `contributorContactName` → ignoré
- `contributorContactPosition` → ignoré

**Cas particuliers OpenAgenda :**
- Les portails `data.*.fr/api/explore/v2.1/…/exports/json` retournent parfois un tableau brut, parfois `{ results: […] }` ou `{ data: […] }`. Le normaliseur doit détecter le wrapper.
- `martigues-agenda` utilise le format CSV d'OpenAgenda (cf. Type C).
- OpenAgenda accepte `oaq[passed]=1` pour inclure les événements passés dans le flux.

---

### 1.2 Type B : API Ministère Culture / Tourinsoft (JSON structuré)

**Sources concernées :**
- `ministere-festivals` — `data.culture.gouv.fr/…/panorama-des-festivals/exports/json`
- `toulouse-spectacles` — `data.toulouse-metropole.fr/…/theatres-et-salles-de-spectacles`
- `vendee-tourinsoft` — `wcf.tourinsoft.com/Syndication/3.0/…/objects`

**Format fichier :** `.json` — tableau de records clé-valeur

**Schéma détaillé (entrée brute) :**

| Champ | Type | Obligatoire | Description | Normalisation |
|-------|------|-------------|-------------|---------------|
| `id` / `Id` / `ID` | `string` | ✅ | Identifiant source | Préfixé `csv-{sourceId}-{id}` |
| `nom` / `titre` / `title` / `Nom` | `string` | ✅ | Titre événement | → `titre` |
| `description` / `Description` / `presentation` | `string` | ❌ | Description | Strip HTML, max 300 chars |
| `dateDebut` / `date_debut` / `startDate` / `Date_debut` / `datedebut` / `dateDébut` | `string` | ✅ | Date début ISO | → `dateDebut` |
| `dateFin` / `date_fin` / `endDate` / `Date_fin` / `datefin` / `dateFin` | `string` | ❌ | Date fin | → `dateFin` (fallback = `dateDebut`) |
| `lieu` / `lieu_nom` / `location` / `Lieu` / `Lieu_de_la_manifestation` | `string` | ✅ | Nom du lieu | → `lieuNom` |
| `adresse` / `address` / `Adresse` / `Adresse_1` | `string` | ❌ | Adresse | → `lieuAdresse` |
| `codePostal` / `code_postal` / `postalCode` / `Code_postal` / `codepostal` | `string` | ❌ | Code postal | → `lieuCodePostal` |
| `commune` / `ville` / `city` / `Commune` / `Ville` | `string` | ✅ | Ville | → `lieuCommune` |
| `departement` / `Departement` / `Département` | `string` | ❌ | Département texte | → `lieuDepartement` |
| `region` / `Region` / `Région` | `string` | ❌ | Région | → `lieuRegion` |
| `latitude` / `lat` / `Latitude` / `lat_wgs84` | `number`/`string` | ❌ | Latitude WGS84 | → `lieuLatitude` |
| `longitude` / `lon` / `lng` / `Longitude` / `long_wgs84` | `number`/`string` | ❌ | Longitude WGS84 | → `lieuLongitude` |
| `type` / `Type` / `categorie` / `Categorie` | `string` | ❌ | Type/catégorie source | Utilisé pour classification |
| `theme` / `Theme` / `Thématique` | `string` | ❌ | Thème source | Utilisé pour mots-clés |
| `publicVise` / `public` | `string` | ❌ | Public cible | Conservé (filtre futur) |
| `gratuit` / `Gratuit` / `gratuit_pour_tous` | `boolean`/`string` | ❌ | Gratuité | → `gratuit` |
| `siteWeb` / `url` / `site_web` / `Url` | `string` | ❌ | URL site/source | → `sourceUrl` |
| `prix` / `tarif` / `Tarifs` | `string` | ❌ | Prix indicatif | → `prixIndicatif` |
| `codeInsee` / `code_insee` / `insee` / `Code_insee` / `code_insee_commune` | `string` | ❌ | Code INSEE commune | → `lieuCodeInsee` |
| `motsCles` / `mots_cles` / `tags` / `motsclés` | `string`/`string[]` | ❌ | Mots-clés | → `motsCles` |

**⚠ PII détectée (à supprimer) :**
- `email` / `Email` / `mail` / `mail_contact` → ignoré
- `telephone` / `tel` / `Telephone` / `tel_contact` → ignoré
- `organisateur` / `structure` (quand nom de personne) → anonymisé en `"Organisateur"`

**Cas particuliers :**
- **Ministère Culture** : L'API utilise des champs en camelCase français (`dateDebut`, `siteWeb`). Le réponse est un tableau direct ou un objet `{ results: […] }`.
- **Tourinsoft** : Utilise `$format=json`. La réponse peut être un tableau ou un objet `{ d: { results: […] } }`. Propriétés en PascalCase (`Id`, `Nom`, `Date_debut`). Le parser doit mapper les variantes.
- **Toulouse** : API retourne un tableau avec des champs en snake_case. Pas de code INSEE — le lieu est déduit du code postal.

---

### 1.3 Type C : CSV portails open data locaux

**Sources concernées :**
- `martigues-agenda` — OpenAgenda CSV (Venue-based)
- `grenoble-culturel` — CSV Grenoble Métropole

**Format fichier :** `.csv` — première ligne = en-têtes, séparateur virgule, guillemets doubles optionnels

**Schéma détaillé (entrée brute CSV) :**

| Colonne (variantes) | Type | Obligatoire | Description | Normalisation |
|---------------------|------|-------------|-------------|---------------|
| `uid` / `id` / `Id` / `ID` | `string` | ❌ | ID source | Si absent → `csv-{sourceId}-{mathRandom}` |
| `title` / `titre` / `Titre` / `nom` / `Nom` | `string` | ✅ | Titre | → `titre` |
| `description` / `Description` / `descriptif` / `Descriptif` | `string` | ❌ | Description | Strip HTML, max 300 chars |
| `dateDebut` / `date_debut` / `Date_debut` / `firstdate_begin` | `string` | ✅ | Date début ISO | → `dateDebut` |
| `dateFin` / `date_fin` / `Date_fin` / `lastdate_end` | `string` | ❌ | Date fin | → `dateFin` |
| `lieu` / `Lieu` / `location` / `lieu_nom` | `string` | ✅ | Nom du lieu | → `lieuNom` |
| `adresse` / `Adresse` / `address` / `rue` | `string` | ❌ | Adresse | → `lieuAdresse` |
| `codePostal` / `code_postal` / `Code_postal` / `cp` | `string` | ❌ | Code postal | → `lieuCodePostal` |
| `commune` / `Commune` / `ville` / `Ville` | `string` | ✅ | Ville | → `lieuCommune` |
| `codeInsee` / `code_insee` / `insee` | `string` | ❌ | Code INSEE | → `lieuCodeInsee` |
| `latitude` / `lat` / `lat_wgs84` | `string`/`number` | ❌ | Latitude | → `lieuLatitude` |
| `longitude` / `lon` / `lng` / `long_wgs84` | `string`/`number` | ❌ | Longitude | → `lieuLongitude` |
| `region` / `Region` / `departement` / `Departement` | `string` | ❌ | Région/département | → `lieuRegion`/`lieuDepartement` |
| `keywords_fr` / `motsCles` / `tags` / `motscles` | `string` | ❌ | Mots-clés (séparés `\|`) | Split sur `\|` → `motsCles` |
| `gratuit` / `Gratuit` / `free` / `gratuit_pour_tous` | `string`/`boolean` | ❌ | Gratuité | `true`/`oui`/`1` → `true` |
| `url` / `siteWeb` / `sourceUrl` / `canonicalUrl` | `string` | ❌ | URL source | → `sourceUrl` |
| `conditions_fr` | `string` | ❌ | Conditions (tarifs) | Cherche "gratuit" / extrait prix |

**Cas particuliers CSV :**
- **OpenAgenda CSV** (`martigues-agenda`) : Colonnes avec snake_case (`firstdate_begin`, `lastdate_end`, `keywords_fr`, `location_name`, etc.). Séparateur `,`, guillemets pour champs multi-mots. La colonne `keywords_fr` utilise `|` comme séparateur interne.
- **Grenoble CSV** : Colonnes en français. Peut avoir des sauts de ligne dans les descriptions. Le parser CSV basique échouera — il faut un vrai parser CSV (cf. §3 sur les dépendances).
- **Encodage** : Assumer UTF-8. Si BOM présent, le strip. Si latin1, tenté une conversion en UTF-8.

---

### 1.4 Type D : Portails open data locaux (API v2.1 standardisée)

**Sources concernées :**
- `clermont-agenda` — `opendata.clermontmetropole.eu/…/exports/json`
- `guerande-agenda` — `data.capatlantique.fr/…/exports/json`
- `labaule-agenda` — `data.capatlantique.fr/…/exports/json`
- `nantes-culture` — `data.nantesmetropole.fr/…/exports/json`

**Format fichier :** `.json` — API `explore/v2.1/catalog/…/exports/json`

Ces APIs retournent souvent un **tableau plat d'objets** (contrairement à OpenAgenda). Les champs sont variés.

**Schéma détaillé (entrée API simplifiée) :**

| Champ (variantes vues) | Type | Obligatoire | Description |
|------------------------|------|-------------|-------------|
| `uid` / `id` / `Id` / `ID` / `recordid` | `string`/`number` | ✅ | ID dans le catalogue |
| `titre` / `title` / `nom` / `libelle` / `Titre` | `string` | ✅ | Titre événement |
| `description` / `descriptif` / `resume` / `Description` | `string` | ❌ | Description |
| `date_debut` / `dateDebut` / `start_date` / `Date_debut` | `string` | ✅ | Date début |
| `date_fin` / `dateFin` / `end_date` / `Date_fin` | `string` | ❌ | Date fin |
| `horaire` / `horaires` / `time` | `string` | ❌ | Horaires |
| `lieu` / `Lieu` / `nom_lieu` / `location_name` / `locationName` | `string` | ✅ | Nom du lieu |
| `adresse` / `address` / `Adresse` / `rue` | `string` | ❌ | Adresse |
| `code_postal` / `codePostal` / `cp` / `Code_postal` | `string` | ❌ | Code postal |
| `commune` / `ville` / `city` / `Commune` / `Ville` | `string` | ✅ | Ville |
| `code_insee` / `insee` / `code_insee_commune` | `string` | ❌ | Code INSEE |
| `latitude` / `lat` / `y_latitude` / `Latitude` | `number`/`string` | ❌ | Latitude |
| `longitude` / `lon` / `lng` / `x_longitude` / `Longitude` | `number`/`string` | ❌ | Longitude |
| `categorie` / `Categorie` / `type` / `thematique` / `categorie_1` | `string` | ❌ | Catégorie source |
| `gratuit` / `gratuit_pour_tous` / `free_access` / `gratuit_1` | `boolean`/`string` | ❌ | Gratuité |
| `url` / `url_site` / `site_web` / `lien` | `string` | ❌ | URL source |
| `tags` / `mots_cles` / `motscles` / `keywords` | `string[]`/`string` | ❌ | Mots-clés |

**Cas particuliers :**
- **Clermont-Ferrand** : Les données sont dans un tableau d'objets. Certaines dates sont au format `DD/MM/YYYY` (pas ISO). Nécessite parsing.
- **Nantes** : L'API contient des événements de bibliothèque (lecture, ateliers). Les coordonnées sont parfois absentes.
- **Cap Atlantique** (Guérande, La Baule) : Même API, formats cohérents entre les deux.

---

## 2. Logique de dédup complète

### 2.1 Périmètre et objectifs

Le pipeline reçoit des événements de **14 sources** qui se chevauchent :
- Un même événement réel peut être référencé par plusieurs sources (ex : festival présent sur OpenAgenda ET Ministère Culture)
- La même source peut renvoyer des doublons (événement modifié = enregistrement multiple)
- Le dédup s'opère à **3 niveaux successifs**

### 2.2 Niveau 1 : UID source (intra-source, déterministe)

**Étape :** Post-normalisation, pré-dédup général.

```javascript
// Logique : même source + même uid source natif → doublon
const key1 = `${e.source}|${e.uid}`;
```

**Règle :** Si le préfixe d'UID est stable (`oa-*` pour OpenAgenda, `csv-*` pour les autres), deux événements avec le même UID et la même source sont identiques. **Garder le plus récent** (comparer `dateMaj`).

**Pseudo-code :**
```
groupé par (source, uid) :
  si un seul → conserver
  si plusieurs → garder celui avec dateMaj la plus récente
                  si dateMaj identiques → garder le premier
```

**Priorité :** Intra-source uniquement. Ne capture pas les doublons cross-source.

### 2.3 Niveau 2 : Clé composite (titre + date + lieu)

**Étape :** Après dédup UID. Méthode actuelle — à renforcer.

**Clé actuelle :**
```javascript
const key2 = `${e.source}|${e.titre}|${e.dateDebut}|${e.lieuCommune}`.toLowerCase();
```

**Problème :** Inclut `e.source` → ne capture PAS les doublons cross-source. Un festival listé sur OpenAgenda ET sur Ministère Culture passe à travers.

**Clé renforcée proposée (cross-source) :**
```javascript
// Étape A — même source seulement (dédouble les erreurs intra-source)
const key2a = `${e.source}|${normalizeTitle(e.titre)}|${normalizeDate(e.dateDebut)}|${normalizeCity(e.lieuCommune)}`;
```

```javascript
// Étape B — cross-source (capture les doublons entre sources)
function dedupKey(e) {
  // Normalise le titre : lower, NFD, supprime accents, supprime ponctuation
  const titre = e.titre.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Date au format YYYY-MM-DD seulement
  const date = e.dateDebut.substring(0, 10);
  // Ville : lower, sans accents
  const ville = e.lieuCommune.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return `${titre}|${date}|${ville}`;
}
```

**Règle de sélection :** Quand plusieurs événements partagent la même clé cross-source :
1. **Préférer la source la plus fiable** selon l'ordre : `ministere-festivals` > `openagenda-*` > portails locaux CSV
2. **Préférer le titre le plus long** (plus descriptif)
3. **Préférer l'événement avec coordonnées GPS non-nulles**
4. Si toutes les sources sont équivalentes → garder la première rencontrée

**Ordre de fiabilité des sources :**
```
ministere-festivals          # Source officielle, données structurées
openagenda-orleans           # OpenAgenda aggrégé par métropole
openagenda-loiret
bordeaux-agenda
clermont-agenda
guerande-agenda
meudon-agenda
labaule-agenda
nantes-culture
toulouse-spectacles
loiret-openagenda
martigues-agenda             # CSV → moins fiable (parser brut)
grenoble-culturel             # CSV → moins fiable
vendee-tourinsoft            # Tourinsoft → format propriétaire
```

### 2.4 Niveau 3 : Fuzzy matching (cross-source, titres variants)

**Objectif :** Capturer les doublons où le titre varie légèrement :
- "Festival de la Musique 2025" vs "Festi'Musique 2025"
- "Concert de jazz à l'église" vs "Jazz à l'église"
- "Marché de Noël (Orléans)" vs "Marché de Noël — Orléans centre"

**Algorithme proposé :** Dice coefficient + normalisation poussée

```javascript
import { lstatSync, readdirSync, existsSync } from 'node:fs';

// 1. Regrouper les événements par (dateDebut + lieuCommune normalisé)
// 2. Dans chaque groupe, comparer les titres 2 à 2 avec Dice coefficient
// 3. Seuil de similarité : ≥ 0.75

function normalizeForFuzzy(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // enlève accents
    .replace(/[^a-z0-9\s-]/g, ' ')                      // garde lettres, chiffres, tirets
    .replace(/\s+/g, ' ').trim();
}

function diceCoefficient(a, b) {
  // Bigrammes
  const bigrams = new Map();
  for (let i = 0; i < a.length - 1; i++) {
    const bigram = a.substring(i, i + 2);
    bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
  }
  let intersectionSize = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bigram = b.substring(i, i + 2);
    const count = bigrams.get(bigram) || 0;
    if (count > 0) {
      bigrams.set(bigram, count - 1);
      intersectionSize++;
    }
  }
  return (2.0 * intersectionSize) / (a.length + b.length - 2); // longueur bigrammes
}
```

**Exceptions et exclusions du fuzzy matching :**
- Titres de moins de 8 caractères → pas de fuzzy (trop court)
- Différence de date > 1 jour → pas de fuzzy
- Événements déjà appariés par Niveau 2 → ignorés
- Si score ≥ 0.85 → auto-fusion
- Si score 0.75-0.84 → marqué "à vérifier" (log warning, mais fusionné)

### 2.5 Algorithme complet de dédup (fusionné)

```
ENTRÉE : events[] (normalisés)

1. TRIER events par dateMaj DESC (les plus récents d'abord)

2. NIVEAU 1 — Dédup par UID source
   Map<source|uid, Event>
   Si conflit → garder dateMaj le plus récent

3. NIVEAU 2 — Dédup par clé composite cross-source
   Map<cleCrossSource, Event>
   Si conflit → appliquer ordre de fiabilité des sources
   → Chaque événement unique reçoit un champ dedupGroupId (UUID)

4. NIVEAU 3 — Fuzzy matching
   Grouper par (dateDebut[0:10] + lieuCommune normalisé)
   Pour chaque groupe de taille > 1 :
     Pour chaque paire (a, b) non déjà fusionnée :
       score = diceCoefficient(normalizeForFuzzy(a.titre), normalizeForFuzzy(b.titre))
       Si score ≥ 0.75 :
         Fusionner : garder le meilleur (selon fiabilité source)
         Ajouter a.source aux sources croisées de b (champ crossSource: string[])
         Log : "Fuzzy dedup: '{a.titre}' ({a.source}) ≈ '{b.titre}' ({b.source}) — score: {score}"

SORTIE : dedupedEvents[] (uniques, fusionnés)
```

### 2.6 Champ `crossSource` ajouté au NormalizedEvent

Pour tracer les fusions cross-source, ajouter au schéma normalisé :

```typescript
interface NormalizedEvent {
  // ... champs existants ...
  crossSource?: string[];  // Sources additionnelles qui référencent le même événement
  dedupScore?: number;     // 1.0 = UID, 0.9 = clé composite, 0.75-0.84 = fuzzy warning
}
```

---

## 3. Stratégie de test unitaire

### 3.1 Infrastructure de test

**Framework :** `node:test` (built-in Node.js 22)
**Commande :** `npm test` → `node --test scripts/**/*.test.mjs`
**Convention :** Un fichier `{module}.test.mjs` par étape du pipeline, placé dans `scripts/`

### 3.2 Organisation des tests

```
scripts/
├── fetch-sources.js
├── fetch-sources.test.mjs      ← NOUVEAU
├── normalize.js
├── normalize.test.mjs          ← NOUVEAU
├── dedupe.js
├── dedupe.test.mjs             ← NOUVEAU
├── enrich.js
├── enrich.test.mjs             ← NOUVEAU
├── build-index.js
├── build-index.test.mjs        ← NOUVEAU
├── healthcheck.js
├── healthcheck.test.mjs        ← NOUVEAU
├── pipeline-specs.md           ← CE DOCUMENT
└── test/
    ├── fixtures/               ← Données de test statiques
    │   ├── openagenda-sample.json
    │   ├── ministry-sample.json
    │   ├── local-portal-sample.json
    │   ├── csv-sample.csv
    │   └── expected-normalized.json
    └── helpers.mjs             ← Utilitaires de test partagés
```

### 3.3 Tests par étape

#### 3.3.1 `fetch-sources.test.mjs`

| # | Test | Type | Description |
|---|------|------|-------------|
| 1 | fetch réussite | unitaire | Mock `fetch()` — vérifie que le body est écrit dans `data/raw/{id}.json` |
| 2 | fetch échec HTTP | unitaire | Mock 500 — vérifie `status: 'error'` dans le résultat |
| 3 | fetch timeout | unitaire | Mock timeout (AbortSignal) — vérifie gestion d'erreur |
| 4 | fetch réseau down | unitaire | Mock `fetch` qui rejette — vérifie `Promise.allSettled` gère les rejets |
| 5 | écriture fichier | unitaire | Vérifie que `mkdirSync(RAW_DIR)` est appelé et que le fichier contient le body |
| 6 | health output | unitaire | Vérifie que `fetch-results.json` contient les bonnes stats |
| 7 | toutes les sources sont tentées | intégration | Avec un mock qui réussit tout, vérifie que les 14 sources sont dans le résultat |
| 8 | headers Accept | unitaire | Vérifie que le header `Accept` inclut JSON et CSV |

#### 3.3.2 `normalize.test.mjs`

| # | Test | Type | Description |
|---|------|------|-------------|
| 1 | normalizeOpenAgenda complète | unitaire | Données OpenAgenda réalistes → tous les champs NormalizedEvent présents |
| 2 | normalizeOpenAgenda champs nuls | unitaire | Titre vide, date absente → filtré (condition `titre && dateDebut && lieuCommune`) |
| 3 | normalizeOpenAgenda sans lieu | unitaire | `lieuCommune` vide → filtré |
| 4 | normalizeCSV ministère | unitaire | Objet MinistryFestival → NormalizedEvent correct |
| 5 | normalizeCSV variantes champs | unitaire | snake_case, camelCase, PascalCase → tous résolus |
| 6 | PII supprimées (OpenAgenda) | régression | Vérifie qu'aucun des champs PII n'est dans la sortie |
| 7 | PII supprimées (Ministère) | régression | `email`, `telephone` absents |
| 8 | HTML strip | unitaire | Description avec `<p>`, `<br>` → texte brut |
| 9 | description trop longue | unitaire | Description > 300 chars → tronquée à 300 |
| 10 | catégorisation | unitaire | Titre "Concert de jazz" → catégorie `concert` |
| 11 | catégorisation fallback | unitaire | Titre inconnu → catégorie `spectacle` |
| 12 | slugify | unitaire | "Soirée Jazz 2025!" → "soiree-jazz-2025" |
| 13 | extrait département INSEE | unitaire | "45000" → departement "45", "97100" → "971" |
| 14 | parse CSV ligne | unitaire | Header + 1 ligne CSV → objet parsé |
| 15 | parse CSV guillemets | unitaire | Valeurs avec guillemets et virgules internes |
| 16 | parse CSV en-têtes manquants | unitaire | Ligne vide, headers manquants → graceful fallback |
| 17 | détection wrapper API | unitaire | `{ events: [...] }`, `{ results: [...] }` → tableau extrait |
| 18 | gratuité détectée mots-clés | unitaire | Mot "gratuit" dans keywords → `gratuit: true` |

#### 3.3.3 `dedupe.test.mjs`

| # | Test | Type | Description |
|---|------|------|-------------|
| 1 | pas de doublon | unitaire | 3 événements différents → 3 conservés |
| 2 | doublon exact même source | unitaire | Même UID source + même titre + même date/lieu → 1 conservé |
| 3 | doublon cross-source (clé composite) | unitaire | Même titre + date + ville, sources différentes → 1 conservé, `crossSource` rempli |
| 4 | doublon cross-source choix fiabilité | unitaire | OpenAgenda + Ministère même événement → Ministère gardé |
| 5 | fuzzy matching même date/lieu | unitaire | Titres avec 85% similarité → fusionné |
| 6 | fuzzy matching threshold | unitaire | Titres 70% similarité → PAS fusionné |
| 7 | fuzzy matching titre court | unitaire | Titre < 8 chars → pas de fuzzy |
| 8 | doublon date différente > 1 jour | unitaire | Même lieu/titre, dates différentes → PAS dédoublonné |
| 9 | garde le plus récent | unitaire | 2 doublons avec dateMaj différentes → garde le plus récent |
| 10 | dédup vide | unitaire | Tableau vide → sortie vide |
| 11 | dédup un élément | unitaire | Tableau 1 élément → inchangé |
| 12 | stats output | unitaire | Vérifie le message console : "X → Y (Z doublons supprimés)" |

#### 3.3.4 `enrich.test.mjs`

| # | Test | Type | Description |
|---|------|------|-------------|
| 1 | événement passé | unitaire | `dateFin` dans le passé → `statut: 'termine'` |
| 2 | événement à venir | unitaire | `dateDebut` dans 1 mois → `statut: 'programme'` |
| 3 | événement cette semaine | unitaire | `dateFin` dans 3 jours → `statut: 'programme'` |
| 4 | gratuit marqué | unitaire | `gratuit: true` → `prixIndicatif: 'Gratuit'` |
| 5 | non-gratuit inchangé | unitaire | `gratuit: false` → `prixIndicatif` conservé |
| 6 | prix existant | unitaire | `prixIndicatif` déjà présent → pas écrasé |

#### 3.3.5 `build-index.test.mjs`

| # | Test | Type | Description |
|---|------|------|-------------|
| 1 | index par département | unitaire | 3 events dans 2 départements → 2 fichiers créés |
| 2 | index global | unitaire | Vérifie `events-index.json` avec total, dates, sources |
| 3 | limite 200 events/département | unitaire | 250 events dans même dept → seulement 200 dans le fichier |
| 4 | tri chronologique | unitaire | Events dans le désordre → triés par `dateDebut` DESC |
| 5 | sitemap généré | unitaire | Vérifie `sitemap.xml` avec les URLs de tous les départements |
| 6 | départements multiples | unitaire | Events sans `departementNumero` → classés sous "00" |
| 7 | metadata départements | unitaire | Vérifie le champ `departements` dans l'index |

#### 3.3.6 `healthcheck.test.mjs`

| # | Test | Type | Description |
|---|------|------|-------------|
| 1 | toutes les sources OK | unitaire | fetch réussi pour toutes → toutes `status: 'ok'` |
| 2 | source en erreur | unitaire | fetch échoué pour une source → `status: 'error'` avec message |
| 3 | event counts | unitaire | Vérifie que `eventCount` correspond au nombre d'events dans enriched.json |
| 4 | pas de fichier fetch-results | unitaire | Fichier manquant → graceful fallback (status 'unknown') |

### 3.4 Fixtures de test

Créer dans `scripts/test/fixtures/` :

**`openagenda-sample.json`** — 3-5 événements OpenAgenda réalistes avec :
- Au moins 1 avec tous les champs
- Au moins 1 avec des champs manquants
- Au moins 1 avec des coordonnées nulles
- Au moins 1 avec des PII (email, téléphone, nom) — pour vérifier suppression
- 1 avec `keywords_fr` contenant "gratuit"
- 1 avec HTML dans la description

**`ministry-sample.json`** — 2-3 événements format Ministère Culture

**`local-portal-sample.json`** — 2-3 événements format portail local

**`csv-sample.csv`** — 3-5 lignes CSV avec :
- En-têtes standard
- Ligne avec guillemets et virgules
- Ligne avec champs vides
- Ligne avec `keywords_fr` contenant des pipes `|`

**`expected-normalized.json`** — Le résultat attendu après normalisation des fixtures, servant de référence pour les tests.

### 3.5 Helpers de test

```javascript
// scripts/test/helpers.mjs
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Crée un répertoire temporaire avec des fichiers de données
 * pour tester un module du pipeline.
 */
export function createFixtureDir(files) {
  const dir = mkdtempSync(join(tmpdir(), 'sortirici-test-'));
  for (const [relPath, content] of Object.entries(files)) {
    const full = join(dir, relPath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, typeof content === 'string' ? content : JSON.stringify(content));
  }
  return dir;
}

/**
 * Mock fetch global pour les tests.
 */
export function mockFetch(handler) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return () => { globalThis.fetch = original; };
}

/**
 * Capture des sorties console pour les assertions.
 */
export function captureConsole() {
  const lines = [];
  const original = console.log;
  console.log = (...args) => lines.push(args.join(' '));
  return {
    lines,
    restore: () => { console.log = original; },
  };
}
```

---

## 4. Gestion des erreurs et retry

### 4.1 Configuration des retry (fetch-sources.js)

```javascript
const RETRY_CONFIG = {
  maxRetries: 3,              // Nombre maximum de tentatives
  baseDelayMs: 1000,          // Délai initial 1s
  maxDelayMs: 10000,          // Délai max 10s
  backoffFactor: 2,           // Exponentiel : 1s, 2s, 4s
  retryableStatuses: [429, 500, 502, 503, 504],  // HTTP status qui déclenchent retry
};
```

**Types d'erreurs et comportement associé :**

| Type d'erreur | Retry? | Délai | Action si échec final |
|---------------|--------|-------|----------------------|
| `HTTP 429 (Too Many Requests)` | ✅ Oui | Exponential backoff + jitter | Log warning, source marquée 'error' |
| `HTTP 5xx (Server Errors)` | ✅ Oui | Exponential backoff | Log error, source marquée 'error' |
| `HTTP 4xx (hors 429)` | ❌ Non | — | Log error, source marquée 'error' |
| `AbortSignal.timeout` | ✅ Oui | 3s, 6s, 12s (backoff différent) | Log timeout, source marquée 'error' |
| `DNS / réseau (fetch reject)` | ✅ Oui | Exponential backoff | Log network error |
| `JSON parse error` | ❌ Non | — | Log corrupt data, source marquée 'error' |
| `CSV parse error` | ❌ Non | — | Log corrupt CSV, source marquée 'error' |

### 4.2 Implémentation retry enrichie

```javascript
async function fetchWithRetry(source, retries = RETRY_CONFIG.maxRetries) {
  const start = Date.now();
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(source.url, {
        signal: AbortSignal.timeout(30000),
        headers: { 'Accept': 'application/json, text/csv, text/plain' },
      });

      if (response.ok) {
        const text = await response.text();
        const filepath = join(RAW_DIR, `${source.id}.${source.format === 'csv' ? 'csv' : 'json'}`);
        writeFileSync(filepath, text, 'utf-8');
        return {
          source: source.id,
          status: 'ok',
          bytes: text.length,
          latencyMs: Date.now() - start,
          attempts: attempt,
        };
      }

      // Statut retryable ?
      if (RETRY_CONFIG.retryableStatuses.includes(response.status)) {
        lastError = `HTTP ${response.status}: ${response.statusText}`;
        if (attempt < retries) await backoff(attempt);
        continue;
      }

      // Erreur fatale (4xx non-retryable)
      return {
        source: source.id,
        status: 'error',
        error: `HTTP ${response.status}: ${response.statusText}`,
        latencyMs: Date.now() - start,
        attempts: attempt,
      };

    } catch (err) {
      lastError = err.message;
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        // Timeout — retry avec délai plus long
        if (attempt < retries) {
          await backoff(attempt, 3000);  // Base 3s pour timeout
          continue;
        }
      } else if (err.cause === 'ERR_NETWORK' || err.code === 'ERR_DNS_FAIL') {
        // Erreur réseau — retry
        if (attempt < retries) {
          await backoff(attempt);
          continue;
        }
      }
      // Autres erreurs fatales
      break;
    }
  }

  return {
    source: source.id,
    status: 'error',
    error: lastError || 'Max retries exceeded',
    latencyMs: Date.now() - start,
    attempts: retries,
  };
}

function backoff(attempt, baseMs = RETRY_CONFIG.baseDelayMs) {
  const delay = Math.min(
    baseMs * Math.pow(RETRY_CONFIG.backoffFactor, attempt - 1),
    RETRY_CONFIG.maxDelayMs
  );
  // Jitter : ±20% aléatoire
  const jitter = delay * (0.8 + Math.random() * 0.4);
  console.log(`⏳ Retry ${attempt} dans ${Math.round(jitter)}ms...`);
  return new Promise(resolve => setTimeout(resolve, jitter));
}
```

### 4.3 Gestion des erreurs dans normalize.js

| Situation | Comportement |
|-----------|-------------|
| Fichier source manquant | Log `⚠️ {source}: file not found, skipping` — continue |
| JSON mal formé | Log `⚠️ {source}: JSON parse error, trying CSV fallback` |
| Aucun événement valide | Log `⚠️ {source}: 0 events after filtering` — fichier vide OK |
| Un événement sur 100 invalide | Les 99 valides sont normalisés, l'invalide est ignoré (graceful) |

### 4.4 Gestion des erreurs dans dedupe.js

| Situation | Comportement |
|-----------|-------------|
| Fichier all.json manquant | Erreur fatale : `❌ data/normalized/all.json not found — run normalize first` |
| Fichier vide (0 events) | Log `⚠️ No events to deduplicate` — sortie fichier vide |
| 1 seul événement | Log `ℹ️ Only 1 event — skipping dedup` — pas de perte |

### 4.5 Gestion des erreurs dans enrich.js

| Situation | Comportement |
|-----------|-------------|
| Date invalide | `new Date('invalid')` → Invalid Date. Vérifier `isNaN(date.getTime())` → ignorer le statut |
| Fuseau horaire | Toujours manipuler en UTC. `new Date(e.dateFin + 'Z')` si la date n'a pas de TZ |
| Fichier deduped.json manquant | Erreur fatale : log + exit(1) |

### 4.6 Gestion des erreurs dans build-index.js

| Situation | Comportement |
|-----------|-------------|
| enriched.json manquant | Erreur fatale |
| Département sans événement | Pas de fichier créé pour ce département |
| Limite de 200 événements dépassée | Tronquer, log `⚠️ {dept}: truncated to 200 events` |
| Erreur d'écriture | Catch + log, continue pour les autres fichiers |

### 4.7 Stratégie globale de résilience

```
┌──────────────────────────────────────────────┐
│          PIPELINE COMPLET (npm run pipeline)   │
├──────────────────────────────────────────────┤
│                                                │
│  fetch-sources.js                              │
│  ├── 14 sources parallèles (Promise.allSettled)│
│  ├── Retry 3x sur timeout / 5xx / 429         │
│  ├── Résultat partiel accepté                 │
│  └── Health report dans fetch-results.json    │
│                                                │
│  normalize.js                                  │
│  ├── Skip les sources manquantes              │
│  ├── Graceful sur JSON invalide               │
│  └── Toujours produit un fichier valide       │
│                                                │
│  dedupe.js                                     │
│  ├── Skip si 0 events                         │
│  └── Toujours produit deduped.json valide     │
│                                                │
│  enrich.js                                     │
│  ├── Skip si 0 events                         │
│  └── Toujours produit enriched.json valide    │
│                                                │
│  build-index.js                                │
│  ├── Skip si 0 events                         │
│  └── Toujours produit index + sitemap         │
│                                                │
└──────────────────────────────────────────────┘
```

### 4.8 Monitoring et alertes

**Healthcheck quotidien** (workflow `healthcheck.yml`) :
- Teste chaque source avec un HEAD request + timeout 15s
- Vérifie que `enriched.json` existe et a un nombre d'events > 0
- Si une source est en erreur > 2 builds consécutives → alerte email

**Seuils d'alerte :**
- **Warning** : 1-2 sources en erreur, nombre total d'events < 50% de la moyenne des 7 derniers jours
- **Error** : > 3 sources en erreur, nombre total d'events < 100, pipeline complet échoué

---

## 5. Annexes

### 5.1 Dépendances supplémentaires à ajouter à package.json

```json
{
  "devDependencies": {
    "csv-parse": "^5.6.0",
    "fast-csv": "^5.0.0"
  }
}
```

- `csv-parse` : Parser CSV robuste (gère guillemets, sauts de ligne dans les champs, BOM) pour remplacer le split manuel dans normalize. À utiliser en mode `{ columns: true, skip_empty_lines: true, relax_column_count: true }`.
- Alternative `papaparse` : plus léger, bundle ESM disponible.

### 5.2 Variables d'environnement pour configuration

```bash
# .env (optionnel, pour override)
FETCH_TIMEOUT_MS=30000
FETCH_MAX_RETRIES=3
FETCH_BASE_DELAY_MS=1000
MAX_EVENTS_PER_DEPT=200
LOG_LEVEL=info           # debug | info | warn | error
```

### 5.3 Schéma des fichiers de sortie du pipeline

```
data/
├── raw/                          ← Étape fetch
│   ├── openagenda-orleans.json
│   ├── ministere-festivals.json
│   ├── martigues-agenda.csv
│   └── ...
├── normalized/                   ← Étape normalize
│   ├── openagenda-orleans.json   (normalisé par source)
│   ├── ministere-festivals.json
│   ├── all.json                  (concaténation de toutes les sources)
│   ├── deduped.json              ← Étape dedupe
│   └── enriched.json             ← Étape enrich
├── fetch-results.json            ← Rapport fetch (health)
└── pipeline-stats.json           ← Métriques complètes (build-index)

public/
├── data/
│   ├── events-index.json         ← Index global
│   ├── events-45.json            ← Par département
│   ├── events-75.json
│   └── ...
└── sources-health.json           ← Healthcheck public
```

### 5.4 Pipeline Stats enrichi (pipeline-stats.json)

```typescript
interface PipelineStats {
  dateExecution: string;           // ISO 8601
  dureeMs: number;                 // Durée totale
  etapes: {
    fetch: { status: string; sources: number; ok: number; errors: number; dureeMs: number };
    normalize: { status: string; input: number; output: number; dureeMs: number };
    dedupe: { status: string; input: number; output: number; supprimes: number; fuzzys: number; dureeMs: number };
    enrich: { status: string; input: number; output: number; dureeMs: number };
    index: { status: string; input: number; departements: number; dureeMs: number };
  };
  totalSources: number;
  totalEventsUniques: number;
  totalDepartements: number;
  memoUtiliseeMo: number;          // process.memoryUsage().heapUsed
}
```

---

## Tableau de validation rapide

| Étape | Script | Entrée | Sortie | Si échec | Dépend |
|-------|--------|--------|--------|----------|--------|
| Fetch | `fetch-sources.js` | 14 URLs API | `data/raw/{id}.json` + `fetch-results.json` | Continu (sources OK partiel) | Aucune |
| Normalize | `normalize.js` | `data/raw/*.{json,csv}` | `data/normalized/{id}.json` + `all.json` | Continu (skip sources invalides) | Fetch ✅ |
| Dedupe | `dedupe.js` | `data/normalized/all.json` | `data/normalized/deduped.json` | Continu si vide | Normalize ✅ |
| Enrich | `enrich.js` | `data/normalized/deduped.json` | `data/normalized/enriched.json` | Continu si vide | Dedupe ✅ |
| Index | `build-index.js` | `data/normalized/enriched.json` | `public/data/events-*.json` + `sitemap.xml` | Continu si vide | Enrich ✅ |