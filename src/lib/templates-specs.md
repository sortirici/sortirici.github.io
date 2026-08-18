# Spécifications Templates — SortirIci

> **Design System v2.0 — Templates clés**
> Archétype : Guide Bienveillant | Build : Astro + CSS + Alpine.js | Hébergement : GH Pages statique

---

## 1. Template : Page d'Accueil (Home)

### Objectif
Premier contact utilisateur. Doit en < 3 secondes : **(1)** montrer la valeur (agenda de confiance), **(2)** permettre la recherche, **(3)** donner confiance par les stats.

### Composition (ordre vertical mobile-first)

```
┌──────────────────────────────────────────────┐
│  HEADER (sticky)                              │
│  Logo + Navigation + Search compact           │
├──────────────────────────────────────────────┤
│  HERO SECTION                                 │
│  ┌──────────────────────────────────────────┐ │
│  │  "Sortir près de chez vous, en confiance"  │ │
│  │  Sous-titre éthique (0 cookie, 0 tracking) │ │
│  │                                            │ │
│  │  ┌──────────────────────────────────────┐  │ │
│  │  │  🔍  Rechercher un événement...      │  │ │
│  │  └──────────────────────────────────────┘  │ │
│  │  [Voir par département] [Explorer la carte] │ │
│  └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│  STATS BAR (4 chiffres clés)                  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────────┐│
│  │ 12K  │ │ 15   │ │ 45   │ │  0 cookie     ││
│  │ Évts │ │Sources│ │Dépts │ │  Confiance    ││
│  └──────┘ └──────┘ └──────┘ └──────────────┘│
├──────────────────────────────────────────────┤
│  CARTE INTERACTIVE FRANCE                     │
│  Leaflet, clusters par département, cliquable │
│  Hauteur: 400px / 300px mobile                │
├──────────────────────────────────────────────┤
│  DÉPARTEMENTS À LA UNE (grille, top 6-8)      │
│  ┌──────┐ ┌──────┐ ┌──────┐                  │
│  │ 45   │ │ 75   │ │ 69   │  ...              │
│  │Loiret│ │Paris │ │Rhône │                   │
│  │ 230  │ │ 1.2K │ │ 890  │                   │
│  └──────┘ └──────┘ └──────┘                  │
│  [Voir tous les départements →]               │
├──────────────────────────────────────────────┤
│  SECTION CONFIANCE (optionnelle)               │
│  "Pourquoi SortirIci ?" — 3 valeurs clés       │
│  100% open data · Sources citées · 0 tracking │
├──────────────────────────────────────────────┤
│  FOOTER                                        │
└──────────────────────────────────────────────┘
```

### Composants utilisés
- Header (sticky, backdrop-filter)
- SearchBar (variant: hero)
- Map (variant: home)
- StatsBar
- DepartementCard (grille)
- Button (primary, secondary)
- Footer

### Layout
- **Desktop (>1024px)** : Hero full-width, carte + stats + départements en cascade verticale
- **Tablet (768-1024px)** : Même cascade, grille départements 3 colonnes
- **Mobile (<768px)** : Hero compact, carte 300px, stats 2 colonnes, départements 2 colonnes, menu hamburger

### SEO / JSON-LD
- Organization JSON-LD (header)
- WebSite SearchAction JSON-LD (pour la barre de recherche)
- BreadcrumbList: Accueil

