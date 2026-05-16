# Timeline Continue 9 Jours — Design Spec
Date : 2026-05-16

## Contexte

Actuellement, la timeline de l'accueil affiche une fenêtre de ~50h centrée sur aujourd'hui. Les chips de jours rechargent les données pour le jour sélectionné. L'utilisateur veut une **timeline unique et continue de 9 jours** que l'on navigue par scroll, les chips servant à la fois de navigation rapide et d'indicateur de position.

---

## Objectif

Remplacer le modèle "jour sélectionné → rechargement" par un modèle "scroll continu → position partagée dans toute l'app".

---

## Architecture

### Source de vérité : `selectedDate` dans AppNavigator

`selectedDate` reste le state central dans `AppNavigator`. Il est désormais mis à jour par **trois sources** :
1. Tap sur un chip DateStrip (comportement actuel)
2. Scroll de la timeline qui franchit minuit → `onDayChange(date)`
3. Tap sur un chip DateStrip dans TideScreen ou WindScreen

`selectedDate` pilote l'affichage dans **tous** les écrans : Home, Marées, Vent.

### Suppression de `scrubOffset`

Le concept de `scrubOffset` (décalage temporaire par rapport à "maintenant") est **supprimé**. Le scroll de la timeline est la navigation permanente — la position persiste quand on arrête de scroller.

Le scrub (glisser pour voir date+heure dans la carte verdict) reste fonctionnel, mais il est indépendant du scroll de navigation.

---

## Composants modifiés

### 1. `VerdictTimeline`

**Entrées :**
- `scores: number[]` — 216 valeurs (9j × 24h) au lieu de 50
- `tideHeights: number[]` — 216 valeurs
- `nowIndex: number` — index de l'heure courante dans le tableau
- `onDayChange: (date: Date) => void` — callback quand le scroll franchit un nouveau jour
- `ref` exposant `scrollToDay(date: Date)` — permet aux chips de scroller programmatiquement

**Comportement :**
- Au montage : scroll automatique vers `nowIndex` (heure courante visible)
- Marqueur "maintenant" visible sur la barre correspondante
- Séparateurs visuels entre les jours (label du jour au-dessus de la barre minuit)
- `onMomentumScrollEnd` + `onScrollEndDrag` détectent le jour central visible → `onDayChange`

**Scrub :** le glisser-doigter sur la timeline affiche date + heure dans la carte verdict (comportement conservé, mais relatif à la position absolue dans le tableau plutôt qu'un offset depuis now).

### 2. `HomeScreen`

- Supprime `scrubOffset` et tout ce qui en dépend
- Calcule **216 scores** et **216 tideHeights** (au lieu de 50)
- Passe `scrollToDay` ref aux chips via `DateStrip`
- Reçoit `onDayChange` de `VerdictTimeline` → appelle `onSelectDate` vers AppNavigator
- `DateStrip` reçoit `selectedDate` (mis à jour en temps réel par le scroll)

### 3. `AppNavigator`

- Passe `onSelectDate` à TideScreen et WindScreen (déjà disponible, juste pas transmis)
- Étend `fetchTideData` de 2 jours à **9 jours**

### 4. `TideScreen`

- Reçoit `selectedDate`, `maxDate`, `onSelectDate` depuis AppNavigator
- Ajoute `DateStrip` en haut de l'écran (même composant, même comportement)

### 5. `WindScreen`

- Reçoit `selectedDate`, `maxDate`, `onSelectDate` depuis AppNavigator
- Ajoute `DateStrip` en haut de l'écran

### 6. `tideService` / `remoteTideService`

- `fetchTideData` : paramètre `days` passe de 2 à 9
- Vérifier que l'API supporte 9 jours (api-maree.fr et le cache distant)

---

## Données

| Source | Actuel | Nouveau |
|--------|--------|---------|
| `weatherData.hourly` | 216h ✓ | inchangé |
| `tideData.points` | ~2 jours | 9 jours |
| Scores VerdictTimeline | 50 valeurs | 216 valeurs |
| tideHeights | 50 valeurs | 216 valeurs |

---

## Calcul des scores 216h

Dans `HomeScreen`, la fonction `buildWindowScores` est étendue pour couvrir 9 jours depuis minuit du premier jour disponible. L'index `nowIndex` est calculé comme `heures écoulées depuis le début du tableau`.

---

## Marqueurs visuels dans la timeline

- **Maintenant** : barre légèrement plus large ou point au-dessus
- **Séparateur de jour** : ligne verticale fine + label court (`Sam 17`, `Dim 18`…) au-dessus de chaque barre de minuit
- Ces labels remplacent les heures `0h` déjà affichés aux minuits

---

## Comportement au chargement

1. Données chargées → 216 scores calculés
2. Timeline monte → scroll automatique vers `nowIndex`
3. Chip du jour actuel encadré
4. Label verdict : "Maintenant · 14h00"

---

## Ce qui ne change pas

- Design visuel des barres (couleurs verdict)
- Composant `DateStrip` (inchangé)
- Composant `Compass`, `AppLogo`, etc.
- Navigation entre écrans (FabNav)
- Logique de calcul des scores (`verdictCalculator`)

---

## Hors scope

- Animation de transition entre jours
- Retour automatique à "maintenant" après inactivité (décidé : hors scope pour l'instant)
- Virtualisation de la ScrollView (216 barres est gérable sans)
