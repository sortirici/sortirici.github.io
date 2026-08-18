# Guide Test Utilisateur — SortirIci

> **Protocole de test à 0 budget**
> 3 personnes, 3 questions, 15 minutes par test
> Design : observation silencieuse + entretien semi-dirigé

---

## 1. Objectif du test

**Valider que le design system et les templates répondent à la promesse de SortirIci :**
> *"Un guide bienveillant qui aide à trouver des événements locaux, en confiance."*

### Questions de recherche (ce qu'on veut apprendre)

1. **Trouvabilité** : L'utilisateur trouve-t-il un événement qui l'intéresse en < 30 secondes ?
2. **Confiance** : L'utilisateur fait-il confiance aux informations présentées ?
3. **Clarté** : Le design et le ton sont-ils perçus comme simples, utiles et non commerciaux ?

---

## 2. Profils des 3 testeurs

### Critères de recrutement (budget 0€)
- **Recrutement** : Entourage proche/personnel, groupe local (Facebook, WhatsApp de quartier)
- **3 profils distincts** couvrant les cibles :

| # | Profil | Âge | Compétence tech | Contexte de recherche | Pourquoi ce profil |
|---|--------|-----|-----------------|----------------------|-------------------|
| 1 | **La famille organisatrice** (Sophie, 34 ans) | 30-40 | Moyenne (smartphone + apps) | Cherche des sorties pour ses enfants le week-end | Cible principale : familles |
| 2 | **Le jeune actif curieux** (Thomas, 27 ans) | 25-35 | Haute (digital native) | Cherche des concerts et expos le soir après le travail | Cible secondaire : actifs 25-40 |
| 3 | **Le nouveau retraité** (Michel, 62 ans) | 55-70 | Faible à moyenne (ordinateur, pas d'apps) | Cherche des conférences, ateliers et sorties culturelles | Cible tertiaire : +55 ans, touristes |

### Script de recrutement (message type)
> *"Salut ! Je travaille sur un projet d'agenda local gratuit et sans pub. J'aurais besoin de 15 minutes de ton temps pour me donner ton avis sur le design. Pas de piège, c'est toi l'expert — c'est ton ressenti qui m'intéresse. Un café offert !"*

---

## 3. Protocole de test (15 min par personne)

### Matériel nécessaire
- Un ordinateur ou un smartphone (selon le profil)
- Le template à tester (maquette HTML statique ou page réelle)
- Un carnet / notes (pas d'enregistrement vidéo — 0 tracking, même en test)
- Aucun cookie, aucun outil d'analytics

### Déroulement

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1 : Accueil & contexte (2 min)                        │
│  Mettre à l'aise, expliquer le cadre, rassurer               │
├─────────────────────────────────────────────────────────────┤
│  Phase 2 : Scénarios (8 min — 3 questions/scénarios)         │
│  Observation silencieuse + questions ouvertes                 │
├─────────────────────────────────────────────────────────────┤
│  Phase 3 : Entretien libre (5 min)                            │
│  Questions de fond, ressenti général                          │
└─────────────────────────────────────────────────────────────┘
```

### Règles d'or pour l'animateur

1. **NE PAS aider** — Même si l'utilisateur galère, on observe
2. **NE PAS expliquer** — On ne donne pas d'indices, on note
3. **Toujours demander "Pourquoi ?"** — Après chaque action, "Pourquoi as-tu cliqué ici ?"
4. **Jamais "Tu as mal fait"** — C'est le design qui est testé, pas l'utilisateur
5. **Parler le moins possible** — L'utilisateur doit penser à voix haute

---

## 4. Les 3 questions/scénarios

### Scénario 1 : Trouver un événement (Page d'accueil → Hub Département)

**Question posée à l'utilisateur :**
> *"Tu habites dans le Loiret (45) et tu veux sortir ce week-end avec des amis. Tu cherches un concert ou un spectacle. Comment fais-tu ? Montre-moi."*

**Ce qu'on observe :**
| Critère | À observer | Note |
|---------|-----------|------|
| ✅ Réussi | L'utilisateur trouve la navigation vers le département, puis filtre par catégorie | |
| ⚠️ Hésitation | Cherche dans la barre de recherche, explore plusieurs options | |
| ❌ Bloqué | Ne trouve pas comment accéder aux événements du département | |

**Questions de suivi (si bloqué ou hésitation) :**
- *"Qu'est-ce que tu cherchais à faire ?"*
- *"Qu'est-ce qui t'a fait hésiter ?"*
- *"À quoi tu t'attendais en cliquant ici ?"*

**Ce qu'on valide :** Navigation intuitive, visibilité des CTA, compréhension du modèle "département"

---

### Scénario 2 : Filtrer et trouver une info précise (Hub Département)

**Question posée à l'utilisateur :**
> *"Tu vois la liste des événements. Tu veux trouver un événement gratuit pour enfants, ce week-end. Combien y en a-t-il ?"*

**Ce qu'on observe :**
| Critère | À observer | Note |
|---------|-----------|------|
| ✅ Réussi | Utilise les filtres (catégorie "enfants" + gratuit + date), trouve le résultat | |
| ⚠️ Hésitation | Cherche les filtres, ne voit pas l'option "enfants" ou "gratuit" | |
| ❌ Bloqué | Scrolle la liste sans utiliser les filtres, ou ne trouve pas les filtres | |

**Questions de suivi :**
- *"Comment as-tu fait pour trouver ces filtres ?"*
- *"Est-ce que les résultats sont clairs ?"*
- *"Manque-t-il quelque chose dans les informations affichées ?"*

**Ce qu'on valide :** Visibilité et compréhension des filtres, pertinence des infos dans l'EventCard

---

### Scénario 3 : Évaluer la confiance (Fiche Événement)

**Question posée à l'utilisateur :**
> *"Tu as trouvé un événement qui t'intéresse. Regarde cette page. Est-ce que tu fais confiance aux informations présentées ? Pourquoi ?"*

**Ce qu'on observe :**
| Critère | À observer | Note |
|---------|-----------|------|
| ✅ Confiance | Remarque le badge source, la licence, trouve l'info rassurante | |
| ⚠️ Neutre | Ne remarque pas la source, mais trouve l'info complète | |
| ❌ Méfiance | Trouve l'info incomplète, doute de la fiabilité, veut voir le site source | |

**Questions de suivi :**
- *"D'après toi, qui a écrit ces informations ?"*
- *"Est-ce que tu irais à cet événement sur la base de ces infos ?"*
- *"Que faudrait-il pour que tu aies encore plus confiance ?"*
- *"Est-ce que le badge 'Source' en bas te dit quelque chose ?"*

**Ce qu'on valide :** Compréhension du modèle "open data / source", perception de confiance, utilité du SourceBadge

---

## 5. Grille d'observation

### Feuille de notes (à imprimer / recopier)

```
─── TEST UTILISATEUR SORTIRICI ───

Testeur : [Nom/Prénom]     Profil : [Famille / Actif / Retraité]
Date : [Date]              Durée : [min]

─── SCÉNARIO 1 : Trouver un événement ───
Réussi / Hésitation / Bloqué
Temps : ___ secondes
Notes :
• 
• 

─── SCÉNARIO 2 : Filtrer et trouver une info précise ───
Réussi / Hésitation / Bloqué
Temps : ___ secondes
Notes :
• 
• 

─── SCÉNARIO 3 : Évaluer la confiance ───
Confiance / Neutre / Méfiance
Notes :
• 
• 

─── QUESTIONS LIBRES ───
1. "En trois mots, comment décrirais-tu ce site ?"
   → ___, ___, ___

2. "Qu'est-ce qui t'a le plus plu ?"
   → 

3. "Qu'est-ce qui t'a le moins plu ou manqué ?"
   → 

4. "Irais-tu sur ce site pour trouver des sorties ?"
   → Oui / Peut-être / Non
   Pourquoi ?
   → 
```

---

## 6. Analyse des résultats

### Méthode : Synthèse qualitative (pas de stats sur 3 personnes)

Après les 3 tests, compiler les résultats dans un tableau :

| Critère | Sophie (Famille) | Thomas (Actif) | Michel (Retraité) | Verdict |
|---------|-----------------|----------------|-------------------|---------|
| Scénario 1 | ✅/⚠️/❌ | ✅/⚠️/❌ | ✅/⚠️/❌ | Problème commun ? |
| Scénario 2 | ✅/⚠️/❌ | ✅/⚠️/❌ | ✅/⚠️/❌ | Problème commun ? |
| Scénario 3 | ✅/⚠️/❌ | ✅/⚠️/❌ | ✅/⚠️/❌ | Problème commun ? |
| Mots clés | | | | |
| Problème principal | | | | |
| Amélioration #1 | | | | |

### Priorisation des correctifs

| Priorité | Type | Action |
|----------|------|--------|
| **🔴 Bloquant** | 2+ utilisateurs bloqués sur le même point | Correction immédiate avant déploiement |
| **🟡 Important** | 1 utilisateur bloqué + hésitation générale | Planifier correction sprint suivant |
| **🟢 Amélioration** | Suggestion pertinente mais pas bloquante | Ajouter au backlog |

### Exemple de tableau de décision

| Problème identifié | Priorité | Décision |
|-------------------|----------|----------|
| Les filtres ne sont pas visibles sur mobile | 🔴 Bloquant | Ajouter un bouton "Filtres" fixe en bas |
| Le badge source n'est pas compris | 🟡 Important | Ajouter une infobulle "D'où viennent ces données" |
| La carte charge lentement | 🟢 Amélioration | Optimiser tiles Leaflet, lazy loading |

---

## 7. Checklist pré-test

Avant chaque session de test, vérifier :

- [ ] La page/test est bien accessible (URL ou fichier ouvert)
- [ ] Le navigateur est en mode navigation privée (pas de cookies, pas d'historique)
- [ ] L'outil de notes est prêt (pas d'enregistrement)
- [ ] Le chronomètre est prêt
- [ ] L'utilisateur a donné son accord verbal (pas de consentement écrit nécessaire — 0 donnée stockée)
- [ ] L'utilisateur est installé confortablement
- [ ] Rappel des règles : "Il n'y a pas de bonne ou mauvaise réponse, c'est le site qui est testé"

### Post-test

- [ ] Les notes sont complètes et lisibles
- [ ] Les points bloquants sont identifiés
- [ ] Les verbatims (citations) les plus marquants sont notés
- [ ] Aucune donnée personnelle n'a été conservée (prénom seulement, anonymisé dans le rapport)

---

## 8. Quick Reference — Les 3 questions en 1 phrase

| # | Question | Ce qu'on teste | Durée max |
|---|----------|---------------|-----------|
| 1 | *"Tu veux sortir ce week-end, trouve un concert dans le Loiret."* | Navigation, compréhension du modèle départements | 3 min |
| 2 | *"Trouve un événement gratuit pour enfants ce week-end."* | Filtres, clarté des infos | 3 min |
| 3 | *"Regarde cet événement. Tu lui fais confiance ? Pourquoi ?"* | Perception de confiance, compréhension sources | 4 min |

**Total phase scénarios : 10 minutes — 15 minutes avec le débrief**

---

*Document conçu pour un test à 0 budget — aucun outil payant, aucun tracking, aucun enregistrement. Le test utilisateur SortirIci respecte les valeurs SortirIci.*