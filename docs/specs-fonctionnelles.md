# Spécifications Fonctionnelles — Mister Footcoach

**Version :** 1.2  
**Date :** 05/05/2026  
**Statut :** Brouillon — en attente de validation  
**Auteur :** Product Owner / Analyste Fonctionnel  
**Application :** Mister Footcoach — PWA de gestion d'équipes jeunes de football

**Historique des versions**

| Version | Date       | Modifications                                                                                                                                                       |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 05/05/2026 | Version initiale                                                                                                                                                    |
| 1.1     | 05/05/2026 | Ajout §4.6–4.7 (indisponibilités, blessures), §7.5 (mode match live), §8.5–8.6 (contenu séance, bibliothèque exercices), §12 (tournois), §13 (calendrier externe)   |
| 1.2     | 05/05/2026 | Ajout §14 (logistique des déplacements), §15 (sondages de présence) ; mise à jour matrice permissions, modèle de données, user stories, découpage et points ouverts |

---

## Table des matières

1. [Contexte et objectifs](#1-contexte-et-objectifs)
2. [Périmètre](#2-périmètre)
3. [Rôles et permissions](#3-rôles-et-permissions)
4. [Gestion des joueurs](#4-gestion-des-joueurs)
5. [Contacts et filiation](#5-contacts-et-filiation)
6. [Équipes et saisons](#6-équipes-et-saisons)
7. [Matchs et calendrier](#7-matchs-et-calendrier)
8. [Entraînements](#8-entraînements)
9. [Assiduité](#9-assiduité)
10. [Statistiques](#10-statistiques)
11. [Simulation de composition](#11-simulation-de-composition)
12. [Tournois](#12-tournois)
13. [Intégration calendrier externe](#13-intégration-calendrier-externe)
14. [Logistique des déplacements](#14-logistique-des-déplacements)
15. [Sondages de présence](#15-sondages-de-présence)
16. [Notifications in-app](#16-notifications-in-app)
17. [Intégration fédération](#17-intégration-fédération)
18. [RGPD et données de mineurs](#18-rgpd-et-données-de-mineurs)
19. [Modèle de données conceptuel](#19-modèle-de-données-conceptuel)
20. [User Stories](#20-user-stories)
21. [Découpage MVP / V1 / Évolutions](#21-découpage-mvp--v1--évolutions)
22. [Points ouverts](#22-points-ouverts)

---

## 1. Contexte et objectifs

### 1.1 Contexte

Un club de football amateur gère une ou plusieurs **catégories jeunes** (format foot à 8, ex. U11, U13). Chaque catégorie regroupe plusieurs équipes (ex. U13 A, U13 B). Les coachs, les dirigeants et les familles manquent d'un outil centralisé adapté à leurs usages mobiles : gestion des effectifs, composition des équipes, suivi des entraînements, communication.

### 1.2 Objectifs principaux

| Objectif                        | Description                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------ |
| Fiabiliser les données          | Centraliser joueurs, contacts, calendriers dans une source unique              |
| Faciliter le travail des coachs | Réduire la charge administrative, simplifier la composition et le suivi        |
| Visibilité parents              | Donner un accès en lecture aux informations utiles aux familles                |
| Conformité RGPD                 | Garantir la protection des données de mineurs avec traçabilité du consentement |
| Base durable                    | Fournir une architecture évolutive adaptée à la croissance du club             |

### 1.3 Contraintes générales

- Application **PWA** (Progressive Web App) : mobile-first, installable, fonctionnement offline partiel
- Utilisateurs principaux sur **smartphone** (iOS / Android)
- Données de **mineurs** : exigences RGPD renforcées
- Format de jeu : **foot à 8** (8 joueurs sur le terrain, dont 1 gardien)
- Multi-équipes : une catégorie peut contenir **N équipes**

---

## 2. Périmètre

### 2.1 Dans le périmètre

- Gestion du club, des catégories, des équipes et des saisons
- Gestion des joueurs, de leurs postes et de leurs indisponibilités
- Suivi des blessures (données sportives uniquement, non médicales)
- Gestion des contacts légaux et de la filiation
- Gestion des matchs et du calendrier, dont mode match en temps réel
- Gestion des entraînements, de leur contenu et d'une bibliothèque d'exercices
- Gestion des tournois (en tant que participant ou organisateur)
- Suivi de l'assiduité
- Statistiques sportives
- Simulation de compositions
- Logistique des déplacements (point de RDV, covoiturage, GPS)
- Sondages de présence avec distinction intention joueur / confirmation parent
- Notifications in-app
- Intégration calendrier externe (flux iCal)
- Intégration fédération (calendrier et résultats)
- Gestion des rôles et des droits
- Conformité RGPD

### 2.2 Hors périmètre (v1)

- Paiement des licences ou des cotisations
- Gestion comptable du club
- Gestion du matériel
- Données médicales sensibles (ordonnances, diagnostics)
- Vidéo ou analyse tactique avancée
- Application mobile native (iOS / Android store)
- Compte utilisateur pour les joueurs mineurs (V2)

---

## 3. Rôles et permissions

### 3.1 Définition des rôles

#### Admin

Responsable du club ou dirigeant habilité.

- Gestion complète du club, des catégories, des équipes
- Gestion des utilisateurs et affectation des rôles
- Accès à toutes les données, toutes équipes confondues
- Paramétrage global : saisons, référentiels, intégration fédération, notifications, bibliothèque d'exercices
- Accès aux données RGPD (export, suppression sur demande)

#### Coach

Entraîneur responsable d'une ou plusieurs équipes.

- Gestion des joueurs de ses équipes (données sportives, indisponibilités, blessures)
- Création et modification : entraînements (avec contenu), matchs, compositions, tournois, sondages
- Saisie du mode match en temps réel
- Gestion de la logistique des déplacements
- Saisie et consultation de l'assiduité
- Accès aux statistiques sportives de ses équipes
- Lecture des coordonnées des contacts légaux (pas de modification)
- Gestion de la bibliothèque d'exercices du club
- Pas d'accès aux équipes dont il n'est pas responsable

#### Parent / Contact

Représentant légal d'un ou plusieurs joueurs.

- Consultation du calendrier de son ou ses enfants (matchs, entraînements, tournois)
- Consultation des lieux, horaires, statuts et score en temps réel
- Déclaration d'indisponibilité de son enfant (V1)
- Réponse aux sondages de présence — sa réponse est la **valeur officielle**
- Proposition de covoiturage et consultation de la logistique de déplacement
- Réception des notifications le concernant
- Abonnement au flux iCal de son enfant
- Aucun droit de création, modification ou suppression de données sportives
- Accès strictement limité aux informations de ses enfants

### 3.2 Cumul de rôles

Un utilisateur peut cumuler plusieurs rôles. Exemples :

- Un **coach** peut également être **parent** d'un joueur d'une autre équipe
- Un **admin** peut cumuler le rôle de **coach**
- Dans ce cas, l'utilisateur bénéficie de l'**union des droits** de ses rôles

### 3.3 Matrice rôles / permissions

| Fonctionnalité                       | Admin |       Coach        |           Parent            |
| ------------------------------------ | :---: | :----------------: | :-------------------------: |
| Gérer le club / les équipes          |  ✅   |         ❌         |             ❌              |
| Gérer les utilisateurs               |  ✅   |         ❌         |             ❌              |
| Voir toutes les équipes              |  ✅   |         ❌         |             ❌              |
| Gérer ses équipes                    |  ✅   |         ✅         |             ❌              |
| Créer / modifier un joueur           |  ✅   |  ✅ (ses équipes)  |             ❌              |
| Consulter un joueur                  |  ✅   |  ✅ (ses équipes)  |      ✅ (ses enfants)       |
| Déclarer une indisponibilité         |  ✅   |  ✅ (ses équipes)  |      ✅ (ses enfants)       |
| Consulter les indisponibilités       |  ✅   |  ✅ (ses équipes)  |      ✅ (ses enfants)       |
| Créer / modifier un suivi blessure   |  ✅   |  ✅ (ses équipes)  |             ❌              |
| Consulter un suivi blessure          |  ✅   |  ✅ (ses équipes)  |             ❌              |
| Voir les contacts légaux             |  ✅   |    ✅ (lecture)    |       ✅ (les siens)        |
| Modifier les contacts légaux         |  ✅   |         ❌         |             ❌              |
| Créer / modifier un match            |  ✅   |  ✅ (ses équipes)  |             ❌              |
| Consulter un match                   |  ✅   |         ✅         |      ✅ (ses enfants)       |
| Mode match en temps réel             |  ✅   |  ✅ (ses équipes)  |             ❌              |
| Consulter le score live              |  ✅   |         ✅         |      ✅ (ses enfants)       |
| Créer / modifier un entraînement     |  ✅   |  ✅ (ses équipes)  |             ❌              |
| Gérer le contenu d'une séance        |  ✅   |  ✅ (ses équipes)  |             ❌              |
| Consulter un entraînement            |  ✅   |         ✅         |      ✅ (ses enfants)       |
| Gérer la bibliothèque d'exercices    |  ✅   | ✅ (ses exercices) |             ❌              |
| Saisir l'assiduité                   |  ✅   |  ✅ (ses équipes)  |             ❌              |
| Consulter l'assiduité                |  ✅   |  ✅ (ses équipes)  |      ✅ (ses enfants)       |
| Gérer les compositions               |  ✅   |  ✅ (ses équipes)  |             ❌              |
| Accéder aux statistiques             |  ✅   |  ✅ (ses équipes)  |      ✅ (ses enfants)       |
| Gérer un tournoi                     |  ✅   |  ✅ (ses équipes)  |             ❌              |
| Consulter un tournoi                 |  ✅   |         ✅         |      ✅ (ses enfants)       |
| Gérer la logistique déplacement      |  ✅   |  ✅ (ses équipes)  |             ❌              |
| Proposer un covoiturage              |  ✅   |         ✅         |             ✅              |
| Consulter la logistique              |  ✅   |         ✅         |      ✅ (ses enfants)       |
| Créer un sondage                     |  ✅   |  ✅ (ses équipes)  |             ❌              |
| Consulter les résultats d'un sondage |  ✅   |  ✅ (ses équipes)  |      ✅ (ses réponses)      |
| Répondre à un sondage (officiel)     |  ✅   |         ✅         |    ✅ (pour ses enfants)    |
| Exprimer une intention joueur        |   —   |         —          | ✅ (au nom de l'enfant, V1) |
| Abonnement flux iCal                 |  ✅   |         ✅         |       ✅ (personnel)        |
| Paramétrage global                   |  ✅   |         ❌         |             ❌              |
| Gérer les notifications              |  ✅   |  ✅ (ses équipes)  |    ✅ (ses préférences)     |
| Export RGPD                          |  ✅   |         ❌         |      ✅ (ses données)       |

### 3.4 Règles de gestion des rôles

- **RG-ROLE-01** : Un utilisateur doit avoir au moins un rôle.
- **RG-ROLE-02** : Seul un admin peut attribuer ou retirer le rôle admin.
- **RG-ROLE-03** : Un coach ne peut accéder qu'aux équipes explicitement affectées à son compte.
- **RG-ROLE-04** : Un parent n'accède qu'aux informations des joueurs auxquels il est rattaché via un lien de filiation validé.
- **RG-ROLE-05** : La suppression d'un utilisateur ne supprime pas les données sportives associées.

---

## 4. Gestion des joueurs

### 4.1 Données d'un joueur

| Champ                 | Type                | Obligatoire | Règles                                |
| --------------------- | ------------------- | :---------: | ------------------------------------- |
| Identifiant           | UUID                |     ✅      | Généré automatiquement                |
| Prénom                | Texte               |     ✅      | 1–50 caractères                       |
| Nom                   | Texte               |     ✅      | 1–50 caractères                       |
| Date de naissance     | Date                |     ✅      | Cohérente avec la catégorie d'âge     |
| Équipe principale     | Référence équipe    |     ✅      | Une seule équipe principale           |
| Équipe secondaire     | Référence équipe    |     ❌      | Maximum une équipe secondaire         |
| Numéro de maillot     | Entier              |     ❌      | Unique au sein de l'équipe principale |
| Poste de prédilection | Enum Position       |     ✅      | Voir référentiel des postes           |
| Appétences par poste  | Map Position → Note |     ❌      | Note de 1 à 5 par poste               |
| Photo                 | URL ou binaire      |     ❌      | Format image standard                 |
| Actif                 | Booléen             |     ✅      | Par défaut : vrai                     |

### 4.2 Référentiel des postes (foot à 8)

| Code | Libellé             | Catégorie |
| ---- | ------------------- | --------- |
| GK   | Gardien de But      | Gardien   |
| DD   | Défenseur Droit     | Défense   |
| DC   | Défenseur Central   | Défense   |
| DG   | Défenseur Gauche    | Défense   |
| MD   | Milieu Défensif     | Milieu    |
| MC   | Milieu Central      | Milieu    |
| MO   | Meneur de Jeu       | Milieu    |
| ATD  | Ailier Droit        | Attaque   |
| ATG  | Ailier Gauche       | Attaque   |
| AT   | Attaquant de Pointe | Attaque   |

### 4.3 Appétences par poste

- Note de **1 à 5** (1 = peu à l'aise, 5 = excellent)
- Renseignée par le coach
- Utilisée par le simulateur de composition pour les suggestions

### 4.4 Équipes multiples

- Un joueur a **une équipe principale obligatoire**.
- Il peut avoir **une équipe secondaire** (ex. surclassement ponctuel).
- **RG-JOUEUR-01** : L'équipe secondaire doit appartenir à la même catégorie ou à une catégorie supérieure.
- **RG-JOUEUR-02** : Le joueur apparaît dans les effectifs des deux équipes, mais son équipe principale est celle retenue pour les statistiques agrégées.
- **RG-JOUEUR-03** : La suppression d'un joueur est une **désactivation logique** (archivage). Les données historiques sont conservées.

### 4.5 Historique des postes

Chaque poste joué est enregistré avec la granularité suivante :

| Champ         | Description                                                                             |
| ------------- | --------------------------------------------------------------------------------------- |
| Match         | Référence au match                                                                      |
| Date du match | Pour faciliter les requêtes temporelles                                                 |
| Adversaire    | Pour l'affichage                                                                        |
| Période       | `1ère mi-temps`, `2ème mi-temps`, `complet`, `remplaçant entrant`, `remplaçant sortant` |
| Poste joué    | Code du poste                                                                           |
| Minute        | Entier optionnel (alimenté automatiquement par le mode match live)                      |

> **Point ouvert PO-01** : La granularité à la minute est-elle requise dès le MVP ? Elle est naturellement produite par le mode match live, mais la saisie manuelle est plus complexe.

### 4.6 Indisponibilités déclarées

#### 4.6.1 Données d'une indisponibilité

| Champ              | Type           | Obligatoire | Règles                                                                |
| ------------------ | -------------- | :---------: | --------------------------------------------------------------------- |
| Identifiant        | UUID           |     ✅      |                                                                       |
| Joueur             | Référence      |     ✅      |                                                                       |
| Date de début      | Date           |     ✅      |                                                                       |
| Date de fin        | Date           |     ❌      | Si absente : indisponibilité ouverte jusqu'à clôture manuelle         |
| Motif              | Enum           |     ✅      | `blessure`, `maladie`, `vacances`, `suspension`, `personnel`, `autre` |
| Déclaré par        | Référence User |     ✅      | Coach ou parent (V1)                                                  |
| Note               | Texte          |     ❌      | Visible uniquement par le coach et l'admin                            |
| Référence blessure | Référence      |     ❌      | Lien vers un suivi de blessure si motif = `blessure`                  |

#### 4.6.2 Règles de gestion

- **RG-INDISPO-01** : Un joueur indisponible est automatiquement grisé dans le simulateur de composition pour tous les matchs dont la date est incluse dans sa période d'indisponibilité.
- **RG-INDISPO-02** : Un coach peut créer, modifier et clôturer une indisponibilité pour tout joueur de ses équipes. Un parent peut déclarer une indisponibilité pour son enfant (V1).
- **RG-INDISPO-03** : Plusieurs indisponibilités simultanées sont autorisées (ex. blessure + suspension qui se chevauchent).
- **RG-INDISPO-04** : Une indisponibilité sans date de fin doit être clôturée manuellement ou via la mise à jour du statut de blessure associée.
- **RG-INDISPO-05** : La liste des indisponibilités actives est accessible depuis la fiche joueur et depuis la vue d'effectif de l'équipe.

### 4.7 Suivi des blessures

> Les informations saisies ici sont des **données sportives utiles au coach** (disponibilité, précautions de reprise), non des données médicales sensibles. Aucune donnée clinique, ordonnance ou prescription médicale ne doit être enregistrée.

#### 4.7.1 Données d'un suivi de blessure

| Champ                     | Type        | Obligatoire | Règles                                                                            |
| ------------------------- | ----------- | :---------: | --------------------------------------------------------------------------------- |
| Identifiant               | UUID        |     ✅      |                                                                                   |
| Joueur                    | Référence   |     ✅      |                                                                                   |
| Zone anatomique           | Enum        |     ✅      | `cheville`, `genou`, `cuisse`, `ischio-jambier`, `dos`, `épaule`, `tête`, `autre` |
| Nature                    | Texte libre |     ✅      | Ex. "entorse", "élongation" — 100 caractères max                                  |
| Date de survenue          | Date        |     ✅      |                                                                                   |
| Date de reprise estimée   | Date        |     ❌      | Peut évoluer                                                                      |
| Date de reprise effective | Date        |     ❌      | Renseignée lors du passage au statut `apte`                                       |
| Statut                    | Enum        |     ✅      | `en rééducation`, `reprise progressive`, `apte`                                   |
| Note coach                | Texte       |     ❌      | Invisible pour le parent — précautions, contexte sportif                          |

#### 4.7.2 Règles de gestion

- **RG-BLESS-01** : La création d'un suivi de blessure crée automatiquement une indisponibilité liée avec motif `blessure` et la même date de début.
- **RG-BLESS-02** : Le passage au statut `apte` clôt automatiquement l'indisponibilité liée.
- **RG-BLESS-03** : Le statut `reprise progressive` maintient l'indisponibilité active mais affiche un indicateur distinct (⚠️) dans le simulateur — le coach peut aligner le joueur manuellement en connaissance de cause.
- **RG-BLESS-04** : Les informations du suivi de blessure sont visibles uniquement par le **coach** et l'**admin**. Le parent voit uniquement l'indisponibilité (motif = `blessure`, sans détail).
- **RG-BLESS-05** : Un joueur peut avoir plusieurs suivis de blessure archivés. Seul le plus récent avec statut non-`apte` est considéré actif.

---

## 5. Contacts et filiation

### 5.1 Données d'un contact

| Champ                     | Type                | Obligatoire | Règles                                           |
| ------------------------- | ------------------- | :---------: | ------------------------------------------------ |
| Identifiant               | UUID                |     ✅      | Généré automatiquement                           |
| Prénom                    | Texte               |     ✅      |                                                  |
| Nom                       | Texte               |     ✅      |                                                  |
| Téléphone                 | Texte               |     ✅      | Format FR ou international                       |
| Email                     | Texte               |     ✅      | Format email valide                              |
| Type de relation          | Enum                |     ✅      | père, mère, beau-père, belle-mère, tuteur, autre |
| Joueurs rattachés         | Liste de références |     ✅      | Au moins un                                      |
| Utilisateur lié           | Référence User      |     ❌      | Si le contact a un compte                        |
| Date de consentement RGPD | Date                |     ❌      | Requise pour l'activation du compte              |

### 5.2 Règles de gestion

- **RG-CONTACT-01** : Un même contact (même email) peut être rattaché à plusieurs joueurs (fratrie).
- **RG-CONTACT-02** : Un joueur peut avoir plusieurs contacts de types différents.
- **RG-CONTACT-03** : La suppression d'un contact n'est possible que si aucun autre joueur actif n'y est rattaché, **ou** si le contact est explicitement détaché de tous les joueurs.
- **RG-CONTACT-04** : Si un contact est également utilisateur (rôle parent), la suppression du lien de filiation entraîne la perte d'accès aux données du joueur concerné.
- **RG-CONTACT-05** : La modification des coordonnées d'un contact partagé (plusieurs enfants) est globale et s'applique à tous les liens.

### 5.3 Consentement RGPD

- Le consentement est **explicite** et **traçable** (date + version du document).
- Sans consentement, le compte parent peut être créé mais reste **inactif**.
- Le recueil du consentement se fait via un formulaire dédié in-app.

---

## 6. Équipes et saisons

### 6.1 Structure

```
Club
 └─ Catégorie (ex. U13)
     └─ Saison (ex. 2025-2026)
         └─ Équipe (ex. U13 A, U13 B)
             └─ Joueurs
```

### 6.2 Données d'une équipe

| Champ           | Type           | Obligatoire | Règles            |
| --------------- | -------------- | :---------: | ----------------- |
| Identifiant     | UUID           |     ✅      |                   |
| Nom             | Texte          |     ✅      | Ex. "U13 A"       |
| Catégorie       | Texte          |     ✅      | Ex. "U13", "U11"  |
| Saison          | Référence      |     ✅      |                   |
| Coach principal | Référence User |     ✅      | Rôle coach requis |
| Coach adjoint   | Référence User |     ❌      |                   |
| Couleur         | Hex            |     ❌      | Pour affichage    |

### 6.3 Saisons

- Une seule saison est **active** à la fois.
- La création d'une nouvelle saison archive la précédente.
- Les données (matchs, entraînements, compositions) sont **rattachées à une saison**.

---

## 7. Matchs et calendrier

### 7.1 Données d'un match

| Champ                | Type      | Obligatoire | Règles                                                  |
| -------------------- | --------- | :---------: | ------------------------------------------------------- |
| Identifiant          | UUID      |     ✅      |                                                         |
| Équipe               | Référence |     ✅      |                                                         |
| Saison               | Référence |     ✅      |                                                         |
| Tournoi              | Référence |     ❌      | Si le match appartient à un tournoi                     |
| Date                 | Date      |     ✅      |                                                         |
| Heure                | Heure     |     ✅      | Format HH:MM                                            |
| Lieu / terrain       | Texte     |     ✅      | Nom du terrain                                          |
| Adresse              | Texte     |     ✅      | Pour navigation GPS                                     |
| Domicile / Extérieur | Booléen   |     ✅      |                                                         |
| Adversaire           | Texte     |     ✅      |                                                         |
| Statut               | Enum      |     ✅      | `prévisionnel`, `engagé`, `saison`, `tournoi`, `annulé` |
| Phase                | Texte     |     ✅      | Ex. "Poule A", "Phase aller", "Finale"                  |
| Score domicile       | Entier    |     ❌      | Renseigné en live ou après le match                     |
| Score extérieur      | Entier    |     ❌      |                                                         |
| Note                 | Texte     |     ❌      | Compte-rendu libre                                      |
| Mode live actif      | Booléen   |     ✅      | Par défaut : faux                                       |

### 7.2 Statuts des matchs

| Statut         | Description                                         |
| -------------- | --------------------------------------------------- |
| `prévisionnel` | Non confirmé, date et heure susceptibles de changer |
| `engagé`       | Confirmé, équipes et lieu définis                   |
| `saison`       | Match officiel de championnat validé                |
| `tournoi`      | Match dans le cadre d'un tournoi                    |
| `annulé`       | Annulé, conservé dans l'historique                  |

### 7.3 Règles de gestion

- **RG-MATCH-01** : Un match ne peut pas être supprimé s'il a des données d'assiduité, une composition ou des événements live associés. Il peut être annulé.
- **RG-MATCH-02** : La saisie manuelle du score n'est possible que pour les matchs dont la date est passée et dont le mode live n'est pas actif.
- **RG-MATCH-03** : Tout changement de date, heure ou lieu d'un match déclenche une notification (voir §16).

### 7.4 Calendrier multi-vues

| Vue        | Rôle         | Description                                   |
| ---------- | ------------ | --------------------------------------------- |
| Par équipe | Coach, Admin | Tous les matchs et entraînements d'une équipe |
| Par joueur | Coach, Admin | Tous les événements d'un joueur spécifique    |
| Personnel  | Parent       | Événements des enfants rattachés au compte    |

### 7.5 Mode match en temps réel

#### 7.5.1 Objectif

Permettre au coach de saisir les événements d'un match depuis le bord du terrain (smartphone, offline) afin d'alimenter automatiquement le score, l'historique des postes et les indisponibilités potentielles, sans ressaisie après le match.

#### 7.5.2 Données d'un événement de match

| Champ             | Type      | Obligatoire | Règles                                                    |
| ----------------- | --------- | :---------: | --------------------------------------------------------- |
| Identifiant       | UUID      |     ✅      |                                                           |
| Match             | Référence |     ✅      |                                                           |
| Type              | Enum      |     ✅      | Voir tableau ci-dessous                                   |
| Minute            | Entier    |     ❌      | 1–90+, renseigné par le chronomètre ou saisi manuellement |
| Joueur principal  | Référence |     ❌      | Buteur, joueur concerné par l'événement                   |
| Joueur secondaire | Référence |     ❌      | Passeur décisif, joueur sortant lors d'un remplacement    |
| Note              | Texte     |     ❌      | Commentaire libre                                         |
| Horodatage        | DateTime  |     ✅      | Généré automatiquement                                    |

#### 7.5.3 Types d'événements

| Code             | Libellé                   | Joueur principal             | Joueur secondaire |
| ---------------- | ------------------------- | ---------------------------- | ----------------- |
| `but`            | But marqué                | Buteur                       | Passeur (opt.)    |
| `but_csc`        | But contre son camp       | Joueur adverse (texte libre) | —                 |
| `carton_jaune`   | Carton jaune              | Joueur averti                | —                 |
| `carton_rouge`   | Carton rouge              | Joueur expulsé               | —                 |
| `remplacement`   | Remplacement              | Joueur entrant               | Joueur sortant    |
| `blessure_live`  | Blessure pendant le match | Joueur blessé                | —                 |
| `arret_mi_temps` | Fin de mi-temps           | —                            | —                 |

#### 7.5.4 Fonctionnalités de l'interface live

- **Chronomètre** par mi-temps : démarrage, pause, reset.
- **Boutons d'action rapide** : But ⚽ | Changement ↔ | Carton 🟨 | Blessure 🩹
- **Score en temps réel** affiché en bannière permanente.
- **Journal des événements** : liste chronologique modifiable jusqu'à la clôture.
- **Récapitulatif de fin de match** : résumé à valider avant clôture.

#### 7.5.5 Conséquences automatiques

| Événement        | Conséquence automatique                                     |
| ---------------- | ----------------------------------------------------------- |
| But              | Score mis à jour                                            |
| Remplacement     | Historique des postes alimenté pour les deux joueurs        |
| Blessure_live    | Proposition de créer un suivi de blessure + indisponibilité |
| Clôture du match | Proposition de saisir l'assiduité                           |

#### 7.5.6 Règles de gestion

- **RG-LIVE-01** : Le mode live ne peut être activé qu'à J-0 du match (fenêtre de tolérance ±2h).
- **RG-LIVE-02** : Le mode live fonctionne en **offline**. Synchronisation dès le rétablissement de la connexion.
- **RG-LIVE-03** : Si le mode live est actif, la saisie manuelle du score est désactivée.
- **RG-LIVE-04** : La clôture depuis le mode live est irréversible et verrouille le journal.
- **RG-LIVE-05** : Le score en temps réel est visible en lecture par les parents connectés.

---

## 8. Entraînements

### 8.1 Données d'un entraînement

| Champ               | Type      | Obligatoire | Règles                                   |
| ------------------- | --------- | :---------: | ---------------------------------------- |
| Identifiant         | UUID      |     ✅      |                                          |
| Équipe              | Référence |     ✅      |                                          |
| Date                | Date      |     ✅      |                                          |
| Heure de début      | Heure     |     ✅      | Format HH:MM                             |
| Durée               | Entier    |     ✅      | En minutes                               |
| Type                | Enum      |     ✅      | `régulier`, `exceptionnel`               |
| Annulé              | Booléen   |     ✅      | Par défaut : faux                        |
| Thème               | Texte     |     ❌      | Ex. "Pressing haut", "Jeu en transition" |
| Note / compte-rendu | Texte     |     ❌      | Programme ou compte-rendu post-séance    |

### 8.2 Récurrence

- Un entraînement régulier peut être créé avec une **règle de récurrence**.
- Chaque occurrence est une entité indépendante modifiable séparément.
- La modification de la série (occurrences futures) est possible.

### 8.3 Cas particuliers

| Cas                       | Comportement                                                    |
| ------------------------- | --------------------------------------------------------------- |
| Décalage horaire          | Modification de l'heure + notification                          |
| Entraînement exceptionnel | Création ponctuelle avec type `exceptionnel`                    |
| Annulation                | `annulé = vrai` + notification + conservation dans l'historique |

### 8.4 Règles de gestion

- **RG-TRAIN-01** : Un entraînement annulé n'est pas supprimé.
- **RG-TRAIN-02** : L'assiduité ne peut être saisie que pour les entraînements non annulés.
- **RG-TRAIN-03** : Toute modification d'un entraînement futur déclenche une notification aux parents.

### 8.5 Contenu d'une séance

#### 8.5.1 Données d'un bloc de séance

| Champ        | Type                   | Obligatoire | Règles                       |
| ------------ | ---------------------- | :---------: | ---------------------------- |
| Ordre        | Entier                 |     ✅      | Position dans le déroulement |
| Durée        | Entier                 |     ✅      | En minutes                   |
| Titre        | Texte                  |     ✅      |                              |
| Description  | Texte                  |     ❌      | Consignes, variantes         |
| Exercice lié | Référence bibliothèque |     ❌      |                              |

#### 8.5.2 Règles de gestion

- **RG-SEANCE-01** : La somme des durées des blocs est indicative.
- **RG-SEANCE-02** : Le contenu de séance est visible par le coach et l'admin, pas exposé aux parents en V1.
- **RG-SEANCE-03** : Les blocs sont réordonnables par glisser-déposer.

### 8.6 Bibliothèque d'exercices

#### 8.6.1 Données d'un exercice

| Champ          | Type            | Obligatoire | Règles                                                                        |
| -------------- | --------------- | :---------: | ----------------------------------------------------------------------------- |
| Identifiant    | UUID            |     ✅      |                                                                               |
| Titre          | Texte           |     ✅      | 2–100 caractères                                                              |
| Description    | Texte           |     ❌      |                                                                               |
| Catégorie      | Enum            |     ✅      | `échauffement`, `technique`, `physique`, `tactique`, `jeu`, `retour au calme` |
| Durée suggérée | Entier          |     ❌      | En minutes                                                                    |
| Tags           | Liste de textes |     ❌      |                                                                               |
| Créé par       | Référence User  |     ✅      |                                                                               |

#### 8.6.2 Règles de gestion

- **RG-EXERC-01** : La bibliothèque est partagée entre tous les coachs du club.
- **RG-EXERC-02** : Un coach gère ses propres exercices ; un admin gère tous les exercices du club.
- **RG-EXERC-03** : La suppression d'un exercice ne supprime pas les blocs de séance existants (dénormalisation à l'utilisation).
- **RG-EXERC-04** : Recherche possible par titre, catégorie et tags.

---

## 9. Assiduité

### 9.1 Saisie

- Saisie par le **coach** après chaque séance (match ou entraînement).
- Valeurs possibles : `présent`, `absent`, `excusé`.
- La saisie est possible jusqu'à **7 jours** après la date de la séance.
- Pour les matchs avec mode live : saisie proposée automatiquement à la clôture.
- Un joueur dont le parent a répondu "absent" à un sondage est pré-rempli `excusé`.

### 9.2 Données d'une présence

| Champ            | Type                      | Obligatoire |
| ---------------- | ------------------------- | :---------: |
| Identifiant      | UUID                      |     ✅      |
| Type de séance   | `match` ou `entraînement` |     ✅      |
| Référence séance | UUID                      |     ✅      |
| Joueur           | Référence                 |     ✅      |
| Statut           | Enum                      |     ✅      |
| Note             | Texte                     |     ❌      |

### 9.3 Règles de gestion

- **RG-ASSID-01** : Un seul enregistrement par joueur par séance.
- **RG-ASSID-02** : La modification d'un statut existant est tracée (date + auteur).
- **RG-ASSID-03** : En l'absence de saisie, le statut est `non renseigné`.
- **RG-ASSID-04** : Un joueur dont l'indisponibilité couvre la date de la séance est pré-rempli `excusé`. Le coach peut modifier cette valeur.

---

## 10. Statistiques

### 10.1 Statistiques d'assiduité

| Indicateur          | Description                           |
| ------------------- | ------------------------------------- |
| Taux de présence    | % séances présentes / séances totales |
| Nombre de présences | Absences, excusées, non renseignées   |
| Évolution           | Courbe sur la période sélectionnée    |

### 10.2 Statistiques sportives par joueur

| Indicateur              | Description                                |
| ----------------------- | ------------------------------------------ |
| Matchs joués            | Total et par période                       |
| Temps de jeu            | Total en minutes si granularité disponible |
| Postes joués            | Répartition par poste                      |
| Buts marqués            | Via mode live                              |
| Passes décisives        | Via mode live                              |
| Cartons jaunes / rouges | Via mode live                              |
| Évolution               | Historique des postes dans le temps        |

### 10.3 Statistiques d'équipe

| Indicateur              | Description                        |
| ----------------------- | ---------------------------------- |
| Résultats               | Victoires, nuls, défaites          |
| Buts pour / contre      | Total et par match                 |
| Meilleur buteur         | Classement des buteurs de l'équipe |
| Taux de présence global | Moyenne de présence aux séances    |

### 10.4 Filtres disponibles

| Filtre         | Valeurs                                                    |
| -------------- | ---------------------------------------------------------- |
| Période        | Glissant 30j, 60j, depuis début de saison, saison complète |
| Joueur         | Sélection individuelle                                     |
| Équipe         | Sélection d'équipe                                         |
| Type de séance | Matchs, entraînements, tous                                |

### 10.5 Règles de gestion

- **RG-STAT-01** : Statistiques calculées sur la saison active par défaut.
- **RG-STAT-02** : Joueur multi-équipes : statistiques consolidées avec filtre par équipe.
- **RG-STAT-03** : Statistiques de buts/passes/cartons disponibles uniquement si mode live utilisé.

---

## 11. Simulation de composition

### 11.1 Principe

Le simulateur permet au coach de préparer sa composition avant un match, en positionnant des joueurs sur un schéma tactique correspondant au foot à 8.

### 11.2 Formations supportées (foot à 8)

| Formation | Description                           |
| --------- | ------------------------------------- |
| 2-3-2     | 2 défenseurs, 3 milieux, 2 attaquants |
| 3-2-2     | 3 défenseurs, 2 milieux, 2 attaquants |
| 3-3-1     | 3 défenseurs, 3 milieux, 1 attaquant  |
| 2-4-1     | 2 défenseurs, 4 milieux, 1 attaquant  |

### 11.3 Données d'une composition

| Champ            | Type                | Obligatoire | Règles                              |
| ---------------- | ------------------- | :---------: | ----------------------------------- |
| Identifiant      | UUID                |     ✅      |                                     |
| Équipe           | Référence           |     ✅      |                                     |
| Match associé    | Référence           |     ❌      |                                     |
| Nom              | Texte               |     ✅      |                                     |
| Formation        | Enum                |     ✅      |                                     |
| Slots            | Liste de SlotPoste  |     ✅      | 8 slots (1 GK + 7 joueurs de champ) |
| Remplaçants      | Liste de Références |     ❌      |                                     |
| Date de création | DateTime            |     ✅      |                                     |

### 11.4 Slot de poste

| Champ           | Description                             |
| --------------- | --------------------------------------- |
| Position        | Code du poste (GK, DD, DC…)             |
| Joueur affecté  | Référence joueur (optionnel)            |
| Coordonnées x/y | Position visuelle sur le terrain (en %) |

### 11.5 Suggestions automatiques

1. Le **poste de prédilection** (priorité 1)
2. L'**appétence** pour le poste (priorité 2)
3. Le **nombre de fois** joué à ce poste (priorité 3)

### 11.6 Disponibilité des joueurs dans le simulateur

| État du joueur                                  | Rendu                                            |
| ----------------------------------------------- | ------------------------------------------------ |
| Disponible                                      | Affiché normalement                              |
| Indisponible                                    | Grisé 🚫 avec motif                              |
| Reprise progressive                             | Grisé ⚠️ — alignement possible avec confirmation |
| Absent confirmé (assiduité ou sondage)          | Grisé 🔴                                         |
| Absent répondu "absent" par le parent (sondage) | Grisé 🔴 avec indicateur "sondage"               |

> **RG-COMPO-01** : Les suggestions excluent les joueurs indisponibles.  
> **RG-COMPO-02** : Un joueur ne peut être affecté qu'à un seul poste par composition.  
> **RG-COMPO-03** : Le coach peut toujours outrepasser les indisponibilités — avertissement affiché, aucun blocage.

### 11.7 Remplaçants

- Maximum de **4 remplaçants** (à confirmer selon règlement fédéral).

> **Point ouvert PO-02** : Nombre de remplaçants autorisés en foot à 8 ?

---

## 12. Tournois

### 12.1 Objectif

Gérer des compétitions concentrées (une journée ou un week-end) regroupant plusieurs matchs. Le club peut y participer ou en être l'organisateur.

### 12.2 Données d'un tournoi

| Champ                | Type                | Obligatoire | Règles                                           |
| -------------------- | ------------------- | :---------: | ------------------------------------------------ |
| Identifiant          | UUID                |     ✅      |                                                  |
| Nom                  | Texte               |     ✅      | Ex. "Tournoi de Noël 2025"                       |
| Saison               | Référence           |     ✅      |                                                  |
| Date de début        | Date                |     ✅      |                                                  |
| Date de fin          | Date                |     ❌      | Si multi-jours                                   |
| Lieu / Adresse       | Texte               |     ✅      |                                                  |
| Organisateur         | Texte               |     ✅      | Nom du club organisateur                         |
| Organisé par le club | Booléen             |     ✅      |                                                  |
| Équipes du club      | Liste de références |     ✅      | Au moins une                                     |
| Format               | Enum                |     ✅      | `poules`, `élimination_directe`, `poules_finale` |
| Statut               | Enum                |     ✅      | `planifié`, `en_cours`, `terminé`                |

### 12.3 Structure interne

```
TOURNOI
 └─ GROUPE / POULE (1..N)
     ├── nom           (ex. "Poule A", "Demi-finale")
     ├── type          (poule | élimination)
     ├── matches[]  →  MATCH
     └── classement[]  (calculé automatiquement)
```

### 12.4 Classement de poule

| Résultat  | Points   |
| --------- | -------- |
| Victoire  | 3 points |
| Match nul | 1 point  |
| Défaite   | 0 point  |

Départage : différence de buts → buts marqués → confrontation directe.

> **Point ouvert PO-11** : Le règlement de départage doit-il être configurable par tournoi ?

### 12.5 Organisation d'un tournoi maison

Quand le club est organisateur :

- Saisie des équipes adverses invitées (nom, club — sans données joueurs)
- Gestion des **terrains** : numéro/nom, affecté à chaque match
- Planning par terrain (grille horaire)

### 12.6 Règles de gestion

- **RG-TOURN-01** : Un tournoi peut impliquer plusieurs équipes du même club.
- **RG-TOURN-02** : Un match de tournoi hérite du lieu et de la date du tournoi — modifiable match par match.
- **RG-TOURN-03** : Suppression impossible si des matchs ont assiduité ou composition. Archivage possible.
- **RG-TOURN-04** : Le classement de poule n'est calculé que sur les matchs avec score renseigné.
- **RG-TOURN-05** : Les matchs de tournoi apparaissent dans le calendrier des équipes avec un badge "Tournoi".

---

## 13. Intégration calendrier externe

### 13.1 Objectif

Synchroniser les événements de l'application dans le calendrier personnel (Google Calendar, Apple Calendar, Outlook…) via un flux iCal standard (RFC 5545).

### 13.2 Flux disponibles

| Flux      | Destinataires | Contenu                                       |
| --------- | ------------- | --------------------------------------------- |
| Équipe    | Coach, Admin  | Matchs + entraînements + tournois de l'équipe |
| Joueur    | Coach, Admin  | Tous les événements d'un joueur               |
| Personnel | Parent        | Événements de son ou ses enfants              |

### 13.3 Contenu exporté par événement

| Champ iCal          | Valeur                                                               |
| ------------------- | -------------------------------------------------------------------- |
| `SUMMARY`           | Ex. "⚽ Match vs FC Lyon — U13A"                                     |
| `DTSTART` / `DTEND` | Début et fin calculée                                                |
| `LOCATION`          | Lieu + adresse                                                       |
| `DESCRIPTION`       | Équipe, statut, phase, tournoi si applicable, point de RDV si défini |
| `STATUS`            | `CONFIRMED` / `TENTATIVE` / `CANCELLED`                              |
| `LAST-MODIFIED`     | Horodatage de la dernière modification                               |
| `UID`               | Identifiant stable pour mise à jour différentielle                   |

### 13.4 Accès et sécurité

- URL unique sécurisée par **token** — accessible sans authentification (standard iCal).
- Régénération du token : l'ancien flux est immédiatement invalidé.

### 13.5 Règles de gestion

- **RG-ICAL-01** : Toute modification est reflétée dans le flux dans un délai de 15 minutes.
- **RG-ICAL-02** : Les événements annulés restent dans le flux avec `STATUS:CANCELLED`.
- **RG-ICAL-03** : Le flux parent contient uniquement les événements de ses enfants.
- **RG-ICAL-04** : Les matchs de tournoi incluent le nom du tournoi dans la `DESCRIPTION`.
- **RG-ICAL-05** : Le token iCal est distinct du token d'authentification.

---

## 14. Logistique des déplacements

### 14.1 Objectif

Faciliter l'organisation des déplacements pour les matchs et tournois extérieurs : communication du point de rendez-vous, navigation GPS, et coordination du covoiturage entre familles.

### 14.2 Point de rendez-vous

Pour tout match extérieur (`isHome = faux`) ou tournoi, le coach peut définir un **point de rendez-vous** distinct du lieu de la rencontre.

#### 14.2.1 Données du point de RDV

| Champ                | Type  | Obligatoire | Règles                                             |
| -------------------- | ----- | :---------: | -------------------------------------------------- |
| Identifiant          | UUID  |     ✅      | Rattaché au match ou tournoi                       |
| Adresse              | Texte |     ✅      | Adresse complète                                   |
| Heure de rendez-vous | Heure |     ✅      | Format HH:MM — différente de l'heure du match      |
| Note                 | Texte |     ❌      | Ex. "Parking du supermarché, entrée rue du Moulin" |

#### 14.2.2 Règles de gestion

- **RG-DEPL-01** : Le point de RDV est facultatif. S'il n'est pas défini, seule l'adresse du terrain est affichée.
- **RG-DEPL-02** : Le point de RDV est visible par le coach et les parents des joueurs de l'équipe.
- **RG-DEPL-03** : Toute modification du point de RDV (adresse ou heure) déclenche une notification aux parents.
- **RG-DEPL-04** : Le point de RDV apparaît dans le flux iCal dans le champ `DESCRIPTION` de l'événement.

### 14.3 Navigation GPS

- Lien direct vers **Google Maps** et **Apple Plans** depuis la fiche du match.
- Le lien est généré depuis l'adresse du terrain (ou du point de RDV si défini et sélectionné).
- Accessible en un tap depuis la vue parent et la vue coach.
- Aucune transmission de la position de l'utilisateur : le lien est une URL statique.

### 14.4 Covoiturage simplifié

#### 14.4.1 Principe

Les parents peuvent proposer des places de covoiturage pour les matchs extérieurs. La coordination est visible par le coach. Les coordonnées personnelles ne sont jamais échangées entre parents via l'application.

#### 14.4.2 Données d'une offre de covoiturage

| Champ                        | Type                    | Obligatoire | Règles                              |
| ---------------------------- | ----------------------- | :---------: | ----------------------------------- |
| Identifiant                  | UUID                    |     ✅      |                                     |
| Match                        | Référence               |     ✅      |                                     |
| Proposé par                  | Référence User (parent) |     ✅      |                                     |
| Nombre de places disponibles | Entier                  |     ✅      | 1–8                                 |
| Lieu de départ               | Texte                   |     ❌      | Ex. "Place de la mairie"            |
| Heure de départ              | Heure                   |     ❌      |                                     |
| Joueurs pris en charge       | Liste de références     |     ❌      | Renseignée par le parent conducteur |
| Note                         | Texte                   |     ❌      | Visible par le coach uniquement     |

#### 14.4.3 Vue coach — récapitulatif du covoiturage

Le coach dispose d'un tableau de bord par match extérieur :

| Conducteur | Places | Départ                    | Joueurs pris en charge        | Places libres |
| ---------- | ------ | ------------------------- | ----------------------------- | ------------- |
| M. Dupont  | 4      | Place de la mairie, 13h00 | Lucas, Emma                   | 2             |
| Mme Martin | 3      | Rue de l'Église, 13h15    | Tom                           | 2             |
| —          | —      | —                         | Julien, Anouk (sans solution) | —             |

Le coach voit les joueurs sans solution de transport identifiée.

#### 14.4.4 Règles de gestion

- **RG-COVOIT-01** : Le covoiturage n'est disponible que pour les matchs extérieurs (`isHome = faux`) et les tournois.
- **RG-COVOIT-02** : Un parent peut proposer une offre de covoiturage ou s'inscrire comme bénéficiaire. Ces deux actions sont indépendantes.
- **RG-COVOIT-03** : Les coordonnées personnelles (téléphone, email) ne sont **jamais exposées** entre parents via l'application. Le coach reste l'intermédiaire pour la mise en relation.
- **RG-COVOIT-04** : Un parent peut indiquer les joueurs qu'il prend en charge (son propre enfant + d'autres avec accord des parents concernés).
- **RG-COVOIT-05** : Une notification est envoyée au coach quand une nouvelle offre de covoiturage est soumise.
- **RG-COVOIT-06** : La liste des offres et des bénéficiaires est visible uniquement par le coach et l'admin (pas entre parents).

### 14.5 Estimation du trajet

- Affichage de la **distance approximative** entre le lieu d'entraînement habituel et le terrain adverse.
- Intégration optionnelle d'une API cartographique.

> **Point ouvert PO-16** : Une API de cartographie (Google Maps, OpenStreetMap) est-elle dans le périmètre V1 ? Quel est l'impact sur les coûts et la RGPD (transmission d'adresses à un tiers) ?

---

## 15. Sondages de présence

### 15.1 Objectif et principe fondamental

Le sondage de présence permet au coach de recueillir **à l'avance** les confirmations de présence des joueurs pour un match, un entraînement ou un tournoi.

Le module repose sur une distinction essentielle entre deux niveaux de réponse :

| Niveau                      | Acteur                                        | Valeur                        | Portée                                                  |
| --------------------------- | --------------------------------------------- | ----------------------------- | ------------------------------------------------------- |
| **Intention**               | Le joueur (ou le parent au nom du joueur, V1) | Indicative, non contraignante | Informative pour le coach                               |
| **Confirmation officielle** | Le parent / tuteur légal                      | Définitive, contraignante     | Retenue par le coach pour la composition et l'assiduité |

> **Règle fondamentale :** la réponse du parent prévaut systématiquement sur l'intention du joueur. Un enfant peut exprimer ce qu'il souhaite — seul le parent engage la famille.

### 15.2 Données d'un sondage

| Champ                      | Type           | Obligatoire | Règles                                                    |
| -------------------------- | -------------- | :---------: | --------------------------------------------------------- |
| Identifiant                | UUID           |     ✅      |                                                           |
| Équipe                     | Référence      |     ✅      |                                                           |
| Type de séance             | Enum           |     ✅      | `match`, `entraînement`, `tournoi`, `libre`               |
| Séance associée            | Référence      |     ❌      | Lien vers le match, entraînement ou tournoi               |
| Question                   | Texte          |     ✅      | Ex. "Serez-vous présent au match du 15/05 vs AS Martin ?" |
| Date limite de réponse     | DateTime       |     ✅      |                                                           |
| Créé par                   | Référence User |     ✅      | Coach ou admin                                            |
| Statut                     | Enum           |     ✅      | `ouvert`, `fermé`, `archivé`                              |
| Notification à l'ouverture | Booléen        |     ✅      | Envoyer une notification à la création                    |
| Créé le                    | DateTime       |     ✅      |                                                           |

### 15.3 Options de réponse

Les mêmes options s'appliquent aux deux niveaux (intention joueur et confirmation parent) :

| Valeur      | Signification                       |
| ----------- | ----------------------------------- |
| `présent`   | La présence est confirmée           |
| `absent`    | La présence ne sera pas possible    |
| `incertain` | La présence n'est pas encore connue |

### 15.4 Données d'une réponse

| Champ                    | Type           | Obligatoire | Règles                                                               |
| ------------------------ | -------------- | :---------: | -------------------------------------------------------------------- |
| Identifiant              | UUID           |     ✅      |                                                                      |
| Sondage                  | Référence      |     ✅      |                                                                      |
| Joueur                   | Référence      |     ✅      |                                                                      |
| **Intention joueur**     | Enum           |     ❌      | Renseignée par le joueur (V2) ou par le parent au nom du joueur (V1) |
| Date intention joueur    | DateTime       |     ❌      |                                                                      |
| **Confirmation parent**  | Enum           |     ❌      | Renseignée par le parent — valeur officielle                         |
| Date confirmation parent | DateTime       |     ❌      |                                                                      |
| Parent répondant         | Référence User |     ❌      |                                                                      |
| Note                     | Texte          |     ❌      | Visible par le coach uniquement                                      |

### 15.5 Vue synthèse coach

Le coach dispose d'un tableau de bord par sondage :

| Joueur    | Intention joueur  | Confirmation parent | Écart         | Statut retenu   |
| --------- | ----------------- | ------------------- | ------------- | --------------- |
| Lucas D.  | ✅ Présent        | ✅ Présent          | —             | ✅ Présent      |
| Emma R.   | ✅ Présent        | ❌ Absent           | ⚠️ Divergence | ❌ Absent       |
| Tom B.    | ❌ Absent         | _(non répondu)_     | —             | ❓ Non confirmé |
| Anouk M.  | _(non renseigné)_ | ✅ Présent          | —             | ✅ Présent      |
| Julien C. | _(non renseigné)_ | _(non répondu)_     | —             | ❓ Non confirmé |

- La **divergence** (intention joueur ≠ confirmation parent) est mise en évidence visuellement.
- Le **statut retenu** est toujours la confirmation parent si elle existe, sinon l'intention joueur avec mention "non confirmé par le parent", sinon "non répondu".
- Le coach peut filtrer : tous / confirmés présents / confirmés absents / non répondus.

### 15.6 Lien avec les autres modules

#### Simulateur de composition

- Un joueur dont le parent a confirmé `absent` est automatiquement grisé 🔴 dans le simulateur pour la séance associée (même comportement qu'une indisponibilité).
- L'intention joueur seule (sans confirmation parent) n'entraîne pas de grisage automatique — elle est affichée à titre indicatif dans la liste des joueurs.

#### Assiduité

- À la clôture de la séance, les joueurs dont le parent a répondu `absent` sont **pré-remplis** `excusé` dans la feuille d'assiduité. Le coach peut modifier cette valeur.
- Les joueurs dont la réponse parent est `présent` mais dont le statut d'assiduité est `absent` génèrent un signal d'alerte pour le coach ("attendu mais absent").

### 15.7 Règles de gestion

- **RG-SONDAGE-01** : La confirmation du parent est la **seule valeur officielle**. L'intention du joueur est informative uniquement et n'entraîne aucune action automatique.
- **RG-SONDAGE-02** : En V1, c'est le parent qui saisit à la fois l'intention du joueur et sa propre confirmation, depuis son espace. Les deux champs sont distincts dans le formulaire.
- **RG-SONDAGE-03** : Un parent peut modifier sa réponse tant que le sondage est ouvert (`statut = ouvert`). Après la deadline, la modification reste possible mais le coach est informé que la réponse est tardive.
- **RG-SONDAGE-04** : Un sondage peut être créé **automatiquement** lors de la création d'un match (configurable au niveau du club). La question par défaut est générée automatiquement.
- **RG-SONDAGE-05** : La clôture d'un sondage (manuelle ou automatique à la deadline) envoie optionnellement un récapitulatif au coach.
- **RG-SONDAGE-06** : Un joueur sans contact utilisateur (pas de compte parent) apparaît dans le tableau coach avec le statut "aucun compte parent — saisie directe possible" — le coach peut saisir lui-même la réponse officielle.
- **RG-SONDAGE-07** : Un sondage `libre` (non rattaché à une séance) peut être créé pour tout sujet (ex. "Disponible pour un tournoi le 20/06 ?").
- **RG-SONDAGE-08** : Un seul sondage actif par séance et par équipe à la fois.
- **RG-SONDAGE-09** : Les réponses de sondage sont conservées après archivage du sondage, pour permettre l'audit (RGPD, traçabilité).

### 15.8 Cas particulier : plusieurs tuteurs légaux pour un même joueur

Un joueur peut avoir plusieurs contacts avec un compte utilisateur (ex. père et mère).

| Situation                                         | Comportement                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| Un seul parent a répondu                          | Sa réponse est retenue comme confirmation officielle                     |
| Les deux parents ont répondu **de la même façon** | La réponse commune est retenue                                           |
| Les deux parents ont répondu **différemment**     | Une alerte ⚠️ "Réponses divergentes entre tuteurs" est affichée au coach |
| Aucun parent n'a répondu                          | Statut "non confirmé"                                                    |

> En cas de divergence entre tuteurs, le coach voit les deux réponses et choisit laquelle retenir. La dernière réponse saisie est affichée en premier.

> **Point ouvert PO-17** : En cas de divergence entre tuteurs, faut-il une règle automatique de résolution (ex. la plus récente prévaut) ou toujours une décision manuelle du coach ?

---

## 16. Notifications in-app

### 16.1 Événements déclencheurs

| Événement                         | Destinataires               | Déclencheur                                |
| --------------------------------- | --------------------------- | ------------------------------------------ |
| Nouveau match ajouté              | Coach + Parents de l'équipe | Création d'un match                        |
| Changement d'horaire de match     | Coach + Parents de l'équipe | Modification date ou heure                 |
| Changement de lieu de match       | Coach + Parents de l'équipe | Modification terrain ou adresse            |
| Match annulé                      | Coach + Parents de l'équipe | Statut → `annulé`                          |
| Entraînement modifié              | Coach + Parents de l'équipe | Modification heure                         |
| Entraînement exceptionnel         | Coach + Parents de l'équipe | Création type `exceptionnel`               |
| Entraînement annulé               | Coach + Parents de l'équipe | `annulé = vrai`                            |
| Composition publiée               | Parents (configurable)      | Publication de la composition              |
| Rappel de séance                  | Parents                     | J-1 (configurable)                         |
| Indisponibilité déclarée (parent) | Coach de l'équipe           | Déclaration parent                         |
| Blessure pendant le match live    | Coach + Admin               | Événement `blessure_live`                  |
| Nouveau tournoi                   | Coach + Parents de l'équipe | Création                                   |
| Modification d'un tournoi         | Coach + Parents de l'équipe | Date, lieu ou format modifié               |
| Point de RDV modifié              | Parents de l'équipe         | Modification adresse ou heure              |
| Nouveau sondage ouvert            | Parents de l'équipe         | Création sondage avec notification activée |
| Deadline sondage dans 24h         | Parents n'ayant pas répondu | Rappel automatique                         |
| Récapitulatif sondage à clôture   | Coach                       | Fermeture du sondage                       |
| Réponse tardive à un sondage      | Coach                       | Réponse après deadline                     |
| Nouvelle offre de covoiturage     | Coach                       | Soumission d'une offre                     |
| Divergence de réponses tuteurs    | Coach                       | Deux tuteurs ont répondu différemment      |

### 16.2 Canaux

- Notifications **in-app** (centre de notifications dans l'application)
- **Push PWA** (si l'utilisateur a accordé la permission)

> **Point ouvert PO-03** : Les notifications par email ou SMS sont-elles dans le périmètre V1 ?

### 16.3 Paramétrage utilisateur

Chaque utilisateur peut depuis ses préférences :

- Activer / désactiver chaque type de notification
- Choisir le délai de rappel (J-1, J-2, H-2…)
- Désactiver toutes les notifications

### 16.4 Lien avec le consentement RGPD

- L'activation des **notifications push** requiert un consentement explicite distinct du consentement RGPD principal.
- Ce consentement est stocké et révocable à tout moment.

---

## 17. Intégration fédération

### 17.1 Objectif

Synchroniser automatiquement le calendrier officiel des matchs et les résultats depuis l'API de la fédération.

### 17.2 Données récupérées

| Donnée              | Direction        | Fréquence                   |
| ------------------- | ---------------- | --------------------------- |
| Calendrier officiel | Fédération → App | Quotidienne ou à la demande |
| Résultats           | Fédération → App | Après chaque journée        |
| Classement          | Fédération → App | Après chaque journée        |

### 17.3 Stratégie de rapprochement

1. Appariement par **date + heure + adversaire**.
2. Match trouvé : mise à jour des champs fédéraux (score, statut).
3. Aucun match trouvé : création avec statut `saison`.
4. Champs locaux (note, assiduité, composition, événements live) jamais écrasés.

### 17.4 Gestion des conflits

| Conflit         | Comportement                                |
| --------------- | ------------------------------------------- |
| Date différente | Alerte coach — choix manuel                 |
| Lieu différent  | Valeur fédérale par défaut (configurable)   |
| Score différent | Valeur fédérale (sauf si mode live utilisé) |

### 17.5 Gestion des erreurs

- Indisponibilité API : alerte admin + affichage de la dernière synchronisation
- Erreurs loguées et consultables par l'admin
- Synchronisation rejouable manuellement

> **Point ouvert PO-04** : L'API fédération est-elle disponible ? Format ? Documentation ?

---

## 18. RGPD et données de mineurs

### 18.1 Base légale

- **Consentement explicite** des représentants légaux
- **Intérêt légitime** du club pour la gestion de ses activités sportives

### 18.2 Données collectées et finalités

| Catégorie       | Données                                        | Finalité                                        |
| --------------- | ---------------------------------------------- | ----------------------------------------------- |
| Joueur          | Nom, prénom, date de naissance, photo          | Identification, composition, statistiques       |
| Joueur          | Poste, appétences                              | Optimisation sportive                           |
| Joueur          | Indisponibilités (motif, dates)                | Gestion de l'effectif, composition              |
| Joueur          | Suivi de blessure (zone, nature, statut)       | Disponibilité sportive — aucune donnée médicale |
| Contact         | Nom, prénom, téléphone, email                  | Communication, accès à l'application            |
| Assiduité       | Présences / absences                           | Suivi sportif                                   |
| Événements live | Buts, changements, cartons                     | Statistiques sportives                          |
| Sondage         | Intention joueur, confirmation parent          | Planification de l'effectif                     |
| Covoiturage     | Offre de transport (sans coordonnées exposées) | Logistique des déplacements                     |
| Token iCal      | Identifiant de flux calendrier                 | Synchronisation calendrier personnel            |

### 18.3 Données explicitement exclues

- Diagnostics médicaux, ordonnances, prescriptions
- Données de santé sensibles (catégorie spéciale RGPD)
- Localisation en temps réel
- Données biométriques
- Coordonnées personnelles entre parents (covoiturage)

### 18.4 Droits des personnes

| Droit         | Modalité                                           |
| ------------- | -------------------------------------------------- |
| Accès         | Export via l'interface parent ou sur demande admin |
| Rectification | Signalement parent → correction par le coach       |
| Suppression   | Demande via l'interface → traitement admin         |
| Portabilité   | Export JSON ou CSV                                 |
| Opposition    | Désactivation notifications et compte              |

### 18.5 Traçabilité du consentement

| Information            | Description                                  |
| ---------------------- | -------------------------------------------- |
| Date du consentement   | Horodatage ISO                               |
| Version du document    | Référence CGU / politique de confidentialité |
| Identité du consentant | Référence contact                            |
| Canal                  | in-app, email, papier                        |

### 18.6 Sécurité et accès

- **Authentification** obligatoire pour accéder à toute donnée
- **HTTPS** (chiffrement en transit)
- Cloisonnement strict par rôle
- Durée de conservation : données actives tant que le joueur est licencié ; archivage ou suppression à la fin de la saison suivant la désinscription
- Tokens iCal invalidés à la désactivation du compte

> **Point ouvert PO-05** : Prestataire d'hébergement prévu ? Hébergement en UE requis (RGPD).

---

## 19. Modèle de données conceptuel

```
CLUB
 ├── id
 └── name

SAISON
 ├── id / name / startDate / endDate / active

EQUIPE
 ├── id / name / category / color
 ├── seasonId  →  SAISON
 └── coachId   →  USER

USER
 ├── id / email / firstName / lastName
 ├── roles[]      (admin | coach | parent)
 ├── teamIds[]  →  EQUIPE
 ├── contactId  →  CONTACT
 └── icalTokens{}  (flux → token)

JOUEUR
 ├── id / firstName / lastName / dateOfBirth
 ├── primaryTeamId    →  EQUIPE
 ├── secondaryTeamId  →  EQUIPE (opt.)
 ├── preferredPosition / appetences{} / number

CONTACT
 ├── id / firstName / lastName / phone / email / type
 ├── playerIds[]  →  JOUEUR
 ├── userId       →  USER (opt.)
 └── consentDate

INDISPONIBILITE
 ├── id / startDate / endDate (opt.)
 ├── playerId     →  JOUEUR
 ├── motif        (blessure | maladie | vacances | suspension | personnel | autre)
 ├── declaredBy   →  USER
 ├── note (opt.)
 └── injuryId     →  BLESSURE (opt.)

BLESSURE
 ├── id / zone / nature / startDate
 ├── playerId          →  JOUEUR
 ├── estimatedReturnDate / actualReturnDate
 ├── status            (en rééducation | reprise progressive | apte)
 └── noteCoach

TOURNOI
 ├── id / name / dateStart / dateEnd / location / address
 ├── seasonId / organizer / isOrganizedByClub / format / status
 ├── teamIds[]  →  EQUIPE
 └── groupes[]
      ├── id / name / type
      └── matchIds[]  →  MATCH

MATCH
 ├── id / date / time / location / address / isHome / opponent
 ├── teamId / seasonId
 ├── tournamentId  →  TOURNOI (opt.)
 ├── status / phase / score{} / liveActive
 └── meetingPoint{}  (address, meetingTime, note — opt.)

EVENEMENT_MATCH
 ├── id / type / minute / note
 ├── matchId    →  MATCH
 ├── playerId   →  JOUEUR (opt.)
 └── player2Id  →  JOUEUR (opt.)

ENTRAINEMENT
 ├── id / date / time / duration / type / cancelled / theme / note
 ├── teamId  →  EQUIPE
 └── blocs[]
      ├── ordre / durée / titre / description
      └── exerciceId  →  EXERCICE (opt.)

EXERCICE
 ├── id / title / description / category / duration / tags[]
 └── createdBy  →  USER

OFFRE_COVOITURAGE
 ├── id / seats / departureLocation / departureTime / note
 ├── matchId      →  MATCH
 ├── offeredBy    →  USER
 └── playerIds[]  →  JOUEUR

SONDAGE
 ├── id / question / deadline / status / sendNotification / createdAt
 ├── teamId        →  EQUIPE
 ├── sessionType   (match | entraînement | tournoi | libre)
 ├── sessionId     →  MATCH | ENTRAINEMENT | TOURNOI (opt.)
 └── createdBy     →  USER

REPONSE_SONDAGE
 ├── id
 ├── sondageId      →  SONDAGE
 ├── playerId       →  JOUEUR
 ├── intentionJoueur    (présent | absent | incertain | null)
 ├── dateIntentionJoueur
 ├── confirmationParent (présent | absent | incertain | null)
 ├── dateConfirmationParent
 ├── parentUserId   →  USER (opt.)
 └── note

PRESENCE
 ├── id / sessionType / status / note
 ├── sessionId  →  MATCH | ENTRAINEMENT
 └── playerId   →  JOUEUR

HISTORIQUE_POSTE
 ├── id / period / position / minute
 ├── playerId  →  JOUEUR
 └── matchId   →  MATCH

COMPOSITION
 ├── id / name / formation / createdAt
 ├── teamId   →  EQUIPE
 ├── matchId  →  MATCH (opt.)
 ├── slots[]
 │    ├── position / x / y
 │    └── playerId  →  JOUEUR (opt.)
 └── substitutes[]  →  JOUEUR

NOTIFICATION
 ├── id / type / message / read / createdAt
 └── userId  →  USER
```

---

## 20. User Stories

### 20.1 Indisponibilités et blessures

---

**US-JOUEUR-01 — Déclarer une indisponibilité (coach)**

```
Given je suis sur la fiche d'un joueur de mon équipe
When je clique sur "Déclarer une indisponibilité"
  And je saisis : date de début, motif, date de fin (optionnelle)
  And je valide
Then l'indisponibilité est enregistrée
  And le joueur est grisé dans le simulateur pour les matchs de la période
  And la fiche joueur affiche un badge "Indisponible"

Given je ne saisis pas de date de fin
When je valide
Then l'indisponibilité reste active jusqu'à clôture manuelle
```

---

**US-JOUEUR-02 — Déclarer une indisponibilité (parent, V1)**

```
Given je suis connecté en tant que parent
When je navigue vers la fiche de mon enfant et je clique "Signaler une absence"
  And je saisis la période et le motif
Then le coach reçoit une notification
  And le joueur est pré-rempli "excusé" dans la feuille d'assiduité des séances concernées
```

---

**US-JOUEUR-03 — Créer et clôturer un suivi de blessure**

```
Given je suis sur la fiche d'un joueur
When je crée un suivi de blessure (zone, nature, date, statut)
Then une indisponibilité est automatiquement créée
  And le joueur est grisé dans le simulateur

Given je change le statut à "apte" et je saisis la date de reprise
When je valide
Then l'indisponibilité est automatiquement clôturée
  And le joueur redevient disponible dans le simulateur
```

---

### 20.2 Mode match en temps réel

---

**US-LIVE-01 — Activer le mode match et fonctionner en offline**

```
Given je suis sur la fiche d'un match dont la date est aujourd'hui
When je clique sur "Démarrer le mode live"
Then l'interface live s'ouvre avec score à 0-0 et chronomètre arrêté

Given je n'ai pas de connexion réseau
When j'enregistre un événement
Then il est sauvegardé localement et synchronisé à la reconnexion
```

---

**US-LIVE-02 — Enregistrer un but et corriger une erreur**

```
Given le mode live est actif
When je clique "But", sélectionne le buteur et confirme
Then le score est incrémenté et visible par les parents connectés

Given je me suis trompé de buteur
When je tape l'événement dans le journal et clique "Corriger"
Then je peux modifier le buteur ou supprimer l'événement
```

---

**US-LIVE-03 — Enregistrer un remplacement**

```
Given le mode live est actif
When je sélectionne joueur entrant, joueur sortant, minute et poste
Then le remplacement est enregistré
  And l'historique des postes des deux joueurs est mis à jour automatiquement
```

---

**US-LIVE-04 — Clôturer le match**

```
Given le mode live est actif
When je clique "Clôturer le match" et confirme
Then le journal est verrouillé
  And le score final est enregistré
  And une proposition de saisir l'assiduité est affichée
  And les parents sont notifiés du score final
```

---

### 20.3 Logistique des déplacements

---

**US-DEPL-01 — Définir un point de rendez-vous**

```
Given un match extérieur existe dans le calendrier
When le coach clique sur "Définir le point de RDV"
  And saisit l'adresse, l'heure de RDV et une note optionnelle
Then le point de RDV est enregistré sur la fiche du match
  And les parents de l'équipe reçoivent une notification
  And l'adresse du RDV apparaît dans le flux iCal
```

---

**US-DEPL-02 — Naviguer vers le lieu du match**

```
Given je suis sur la fiche d'un match (coach ou parent)
When je clique sur "Naviguer"
Then je peux choisir entre naviguer vers le terrain ou vers le point de RDV (si défini)
  And l'application de navigation s'ouvre avec l'adresse sélectionnée
```

---

**US-DEPL-03 — Proposer un covoiturage**

```
Given un match extérieur est planifié
When un parent clique sur "Proposer du covoiturage"
  And saisit le nombre de places, le lieu et l'heure de départ
  And indique les joueurs qu'il prend en charge
Then l'offre est enregistrée
  And le coach reçoit une notification "Nouvelle offre de covoiturage"

Given je suis coach
When je consulte le récapitulatif covoiturage du match
Then je vois les offres, les joueurs pris en charge et les joueurs sans solution identifiée
```

---

### 20.4 Sondages de présence

---

**US-SONDAGE-01 — Créer un sondage pour un match**

```
Given un match est planifié dans le calendrier
When le coach clique sur "Créer un sondage"
  And saisit la question et la date limite
  And active la notification aux parents
Then le sondage est créé et lié au match
  And les parents de l'équipe reçoivent une notification "Sondage ouvert"
```

---

**US-SONDAGE-02 — Répondre à un sondage (parent)**

```
Given je suis connecté en tant que parent et j'ai reçu une notification de sondage
When j'ouvre le sondage
Then je vois deux champs distincts :
  "Ce que dit [prénom de l'enfant]" (intention — informatif)
  "Votre confirmation officielle" (réponse parent — définitive)
  And les deux proposent : Présent / Absent / Incertain

When je remplis les deux champs et valide
Then ma réponse officielle est enregistrée
  And si ma réponse diffère de l'intention de l'enfant, un message me l'indique

Given le sondage est toujours ouvert
When je reviens modifier ma réponse officielle
Then la modification est enregistrée
```

---

**US-SONDAGE-03 — Consulter le tableau de bord du sondage (coach)**

```
Given un sondage est ouvert pour mon équipe
When je consulte le tableau de bord du sondage
Then je vois pour chaque joueur :
  - L'intention du joueur (si renseignée)
  - La confirmation du parent (si renseignée)
  - Le statut retenu
  - Un indicateur de divergence si intention ≠ confirmation
  And je peux filtrer par statut retenu

Given la deadline est passée et des parents n'ont pas répondu
When je consulte le tableau
Then les joueurs sans confirmation parent sont clairement identifiés
  And je peux saisir manuellement une réponse pour les joueurs sans compte parent
```

---

**US-SONDAGE-04 — Impact sur le simulateur de composition**

```
Given un sondage est clôturé pour un match
  And le parent de Lucas a répondu "Absent"
When j'ouvre le simulateur de composition pour ce match
Then Lucas est grisé 🔴 avec l'indicateur "Absent (sondage parent)"
  And je ne peux pas le placer dans la composition sans avertissement
```

---

**US-SONDAGE-05 — Divergence entre deux tuteurs**

```
Given un joueur a deux parents avec compte utilisateur
  And le père a répondu "Présent"
  And la mère a répondu "Absent"
When je consulte le tableau de bord du sondage en tant que coach
Then une alerte ⚠️ "Réponses divergentes entre tuteurs" est affichée pour ce joueur
  And je vois les deux réponses avec l'identité de chaque répondant et l'horodatage
  And je peux choisir manuellement la valeur à retenir pour cet enfant
```

---

### 20.5 Calendrier externe

---

**US-ICAL-01 — S'abonner au calendrier de son enfant**

```
Given je suis connecté en tant que parent
When je navigue vers "Préférences > Calendrier"
  And je clique sur "Générer mon lien iCal"
Then un lien d'abonnement unique est créé
  And je peux cliquer sur "Ajouter à Google Calendar" ou "Ajouter à Apple Calendar"
  And les événements de mes enfants apparaissent dans mon calendrier dans les 15 minutes

Given le coach annule un entraînement
When mon calendrier se synchronise
Then l'événement est mis à jour avec le statut "Annulé"
  And le point de RDV (si modifié) est reflété dans la description
```

---

### 20.6 Vue parent

---

**US-PARENT-01 — Consulter le calendrier de son enfant**

```
Given je suis connecté avec un compte parent
When je navigue vers "Calendrier"
Then je vois matchs, entraînements et tournois de mon enfant
  And chaque événement affiche : date, heure, lieu, statut, point de RDV (si défini)
  And les événements annulés sont clairement indiqués
  And les matchs live affichent le score en cours
  And les sondages ouverts sont signalés avec un badge "À répondre"
```

---

## 21. Découpage MVP / V1 / Évolutions

### 21.1 MVP (Minimum Viable Product)

Objectif : cœur fonctionnel utilisable par un coach, sans authentification multi-utilisateurs.

| Module                   | Fonctionnalités incluses                                |
| ------------------------ | ------------------------------------------------------- |
| Équipes                  | Création, modification, liste                           |
| Joueurs                  | CRUD complet, postes, appétences                        |
| Indisponibilités         | Déclaration coach, affichage dans simulateur            |
| Matchs                   | CRUD, calendrier, score manuel                          |
| Mode match live          | Chronomètre, buts, changements, cartons — offline       |
| Entraînements            | Création manuelle, annulation, contenu de séance        |
| Bibliothèque d'exercices | CRUD, utilisation dans les plans de séance              |
| Assiduité                | Saisie simple (présent / absent / excusé)               |
| Composition              | Simulateur visuel, grisage des indisponibles            |
| Statistiques             | Taux de présence, postes joués, buts/cartons (via live) |
| Navigation               | PWA installable, offline partiel                        |
| RGPD                     | Stockage local uniquement, aucune donnée tiers          |

**Hors MVP :** suivi blessures, tournois, iCal, notifications, multi-utilisateurs, contacts/filiation, sondages, covoiturage, point de RDV, intégration fédération.

### 21.2 V1

| Module                   | Fonctionnalités ajoutées                                                   |
| ------------------------ | -------------------------------------------------------------------------- |
| Authentification         | Inscription, connexion, gestion de session                                 |
| Rôles                    | Admin, Coach, Parent avec droits différenciés                              |
| Contacts & filiation     | CRUD contacts, lien joueur ↔ contact                                       |
| Indisponibilités         | Déclaration parent, notification au coach                                  |
| Suivi des blessures      | Suivi complet, liaison automatique indisponibilité                         |
| Tournois                 | Création, poules, classement automatique                                   |
| Calendrier iCal          | Flux par équipe, joueur et parent                                          |
| Logistique               | Point de RDV, navigation GPS, covoiturage simplifié                        |
| Sondages de présence     | Création, réponse parent (intention + confirmation), tableau de bord coach |
| Notifications in-app     | Événements principaux + push PWA                                           |
| RGPD                     | Consentement, export, suppression                                          |
| Entraînements récurrents | Création en série, modification d'occurrence                               |

### 21.3 Évolutions ultérieures

| Module                      | Description                                            |
| --------------------------- | ------------------------------------------------------ |
| Intégration fédération      | Synchronisation calendrier et résultats                |
| Notifications email / SMS   | Canal complémentaire                                   |
| Organisation tournoi maison | Gestion terrains, équipes adverses, planning           |
| Compte joueur               | Saisie de l'intention par le joueur lui-même (sondage) |
| Analyse tactique            | Annotations, schémas dessinés                          |
| Application native          | Publication iOS / Android                              |
| Multi-club                  | Gestion de plusieurs clubs depuis un seul compte admin |
| Export PDF                  | Feuille de match, rapport d'assiduité                  |
| Estimation de trajet        | Intégration API cartographique                         |

---

## 22. Points ouverts

| Ref   | Sujet                                                                                                              | Impact                 | Priorité |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ---------------------- | -------- |
| PO-01 | Granularité à la minute pour l'historique des postes : saisie manuelle requise en plus du mode live ?              | Modèle, UX             | Haute    |
| PO-02 | Nombre de remplaçants autorisés en foot à 8 selon catégorie                                                        | Simulateur, mode live  | Haute    |
| PO-03 | Notifications email / SMS dans le périmètre V1 ?                                                                   | Architecture, coût     | Moyenne  |
| PO-04 | API fédération : disponibilité, format, documentation                                                              | Intégration fédération | Haute    |
| PO-05 | Hébergement prévu : prestataire, localisation (UE requis RGPD)                                                     | Architecture, RGPD     | Haute    |
| PO-06 | Gestion de plusieurs catégories (U11 + U13) dans la V1 ?                                                           | Structure de données   | Moyenne  |
| PO-07 | Délai de saisie de l'assiduité (7 jours) : configurable ou fixe ?                                                  | Règle métier           | Faible   |
| PO-08 | La composition peut-elle être partagée avec les parents ?                                                          | Notifications, droits  | Moyenne  |
| PO-09 | Gestion des surclassements : règles fédérales à respecter pour les indisponibilités ?                              | Données joueurs        | Haute    |
| PO-10 | Identité visuelle et charte graphique définies ?                                                                   | UI/UX                  | Faible   |
| PO-11 | Critères de départage dans les tournois : règle fixe ou configurable par tournoi ?                                 | Tournois               | Moyenne  |
| PO-12 | Score live pour les parents : push WebSocket ou polling ?                                                          | Architecture technique | Haute    |
| PO-13 | Bibliothèque d'exercices : partage inter-clubs prévu ?                                                             | Périmètre, données     | Faible   |
| PO-14 | Mode live : fenêtre de tolérance avant J-0 pour préparer la saisie ?                                               | UX, règle métier       | Moyenne  |
| PO-15 | Token iCal : durée de validité ou révocation manuelle uniquement ?                                                 | Sécurité, RGPD         | Moyenne  |
| PO-16 | API cartographique pour estimation de trajet et covoiturage : périmètre V1 ? Impact RGPD ?                         | Architecture, coût     | Moyenne  |
| PO-17 | Sondage — divergence entre tuteurs : résolution automatique (plus récente prévaut) ou décision manuelle du coach ? | Règle métier           | Haute    |
| PO-18 | Sondage — création automatique à la création d'un match : activée par défaut ou opt-in au niveau du club ?         | Paramétrage            | Faible   |
| PO-19 | Covoiturage — mise en relation directe entre parents envisagée en V2 ? (avec consentement explicite)               | RGPD, fonctionnel      | Faible   |

---

_Document v1.2 — 05/05/2026 — à valider avec les parties prenantes avant démarrage du développement._
