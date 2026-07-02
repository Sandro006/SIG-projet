# Projet SIG Web — Carte Interactive Faune & Flore de Madagascar

## 1. Objectif du projet

Créer une carte web interactive de Madagascar où l'utilisateur peut cliquer/survoler une région et voir apparaître des données sur la faune, la flore et les enjeux de conservation de cette zone.

---

## 2. Technologies et références

### Cartographie (frontend)

| Technologie | Usage | Référence |
|---|---|---|
| **Leaflet.js** | Bibliothèque JS légère pour cartes interactives, idéale pour débuter | https://leafletjs.com/ |
| **Mapbox GL JS** | Alternative plus avancée, rendu vectoriel, meilleures perfs | https://docs.mapbox.com/mapbox-gl-js/ |
| **OpenLayers** | Alternative complète, plus complexe, très utilisée en SIG pro | https://openlayers.org/ |

### Données géographiques

| Source | Usage | Référence |
|---|---|---|
| **OpenStreetMap** | Fond de carte, données topographiques | https://www.openstreetmap.org/ |
| **GBIF** | Occurrences d'espèces (observations géolocalisées) | https://www.gbif.org/ |

### Imagerie satellite (fonctionnalités avancées)

| Technologie | Usage | Référence |
|---|---|---|
| **Google Earth Engine** | Analyse et visualisation d'images satellite (Sentinel, Landsat) dans le temps | https://earthengine.google.com/ |
| **Sentinel Hub** | API pour accéder aux images Sentinel-2 | https://www.sentinel-hub.com/ |
| **Copernicus Open Access Hub** | Téléchargement direct d'images Sentinel | https://scihub.copernicus.eu/ |

### Backend / gestion des données (si le projet grandit)

| Technologie | Usage | Référence |
|---|---|---|
| **PostGIS** | Extension spatiale de PostgreSQL, pour requêtes géographiques complexes | https://postgis.net/ |
| **GeoJSON statique** | Solution simple sans backend, suffisante pour un projet académique | https://geojson.org/ |

### Outils de préparation de données

| Outil | Usage | Référence |
|---|---|---|
| **QGIS** | Édition, nettoyage, conversion de données géographiques (shapefile → GeoJSON) | https://qgis.org/ |
| **Mapshaper** | Simplification et conversion rapide de GeoJSON en ligne | https://mapshaper.org/ |
| **geojson.io** | Éditeur visuel simple pour créer/modifier des GeoJSON | https://geojson.io/ |

---

## 3. Fonctionnalités

### Fonctionnalités de base (MVP — à faire en premier)

- [ ] Carte de Madagascar avec limites des régions affichées
- [ ] Clic sur une région → affichage d'un panneau/popup avec :
  - Liste des espèces endémiques principales (faune + flore)
  - Taux d'endémisme approximatif
  - Menaces principales (déforestation, braconnage, etc.)
  - Aires protégées présentes dans la région
- [ ] Effet visuel au survol (changement de couleur/opacité de la région)
- [ ] Légende de la carte

### Fonctionnalités intermédiaires

- [ ] **Filtres thématiques** : bouton pour basculer entre couches "faune", "flore", "aires protégées", "déforestation"
- [ ] **Barre de recherche** : chercher une espèce et voir dans quelle(s) région(s) elle apparaît
- [ ] **Comparateur de régions** : sélectionner deux régions et afficher leurs statistiques côte à côte
- [ ] **Légende dynamique en dégradé de couleur** (choroplèthe) selon un indicateur (ex. nombre d'espèces menacées)
- [ ] **Statut UICN par espèce** avec code couleur (rouge = en danger critique, orange = vulnérable, vert = préoccupation mineure)

### Fonctionnalités avancées (pour se démarquer)

- [ ] **Slider temporel** : comparer la couverture forestière entre deux dates (ex. 2000 vs 2024) via Sentinel/Landsat
- [ ] **Heatmap de biodiversité** : densité d'espèces en dégradé plutôt que simple polygone
- [ ] **Corridors écologiques** : visualiser les connexions entre aires protégées
- [ ] **Superposition de données climatiques** : température, précipitations, zones à risque
- [ ] **Export PDF** : générer un résumé imprimable de la région sélectionnée
- [ ] **Mode responsive/mobile** : adaptation de l'interface aux petits écrans

---

## 4. Guide pour débuter

### Étape 1 — Préparer les données géographiques

1. Télécharger les limites administratives de Madagascar sur GADM (niveau région, ADM1)
2. Si le fichier est un Shapefile, le convertir en GeoJSON avec QGIS ou Mapshaper
3. Simplifier le GeoJSON si le fichier est trop lourd (Mapshaper permet de réduire la précision sans perdre la forme générale)
4. Vérifier le fichier en le glissant sur geojson.io pour confirmer que les régions s'affichent correctement

### Étape 2 — Structurer les données faune/flore

Créer un fichier JSON séparé, indépendant du GeoJSON géographique, qui contient les infos par région. Exemple de structure :

```json
{
  "Analamanga": {
    "especes_emblematiques": ["Lémurien Indri", "Orchidée Angraecum"],
    "taux_endemisme": "85%",
    "menaces": ["déforestation", "agriculture sur brûlis"],
    "aires_protegees": ["Parc national d'Ankarafantsika"],
    "statut_conservation": "critique"
  }
}
```

Cette séparation (géométrie dans un fichier, attributs dans un autre) est une bonne pratique SIG classique — tu peux le mentionner dans ton exposé comme illustration du principe de séparation données spatiales / données attributaires.

### Étape 3 — Monter la structure du projet

```
projet-sig-madagascar/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── main.js
├── data/
│   ├── regions_madagascar.geojson
│   └── faune_flore.json
└── README.md
```

### Étape 4 — Coder la carte de base

Dans `index.html`, importer Leaflet via CDN, puis dans `main.js` :

1. Initialiser la carte centrée sur Madagascar (coordonnées approximatives : -18.87, 47.5, zoom 6)
2. Charger le fond de carte OpenStreetMap
3. Charger le GeoJSON des régions avec `fetch()` ou `L.geoJSON()` directement
4. Ajouter les événements `click` et `mouseover` sur chaque région

### Étape 5 — Lier les données au clic

Au clic sur une région, récupérer le nom de la région depuis les propriétés du GeoJSON, puis chercher les infos correspondantes dans le fichier `faune_flore.json` et les afficher dans un panneau ou un popup.

### Étape 6 — Styliser et tester

1. Ajouter une légende
2. Vérifier le rendu sur mobile
3. Tester avec toutes les régions pour s'assurer qu'aucune ne renvoie de données manquantes

### Étape 7 — Ajouter les fonctionnalités avancées (si le temps le permet)

Une fois le MVP fonctionnel et stable, ajouter progressivement les fonctionnalités intermédiaires puis avancées, en testant à chaque étape.

---

## 5. CPnseil Projet PResentation : 

1. Montrer la carte de base → illustrer le concept de **données vectorielles** (polygones = régions)
2. Montrer le clic avec les données → illustrer la **liaison données spatiales / attributaires**, cœur de tout SIG
3. Montrer une fonctionnalité avancée (slider temporel avec Sentinel) → illustrer l'apport de la **télédétection** dans le suivi des ressources naturelles

