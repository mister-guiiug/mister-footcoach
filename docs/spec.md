# Prompt IA — Rédaction de spécifications pour une application PWA de gestion d’équipes jeunes de foot à 8 (U18)

Tu es un **analyste fonctionnel senior / product owner** chargé de rédiger des **spécifications fonctionnelles et techniques de haut niveau** pour une **nouvelle application web**, destinée à un **club de football**, pour la gestion d’une **catégorie jeunes (foot à 8, moins de 18 ans)**.

L’application sera une **PWA (Progressive Web App)**, utilisable sur mobile, tablette et desktop.

---

## 1. Contexte et objectifs

Le club gère une **catégorie** composée de **plusieurs équipes jeunes** (ex. U13 A, U13 B, etc.).  
L’application doit couvrir à la fois :

- l’organisation sportive
- la gestion des joueurs et des contacts légaux
- le suivi des entraînements
- la planification et le suivi des matchs
- la simulation des compositions et des postes
- la communication via notifications

### Objectifs principaux

- Fiabiliser les données (joueurs, contacts, calendriers)
- Faciliter le travail des coachs
- Donner de la visibilité aux parents
- Garantir la conformité RGPD (données de mineurs)
- Fournir une base durable et évolutive

---

## 2. Rôles utilisateurs et droits

L’application doit gérer des **rôles utilisateurs** avec des **droits différenciés**.

### 2.1 Rôles minimum

#### Admin

- Gestion du club, des catégories et des équipes
- Gestion des utilisateurs et de leurs rôles
- Accès complet à toutes les données
- Paramétrage global :
  - saisons
  - référentiels
  - intégration fédération
  - notifications

#### Coach

- Gestion des équipes dont il est responsable
- Gestion des joueurs :
  - postes
  - appétences
  - historique
- Création et modification :
  - entraînements
  - matchs
  - compositions
- Suivi de l’assiduité
- Accès aux statistiques sportives
- Accès en lecture aux contacts légaux

#### Parent / Contact

- Accès limité aux informations de son ou ses enfants
- Consultation :
  - calendriers (matchs, entraînements)
  - lieux
  - horaires
  - statuts
  - notifications
- Aucun droit de modification sportive

### Attendus

- Description précise des **droits par rôle**
- **Matrice rôles / permissions**
- Règles de cumul ou héritage des rôles  
  _(ex. un coach peut également être parent)_

---

## 3. Gestion des joueurs

### 3.1 Données joueur

Chaque joueur doit inclure :

- Identité
- Équipe(s) associée(s) :
  - 1 ou 2 équipes maximum
  - une **équipe principale obligatoire**
- Poste de prédilection
- Appétence par poste
- Historique des postes joués

### 3.2 Historique des postes

Niveau de détail attendu :

- **Par match**
- **Par période / temps de jeu**  
  (ex. mi-temps, quart-temps, minutes si pertinent)

À préciser :

- Modèle de données
- Impacts sur les statistiques
- Granularité (fixe ou configurable)

---

## 4. Contacts et filiation (parents / tuteurs)

- Un joueur peut être lié à **plusieurs contacts**
  - père
  - mère
  - beau-père
  - autre
- **Un même contact peut être rattaché à plusieurs enfants**
- Chaque lien doit préciser le **type de relation**
- Les contacts peuvent être des **utilisateurs (rôle parent)**

À inclure :

- Règles de gestion
- Contraintes de suppression  
  _(ex. contact partagé par plusieurs enfants)_
- Modèle de données et relations

---

## 5. Matchs, tournois et calendrier

Chaque match doit comporter :

- Date et heure
- Lieu
- Adresse
- Statut :
  - `prévisionnel`
  - `engagé`
  - `saison`
- Information de **phase**  
  _(ex. poule, phase aller, tournoi)_

Le calendrier doit être consultable :

- Par équipe
- Par joueur
- Par contact (parent)

---

## 6. Intégration avec la fédération

L’intégration avec la fédération se fait **via API**.

À préciser :

- Données récupérées :
  - calendrier
  - résultats
- Fréquence de synchronisation
- Stratégie de rapprochement avec les données internes
- Gestion des conflits (fédération vs données locales)
- Gestion des erreurs et indisponibilités API

---

## 7. Entraînements

Fonctionnalités attendues :

- Planification d’entraînements récurrents
- Affichage des horaires
- Gestion des cas particuliers :
  - décalage horaire (ex. +1h pour éclairage)
  - entraînement exceptionnel
  - annulation
- Historisation des modifications

---

## 8. Assiduité et statistiques

### Assiduité

- Présence / absence par joueur et par séance

### Statistiques

- Périodes :
  - temps glissant
  - depuis début de saison
- Filtres :
  - joueur
  - équipe
  - période

---

## 9. Simulation de composition et positionnement

L’application doit permettre :

- Simulation de schémas (ex. 4-4-2)
- Simulation de compositions d’équipe

Basée sur :

- Poste de prédilection
- Appétences
- Historique réel des postes joués

Les règles doivent être :

- explicites
- documentées
- configurables si nécessaire

---

## 10. Notifications (in-app)

L’application doit proposer des **notifications in-app** pour :

- Changements d’horaires
- Entraînement exceptionnel ou annulé
- Nouveau match ou match modifié
- Publication de composition (si pertinent)

À préciser :

- Événements déclencheurs
- Destinataires selon les rôles
- Paramétrage utilisateur
- Lien avec le consentement RGPD

---

## 11. RGPD et données de mineurs

Exigences obligatoires :

- Consentement explicite des représentants légaux
- Traçabilité du consentement
- Droits utilisateurs :
  - accès
  - rectification
  - suppression
- Limitation des accès selon rôle
- Sécurité et hébergement des données

---

## 12. Attendus formels du livrable

Le document final doit inclure :

- Spécifications fonctionnelles détaillées
- Règles de gestion explicites
- Modèle de données conceptuel
- User stories avec critères d’acceptation  
  _(Given / When / Then)_
- Découpage clair :
  - MVP
  - V1
  - Évolutions ultérieures

### Contraintes de rédaction

- Français
- Ton professionnel
- Aucune invention  
  → toute incertitude doit être listée explicitement
