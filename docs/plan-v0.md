# BarPass V0 Implementation Plan

Goal: livrer une V0 locale et fonctionnelle pour BarPass, pensée pour un seul point de retrait.

Architecture:
- une application web statique autonome
- données persistées dans le navigateur
- trois espaces dans la même app : client, bar, pilotage
- synchro temps réel légère via `localStorage` et `BroadcastChannel`

Décisions figées pour ce lot:
- un seul point de retrait
- paiement simulé validé à la commande
- aucun login
- menu court et personnalisations limitées
- une seule file de préparation

Lots:
1. socle UX et modèle de données
2. parcours client complet
3. écran bar minimal
4. pilotage du lieu et du point de retrait
5. validation de bout en bout
