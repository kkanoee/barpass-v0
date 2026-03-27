# BarPass — plan concret de progression après la V0

Ce document traduit la réflexion actuelle du projet en séquence d’exécution claire.

Position retenue à ce stade :
- ne pas partir tout de suite sur une app native iOS/Android
- transformer d’abord la V0 actuelle en vrai prototype partagé
- viser ensuite une PWA installable avant toute décision mobile plus lourde

## Pourquoi cette direction

La V0 actuelle permet déjà de discuter le flux. Ce qui manque n’est pas d’abord une app native, mais la preuve que le workflow BarPass améliore vraiment l’expérience client et la fluidité côté bar.

Le coût d’une vraie app mobile devient pertinent seulement quand les questions produit de base sont stabilisées :
- structure du flow
- statuts utiles
- logique de retrait
- information affichée au client
- charge cognitive côté bar
- besoin réel de fonctionnalités natives

## Phase 1 — Validation terrain du workflow

Objectif : vérifier que le flux fonctionne en situation quasi réelle et apprendre où ça casse.

### Tâches produit
- définir 5 à 8 scénarios de test
- figer ce qu’on veut observer pendant les tests
- formaliser les questions de feedback client et bar
- définir les métriques qualitatives minimum

### Tâches UX
- revoir les micro-textes de statut
- clarifier les écrans client et bar pour un usage sans explication longue
- réduire les éléments secondaires dans le parcours
- préparer une version de démo propre pour tests internes

### Tâches opérationnelles
- simuler plusieurs commandes en parallèle
- observer si le point de retrait unique est lisible
- tester la gestion de rupture produit
- tester les moments où le bar doit faire progresser rapidement plusieurs commandes

### Livrable attendu
- liste des frictions réelles
- décisions sur ce qui reste, ce qui change, ce qui sort
- validation ou invalidation du point de retrait unique comme base de départ

## Phase 2 — Prototype partagé multi-postes

Objectif : passer de la démo locale à un prototype que plusieurs personnes peuvent utiliser en même temps.

### Tâches techniques prioritaires
- ajouter un backend léger
- stocker les commandes côté serveur
- synchroniser les vues client et bar en temps réel
- garder le même périmètre produit

### Stack cible raisonnable
- front web simple
- backend Node ou autre stack légère
- base de données minimale
- WebSocket ou équivalent pour les changements de statut
- déploiement cloud simple pour tests internes

### Ce que cette phase doit couvrir
- plusieurs appareils voient les mêmes commandes
- la file bar est commune
- le client reçoit les bons changements de statut
- la logique de retrait reste unique et claire
- l’expérience reste plus simple, pas plus ambitieuse

### Livrable attendu
- une alpha partagée testable par plusieurs collègues
- un lien unique de test
- un comportement cohérent entre plusieurs postes

## Phase 3 — PWA installable et préparation V1

Objectif : obtenir un rendu “app” crédible sans prendre tout de suite la dette d’une app native.

### Tâches produit
- confirmer que le téléphone est bien le device principal
- identifier les besoins qui justifieraient plus tard du natif
- décider quelles fonctionnalités restent web-first

### Tâches techniques
- transformer l’app en PWA
- ajouter icônes, manifest, mode installable
- améliorer responsive mobile
- préparer un mode d’ouverture direct type app

### Ce qu’on n’ouvre pas encore
- app native séparée iOS/Android
- multi-établissements avancé
- paiements natifs complexes
- analytics riches
- fonctionnalités “nice to have” non validées terrain

### Livrable attendu
- une version installable sur téléphone
- un rendu beaucoup plus proche d’une app
- une base concrète pour décider si le natif est vraiment nécessaire

## Décision stratégique actuelle

La recommandation n’est pas : “faire une app mobile maintenant”.

La recommandation est :
1. valider le workflow réel
2. rendre le prototype partagé
3. passer en PWA
4. seulement ensuite décider si une app native apporte une valeur supplémentaire

## Backlog immédiat recommandé

### Lot A — très court terme
- consigner les scénarios de test terrain
- enrichir la documentation produit
- reprendre le Figma avec la V0 réelle en référence
- recueillir les retours de premiers testeurs

### Lot B — prochain lot technique
- choisir l’architecture backend légère
- implémenter stockage partagé + temps réel
- déployer une alpha accessible à plusieurs testeurs
- conserver le même scope produit

### Lot C — après validation
- passage PWA
- amélioration mobile
- éventuels paiements réels
- décision sur la suite applicative