### États
- **Loading** : Skeleton hero + skeleton stats + skeleton carte
- **Loaded** : Contenu complet avec animations fadeInUp
- **Empty** : N/A (page d'accueil toujours peuplée)
- **Error** : Alert info + fallback texte

### Performance
- Taille cible : < 100KB HTML + CSS (hors images)
- Carte : lazy-load, Leaflet en deferred
- Images : WebP, lazy loading natif

---

## 2. Template : Hub Département

### Objectif
Page de listing pour un département spécifique. Affiche ~50 événements avec filtres, carte et liste. L'utilisateur doit pouvoir trouver un événement en < 10 secondes.

### Composition

```
┌──────────────────────────────────────────────┐
│  HEADER (sticky)                              │
├──────────────────────────────────────────────┤
│  BREADCRUMB                                   │
│  Accueil > {Région} > {Département}          │
├──────────────────────────────────────────────┤
│  HUB HEADER                                   │
│  ┌──────────────────────────────────────────┐ │
│  │  Département du {Nom} ({Numéro})          │ │
│  │  {count} événements référencés            │ │
│  │  Carte : {Région}                         │ │
│  │  Mini-stats : {count} sources · {range}   │ │
│  └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│  FILTERS BAR (horizontale, scrollable)        │
│  ┌──────────────────────────────────────────┐ │
│  │  🔍 Recherche...  [Catégories ▼]         │ │
│  │  [Aujourd'hui] [Week-end] [Semaine] [Mois]│ │
│  │  [Concert] [Théâtre] [Expo] ... [+8]     │ │
│  │  [Gratuit seulement]  [Réinitialiser]     │ │
│  └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│  CONTENT (2 colonnes desktop)                 │
│  ┌────────────────────┬─────────────────────┐│
│  │  CARTE DÉPARTEMENT  │  LISTE ÉVÉNEMENTS  ││
│  │  Leaflet, markers   │  (50 max)           ││
│  │  Hauteur: 500px     │  EventCard (default)││
│  │  Clusters si > 50   │  + pagination       ││
│  │  Hover → tooltip    │  ou infinite scroll ││
│  │  Click → fiche      │                     ││
│  │                     │  {count} sur 50     ││
│  └────────────────────┴─────────────────────┘│
├──────────────────────────────────────────────┤
│  PAGINATION / VOIR PLUS                       │
│  ┌──────────────────────────────────────────┐ │
│  │  ← Précédente  1  2  3  ...  8  Suivante →│ │
│  └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│  SECTION SOURCES (minimaliste)                │
│  "Données fournies par : OpenAgenda, ..."     │
├──────────────────────────────────────────────┤
│  FOOTER                                        │
└──────────────────────────────────────────────┘
```

### Composants utilisés
- Header, Breadcrumb, Footer
- FilterPanel (complet : catégories, date, gratuit, recherche)
- Map (variant: department)
- EventCard (variant: default, horizontal) — alterner selon viewport
- SourceBadge (sur chaque carte)
- Pagination (default) + infinite scroll (mobile)
- EmptyState (no-results)
- Alert (warning si source indisponible)
- Button (ghost pour reset, primary pour apply)

### Layout
- **Desktop (≥1024px)** : 2 colonnes (carte 45% / liste 55%), filtres en barre horizontale au-dessus
- **Tablet (768-1024px)** : Carte repliée en accordéon au-dessus de la liste, filtres en barre horizontale
- **Mobile (<768px)** : Carte en plein écran avec toggle (carte/liste), filtres en drawer depuis le bas, liste en full width

### Responsive stratégie
- **Mobile-first** : Par défaut, liste verticale avec carte en toggle
- **Breakpoint md (768px)** : Carte visible à côté de la liste (2 colonnes)
- **Toggle** : Bouton "Carte" / "Liste" sur mobile, les deux visibles sur desktop

### Filtres — Comportement
- **Catégories** : Checkboxes, max 8 visibles + "Toutes les catégories (15)"
- **Date** : Radio-group, défaut "Toutes les dates"
- **Gratuit** : Toggle, défaut off
- **Recherche** : Texte libre, debounce 300ms, filtre sur titre + description
- **Reset** : Réinitialise tous les filtres
- **URL** : Les filtres actifs sont reflétés dans l'URL (searchParams) pour permettre le partage

### Pagination
- **50 événements max par page** (site statique, contrainte build)
- **Desktop** : Pagination numérotée (1 2 3 ... 8)
- **Mobile** : Infinite scroll ou bouton "Voir plus"

### Accessibilité
- Région live pour le nombre de résultats filtrés
- Skip-link → directement à la liste d'événements
- Map fallback : liste des événements avec adresses
- Filtres : fieldset + legend pour chaque groupe

### SEO
- JSON-LD CollectionPage
- BreadcrumbList
- meta description: "{count} événements dans le {département} — Agenda local SortirIci"

---

## 3. Template : Fiche Événement (Event Detail)

### Objectif
Page détaillée d'un événement unique. Doit donner toutes les informations utiles (date, lieu, horaires, prix, description, source) en un coup d'œil, et inspirer confiance via le badge source.

### Composition

```
┌──────────────────────────────────────────────┐
│  HEADER (sticky)                              │
├──────────────────────────────────────────────┤
│  BREADCRUMB                                   │
│  Accueil > {Département} > {Catégorie} > {Titre}│
├──────────────────────────────────────────────┤
│  IMAGE HERO (optionnelle, fallback couleur)    │
│  ┌──────────────────────────────────────────┐ │
│  │                                          │ │
│  │  [Image 1200×600 ou dégradé bleu]        │ │
│  │                                          │ │
│  └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│  HEADER INFO                                  │
│  ┌──────────────────────────────────────────┐ │
│  │  {Catégorie} Chip  ·  {Gratuit} Badge    │ │
│  │  {Titre} (h1)                            │ │
│  │  SourceBadge : {sourceName}               │ │
│  └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│  INFO GRID (2 colonnes desktop)               │
│  ┌──────────────────┬───────────────────────┐│
│  │  📅 Date          │  🕐 Horaires          ││
│  │  {dateRange}       │  {timings}           ││
│  ├──────────────────┼───────────────────────┤│
│  │  📍 Lieu          │  💰 Tarif             ││
│  │  {nom du lieu}     │  {prix ou Gratuit}   ││
│  │  {adresse}        │                       ││
│  ├──────────────────┼───────────────────────┤│
│  │  🚪 Accès         │  👥 Public            ││
│  │  {accès}          │  {tous publics / ...} ││
│  └──────────────────┴───────────────────────┘│
├──────────────────────────────────────────────┤
│  DESCRIPTION                                  │
│  ┌──────────────────────────────────────────┐ │
│  │  {description longue}                     │ │
│  │  (max 72ch, line-height relaxed)          │ │
│  └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│  CARTE LIEU                                   │
│  ┌──────────────────────────────────────────┐ │
│  │  Mini-carte Leaflet (250px)               │ │
│  │  Un seul marqueur                         │ │
│  │  Click → Google Maps / OSM en nouvel onglet│ │
│  │  Adresse en texte en dessous              │ │
│  └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│  SOURCE SECTION                               │
│  ┌──────────────────────────────────────────┐ │
│  │  ℹ️ Source de cette information            │ │
│  │  Les données proviennent de {sourceName}  │ │
│  │  sous licence {licence}.                  │ │
│  │  → Voir la fiche source originale          │ │
│  │  SourceBadge (large)                       │ │
│  └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│  ÉVÉNEMENTS SIMILAIRES (optionnel)            │
│  ┌──────────────────────────────────────────┐ │
│  │  Vous aimerez aussi                       │ │
│  │  [Card] [Card] [Card] (horizontal compact)│ │
│  └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│  FOOTER                                        │
└──────────────────────────────────────────────┘
```

### Composants utilisés
- Header, Breadcrumb, Footer
- EventDetail (complet : header, infoGrid, description, sourceSection)
- Map (variant: detail)
- SourceBadge (variant selon source)
- EventCard (variant: compact — pour événements similaires)
- CategoryChip
- Badge (gratuit, annulé selon statut)

### Layout
- **Desktop (≥1024px)** : 1 colonne, image hero large, info grid 2 colonnes, texte 72ch max, carte à droite ou en ligne
- **Tablet (768-1024px)** : 1 colonne, info grid 2 colonnes, image hero réduite
- **Mobile (<768px)** : 1 colonne, info grid 1 colonne, image hero 200px, carte pleine largeur

### Image Hero
- **Source** : OpenAgenda (image de l'événement) ou fallback générique par catégorie
- **Dimensions** : 1200×600px (2:1 ratio)
- **Fallback** : Dégradé de couleur basé sur la catégorie
- **Alt text** : "{titre de l'événement}" — généré automatiquement

### Informations structurées (InfoGrid)
- 6 champs max, affichés en grille 2×3
- Chaque champ : icône Lucide + label + valeur
- **Date** : Plage de dates formatée (ex: "Du 15 au 18 mars 2025")
- **Horaires** : "14:00 - 18:00" ou "Voir les horaires sur la source"
- **Lieu** : Nom du lieu + adresse complète
- **Tarif** : "Gratuit" (badge vert) ou "5€ - 15€" ou "Non communiqué"
- **Accès** : Métro, bus, parking, PMR (si disponible)
- **Public** : "Tout public", "Enfants (3-12 ans)", "Adolescents", etc.

### Source Badge — Section Confiance
- Visible immédiatement sous le titre
- Badge coloré selon la source (OpenAgenda, Ministère, Mairie, Portail local)
- Texte explicatif : "Les données proviennent de {sourceName} sous licence {licence}"
- Lien vers la fiche originale (external link, new tab)
- Pas de tracking, pas de pixel

### Événements similaires
- **Critères** : Même catégorie OU même lieu/département
- **Limite** : 3 événements max
- **Affichage** : EventCard variant compact, horizontal
- **Optionnel** : Si < 2 événements similaires, ne pas afficher la section

### États
- **Loading** : Skeleton (image hero + titre + info grid skeleton)
- **Loaded** : Contenu complet avec animation fadeInUp
- **Not found** : EmptyState (no-events) + lien retour vers le hub département
- **Error** : Alert error + message explicatif

### SEO / JSON-LD
- JSON-LD Event (schema.org) complet :
  ```json
  {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": "{titre}",
    "description": "{descriptionCourte}",
    "startDate": "{dateDebut}",
    "endDate": "{dateFin}",
    "location": {
      "@type": "Place",
      "name": "{lieuNom}",
      "address": "{lieuAdresse}, {lieuCodePostal} {lieuCommune}"
    },
    "image": "{imageUrl}",
    "offers": {
      "@type": "Offer",
      "price": "{prix ou 0}",
      "priceCurrency": "EUR"
    },
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode"
  }
  ```
- BreadcrumbList
- meta description: "{titre} — {date} à {lieu} — Agenda local SortirIci"
- Open Graph : titre + image + description

### Performance
- Image hero : WebP, chargée avec priority (preload)
- Carte : lazy-load, Leaflet deferred
- Taille cible : < 150KB HTML + CSS (hors images)

---

## Règles transverses aux 3 templates

| Règle | Détail |
|-------|--------|
| **0 cookie / 0 tracking** | Aucun script analytics, aucun pixel, aucun tracker tiers |
| **Pas de login** | Aucun compte utilisateur, aucune authentification |
| **Pas de commentaires** | Pas de section commentaires, pas de notation |
| **Liens externes** | Tous les liens externes en `target="_blank" rel="noopener"` |
| **Images** | WebP, lazy loading natif, fallback couleur, alt text descriptif |
| **Accessibilité** | Skip-link, landmarks aria, focus visible, contrastes WCAG AA |
| **Responsive** | Mobile-first, breakpoints à 640/768/1024/1280px |
| **Données statiques** | Build-time, pas de runtime AJAX (sauf Leaflet tiles) |
| **URLs propres** | `/departement/45/`, `/evenement/oa-10244524/`, `/sources/` |
| **Alpine.js** | Uniquement pour interactions UIs (filtres, autocomplete, accordéons) |