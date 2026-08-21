# Cocon Sémantique SortirIci — Architecture & Maillage interne

Méthode : Cocon Sémantique (Laurent Bourrelly), déclinaison omnicanale.
Principe directeur (Bourrelly) : *« Le seul véritable levier du SEO, c'est le lien.
Le maillage interne est le trésor sous-exploité. »* → on bâtit des **silos étanches**
reliés par un **maillage chirurgical**, avec des **pages piliers** qui mastersent un sujet.

## 1. Le sujet central (hub racine)
`sortirici.github.io` = « l'agenda culturel local 100% open data en France ».
Toutes les ramifications traitent la même promesse : trouver une sortie culturelle près de chez soi.

## 2. Les 3 familles de silos (piliers)

### A. Silos GÉOGRAPHIQUES (intention locale = trafic le plus qualifié)
```
Accueil
 ├─ /departement/            (index)
 │   ├─ /departement/[num]/            (hub département — EXISTE)
 │   │   └─ /departement/[num]/[cat]/  (catégorie dans le dept — EXISTE)
 │   └─ /ville/[commune]/             (hub commune — NOUVEAU, haute intention)
```
Règle : chaque fiche événement link → son département + sa commune.

### B. Silos CATÉGORIE (taxonomie fixe, 15 catégories)
```
Accueil
 └─ /categorie/[cat]/        (hub catégorie France — NOUVEAU)
     └─ chaque événement de cette catégorie
```
Règle : chaque fiche événement link → sa catégorie globale + sa catégorie-dans-dept.

### C. Silos INTENTION / USAGE (requêtes de la longue traîne)
```
/gratuit/        (tous les événements gratuits)
/enfants/        (catégorie enfants + famille)
/ce-week-end/    (événements à venir ≤ 4 jours)
```
Règle : un événement gratuit link → /gratuit/ ; un événement enfants link → /enfants/.

## 3. Maillage interne chirurgical (la règle d'or)
Chaque fiche événement (`/evenement/[slug]/`) porte UN lien vers CHACUN de ses piliers :
1. Département → `/departement/[num]/`            (déjà fait)
2. Catégorie dans dept → `/departement/[num]/[cat]/` (déjà fait)
3. **Catégorie France → `/categorie/[cat]/`**      (NOUVEAU)
4. **Commune → `/ville/[commune]/`**              (NOUVEAU)
5. **Connexes** → 4-5 événements de MÊME catégorie, autres départements (NOUVEAU)
6. Si gratuit → `/gratuit/` ; si enfants → `/enfants/` (NOUVEAU)

Les piliers link EN RETOUR vers les événements + vers les piliers frères
(même catégorie dans d'autres dept, même ville dans d'autres catégories) →
effet « vases communicants » (Bourrelly) qui propage le PageRank.

## 4. Ancrage sémantique (Bourrelly : « proximité & glissement sémantique »)
- Titres de pilier = requête réelle : « Concerts en France », « Que faire à Nantes »,
  « Sorties gratuites près de chez vous ».
- Pas de duplication : le contenu de chaque pilier est une *agrégation* unique
  (liste + intro + FAQ), pas du texte recyclé.
- Chaque pilier a sa FAQ + JSON-LD (CollectionPage / ItemList) pour la SERP enrichie.

## 5. Couche ÉDITORIALE (style reconnaissable, anti-slop — Bourrelly 2026)
Le contenu agrégé ne suffit pas : il faut un **style**. C'est le rôle du coach éditorial
(déjà amorcé) : publier des *guides* par pilier
(ex. « 10 concerts gratuits en Occitanie ce mois-ci », « Sortir en famille à Nantes »)
avec angle + immersion + anecdote. Même sujet, format article, dans le cocon.

## 6. Relais OMNICANAL (Bourrelly : « un cocon seulement sur un site ne suffit plus »)
Même sujet/vision, formats différents :
- **Newsletter** : la sélection hebdo par département/ville (relui le pilier).
- **Posts** : un extrait par événement phare, link vers la fiche.
- (Vidéo : abandonnée pour l'instant.)

## 7. Plan d'implémentation (ordre)
1. `COCON_SEMANTIQUE.md` (ce doc)
2. `src/pages/categorie/[cat].astro` — pilier catégorie France
3. `src/pages/ville/[commune].astro` — pilier commune (≥3 événements)
4. Édition `src/pages/evenement/[slug].astro` — liens 3/4/5/6
5. Édition `src/pages/index.astro` — exposition des silos (catégories + villes top)
6. Édition `scripts/generate-sitemap.mjs` — ajout des piliers
7. `npm run build` — vérification
