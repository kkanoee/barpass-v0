# v0PDF — spec mobile-first BarPass

Version dérivée du PDF `tmp-review/BarApp V1.pdf`, volontairement resserrée pour rester testable vite sans casser le prototype existant.

## Intention

`v0PDF` sert à faire commander des clients en boîte directement depuis leur téléphone.
Le parcours doit rester plus rapide qu'une commande classique au bar.

## Hypothèses produit

- le client est déjà dans le lieu
- l'entrée se fait par QR code, lien direct, ou code court
- le client peut continuer en invité
- le contexte lieu / bar est déjà connu
- le V0 privilégie le retrait au bar
- la livraison à table n'est pas dans le cœur du premier flux
- la personnalisation reste courte

## Parcours mobile cible

1. Entrée contextuelle (QR / lien / invité)
2. Carte mobile
3. Sélection d'un produit
4. Personnalisation courte
5. Panier
6. Paiement
7. Confirmation
8. Suivi temps réel
9. Retrait au bar

## Écrans

### 1. Entrée / landing mobile

Objectif : rassurer et faire démarrer le tunnel vite.

Contenu minimum :
- nom du lieu
- point de retrait
- attente moyenne
- CTA `Commander maintenant`
- CTA `Continuer en invité`

### 2. Carte mobile

Objectif : commander avec peu d'effort cognitif.

Principes :
- cartes produit larges
- prix visibles immédiatement
- peu de texte
- filtres rapides : tout / verres / bouteilles / softs
- menu court

### 3A. Customisation verre

Options courtes :
- volume
- variante
- accompagnement simple si nécessaire

### 3B. Customisation bouteille

Options courtes :
- pack standard ou premium
- taille / format
- softs essentiels

### 4. Panier et paiement

Objectif : convertir vite.

Contenu :
- lignes du panier
- total
- alias optionnel
- note courte optionnelle
- CTA `Payer et commander`

### 5. Confirmation

Objectif : supprimer le doute.

Contenu :
- numéro de commande
- point de retrait
- statut initial

### 6. Suivi

Statuts V0 :
- Reçue
- Préparation
- Prête
- Retirée

Le client doit toujours comprendre :
- où il en est
- où aller
- quand bouger

## Scope inclus

- entrée QR / lien / invité
- menu mobile-first
- filtres rapides
- produits verre et bouteille
- panier
- paiement simulé ou simple
- suivi de commande
- retrait au bar
- écran bar simple

## Scope explicitement exclu

- marketplace d'établissements
- profil utilisateur riche
- billetterie / prévente
- note / rating
- pourboire
- split payment
- skip queue comme feature autonome
- livraison à table complète
- fidélité / social

## Traduction produit dans le prototype

Le prototype courant implémente cette logique par :
- un écran d'entrée mobile
- un tunnel invité ou QR-like
- un filtrage mobile des produits
- une distinction claire entre verres, bouteilles et softs
- un panier/paiement court
- un suivi de commande toujours visible

## KPI de validation

- temps moyen avant ajout au panier
- temps moyen avant commande validée
- taux d'abandon panier
- temps entre commande et statut prête
- compréhension perçue du point de retrait
- débit côté bar
