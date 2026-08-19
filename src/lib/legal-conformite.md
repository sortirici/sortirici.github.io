# SortirIci — Conformité Juridique & Licences

> **Document d'audit complet :** Voir `audit-conformite.md` pour l'audit détaillé (40 sources, Mobilizon, OpenAgenda API, RGPD, droit sui generis).

## Sources de données & licences

Toutes les sources utilisées sont des API officielles de portails open data
français, avec des licences ouvertes autorisant la réutilisation, y compris
à des fins commerciales.

| Licence | Autorise réutilisation | Obligation de mention | Source |
|---------|----------------------|-----------------------|--------|
| **Licence Ouverte 2.0 (lov2)** | Oui (y compris commerciale) | Mention obligatoire + date maj | Etalab |
| **Licence Ouverte 1.0 (fr-lo)** | Oui (y compris commerciale) | Mention obligatoire | Etalab |
| **ODbL / ODC-ODbL** | Oui (y compris commerciale) | Mention + partage à l'identique | Open Data Commons |

## Sources vérifiées

| Source | Licence | Type | Statut |
|--------|---------|------|--------|
| OpenAgenda Orléans Métropole | lov2 | API JSON | ✅ Vérifié |
| OpenAgenda Loiret (Département) | fr-lo | API JSON | ✅ Vérifié |
| Clermont-Ferrand | lov2 | API JSON | ✅ Vérifié |
| Guérande (CapAtlantique) | lov2 | API JSON | ✅ Vérifié |
| Meudon | fr-lo | API JSON | ✅ Vérifié |
| La Baule (CapAtlantique) | lov2 | API JSON | ✅ Vérifié |
| Nantes (Bibliothèque) | lov2 | API JSON | ✅ Vérifié |
| Ministère Culture (Festivals) | lov2 | API JSON | ✅ Vérifié |
| Bordeaux Métropole | fr-lo | API JSON | ✅ Vérifié |
| Toulouse Métropole | lov2 | API JSON | ✅ Vérifié |
| Vendée Expansion (Tourinsoft) | lov2 | Flux XML | ✅ Vérifié |
| Martigues | lov2 | API OpenAgenda | ✅ Vérifié |
| Grenoble Culturel | odc-odbl | CSV | ✅ Vérifié |
| Nice Côte d'Azur | lov2 | API JSON | ✅ Vérifié |
| Paris (Que Faire à Paris) | odc-odbl | API JSON | ✅ Vérifié |
| Calvados | lov2 | API OpenAgenda | ✅ Vérifié |
| Rouen Métropole | lov2 | API OpenAgenda | ✅ Vérifié |
| ... (39 sources au total, voir audit-conformite.md) | | | ✅ |

## Procédure d'anonymisation (appliquée dans normalize.js)

Les champs suivants sont SUPPRIMÉS du pipeline :

| Champ | Source | Risque RGPD | Action |
|-------|--------|-------------|--------|
| `contributorEmail` | OpenAgenda | Donnée personnelle | Supprimé |
| `contributorContactNumber` | OpenAgenda | Donnée personnelle | Supprimé |
| `contributorContactName` | OpenAgenda | Donnée personnelle | Supprimé |
| `contributorContactPosition` | OpenAgenda | Donnée personnelle | Supprimé |
| `email` (organisateur) | CSV ministères | Donnée personnelle | Supprimé |
| `telephone` (organisateur) | CSV ministères | Donnée personnelle | Supprimé |
| `emailOrganisateur` | Portails locaux | Donnée personnelle | Supprimé |
| `telephoneOrganisateur` | Portails locaux | Donnée personnelle | Supprimé |
| `organisateur` (nom personne) | Portails locaux | Donnée personnelle | Anonymisé |
| `contact_phone` | Paris (ODbL) | Donnée personnelle | Exclu du schéma |
| `contact_mail` | Paris (ODbL) | Donnée personnelle | Exclu du schéma |

## Conformité RGPD

| Exigence RGPD | Statut | Justification |
|---------------|--------|---------------|
| Consentement cookies | ✅ Non applicable | 0 cookie, 0 tracker, 0 analytics |
| Droit à l'oubli | ✅ Auto | Pas de données utilisateur stockées |
| Droit d'accès | ✅ Auto | Pas de données utilisateur traitées |
| Registre traitements | ✅ Documenté | Ce document |
| DPIA | ✅ Non requis | Traitement sans risque (données publiques, pas de profiling) |
| DPO | ✅ Non requis | < 250 personnes concernées (0 personnes concernées) |
| Mentions légales | ✅ Prévues | Page /mentions/ |
| Anonymisation | ✅ Implémentée | Dans normalize.js |
| Sécurité données | ✅ Intégrée | Site statique, pas de formulaire, pas de collecte |

## Droit des bases de données (sui generis)

Le droit sui generis (Directive 96/9/CE, art. L.341-1 CPI) protège les investissements
substantiels dans la constitution d'une base de données. Il n'est pas un obstacle pour
SortirIci car :

- La **Licence Ouverte 2.0/1.0** autorise explicitement l'extraction et la réutilisation
- L'**ODbL** couvre explicitement l'extraction substantielle
- Les données sont extraites partiellement par source (aucune copie substantielle d'une base unique)
- Les données agrégées (39 sources) constituent une compilation hétérogène

## Mentions légales obligatoires (page /mentions/)

- [ ] Identité de l'éditeur (Cyprien, contact GitHub)
- [ ] Hébergeur (GitHub Pages, San Francisco, USA)
- [ ] Propriété intellectuelle (données = licences ouvertes, code = open source MIT)
- [ ] Licences sources (liste complète avec hyperliens)
- [ ] Limitation de responsabilité (informations indicatives)
- [ ] Procédure de retrait (contact GitHub issues)
- [ ] Absence de cookies (certification)
- [ ] Accessibilité (non conforme, en cours d'amélioration)