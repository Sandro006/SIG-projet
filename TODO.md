# TODO Détaillé — Répartition du Projet SIG Madagascar

## Principe de répartition

Pour que personne ne bloque personne, chaque personne travaille sur des **fichiers séparés** et respecte un **contrat d'interface fixé dès le départ** (schémas de données ci-dessous). Tant que chacun respecte ce contrat, le travail des autres n'a pas besoin d'être terminé pour avancer — on utilise des données factices ("mock") en attendant.

**Règle d'or** : personne ne modifie le fichier d'un autre. L'assemblage final se fait à la fin par la Personne 6.

---

## Contrat d'interface (à lire par TOUT LE MONDE avant de commencer)

### Schéma GeoJSON des régions (fourni par Personne 1)
Chaque région doit avoir une propriété `properties.nom_region` (string, identique aux clés du JSON faune/flore).

### Schéma JSON faune/flore (fourni par Personne 2)
```json
{
  "NomDeLaRegion": {
    "especes_emblematiques": ["string"],
    "taux_endemisme": "string",
    "menaces": ["string"],
    "aires_protegees": ["string"],
    "statut_conservation": "critique | vulnerable | stable"
  }
}
```

Ces deux formats sont figés dès le jour 1 (même si les données réelles ne sont pas encore prêtes) pour que tout le monde puisse coder contre des fichiers de test (`mock_regions.geojson` et `mock_faune_flore.json`) sans attendre.

---

## Dépendances globales du projet (à installer une seule fois, par Personne 6 lors de la mise en place du dépôt)

| Dépendance | Utilité | Installation |
|---|---|---|
| Leaflet.js (v1.9+) | Bibliothèque de cartographie interactive | CDN, pas de npm requis |
| Node.js + npm (optionnel) | Si serveur local de dev nécessaire | https://nodejs.org/ |
| Live Server (extension VS Code) | Serveur local pour tester sans backend | Extension VS Code |
| Git | Gestion de versions, obligatoire pour travail en équipe | https://git-scm.com/ |

Aucune dépendance backend n'est nécessaire pour ce projet (tout est statique : HTML/CSS/JS + fichiers JSON).

---

## PERSONNE 1 — Données géographiques (GeoJSON des régions)

**Fichier(s) à livrer** : `data/regions_madagascar.geojson`

**Dépendances à télécharger** :
- QGIS (https://qgis.org/) — pour ouvrir, éditer et convertir les fichiers Shapefile
- Mapshaper (en ligne, https://mapshaper.org/) — pas d'installation, juste le navigateur

**Tâches** :
1. Télécharger les limites administratives de Madagascar niveau région (ADM1) sur GADM (gadm.org)
2. Ouvrir dans QGIS, vérifier que chaque région a bien un champ `nom_region`
3. Simplifier la géométrie via Mapshaper si le fichier dépasse 2-3 Mo (pour éviter un site lent)
4. Exporter en GeoJSON, valider le fichier sur geojson.io
5. Livrer un fichier propre avec exactement les noms de régions convenus dans le contrat d'interface

**Aucune dépendance envers les autres** : ce travail peut commencer et finir sans attendre personne.

---

## PERSONNE 2 — Contenu faune/flore (données)

**Fichier(s) à livrer** : `data/faune_flore.json`

**Dépendances à télécharger** : aucune (juste un éditeur de texte/JSON, ex. VS Code)

**Sources à consulter** :
- GBIF (gbif.org) — occurrences d'espèces par région
- IUCN Red List (iucnredlist.org) — statut de conservation
- Vahatra (vahatra.mg) — synthèses scientifiques par région
- WWF Madagascar — données par écorégion

**Tâches** :
1. Lister les 22 régions administratives de Madagascar (mêmes noms que Personne 1 — se coordonner UNE FOIS au début sur la liste exacte des noms, puis travailler indépendamment)
2. Pour chaque région, renseigner 3-5 espèces emblématiques, le taux d'endémisme approximatif, les menaces principales, les aires protégées, le statut de conservation
3. Respecter strictement le schéma JSON du contrat d'interface
4. Livrer le fichier complet

**Aucune dépendance envers les autres**, à part la liste des noms de régions à valider avec Personne 1 en tout début de projet (5 minutes de coordination, pas plus).

---

## PERSONNE 3 — Carte de base (initialisation Leaflet)

**Fichier(s) à livrer** : `js/map-init.js`, `css/map.css`

**Dépendances à télécharger** :
- Leaflet.js via CDN (aucune installation, juste un lien `<script>` dans le HTML)

**Fonctions à créer** :

| Fonction | Utilité | Arguments |
|---|---|---|
| `initMap(containerId, centerCoords, zoomLevel)` | Initialise la carte Leaflet dans un `<div>` donné, centrée sur Madagascar | `containerId` (string, id du div), `centerCoords` (array [lat, lon]), `zoomLevel` (int) |
| `loadBaseLayer(map)` | Ajoute le fond de carte OpenStreetMap à la carte | `map` (objet Leaflet map) |
| `loadRegionsLayer(map, geojsonUrl, onRegionClickCallback)` | Charge le GeoJSON des régions et l'affiche sur la carte, avec gestion des clics via un callback fourni de l'extérieur | `map` (objet Leaflet), `geojsonUrl` (string, chemin vers le fichier), `onRegionClickCallback` (fonction, sera fournie par Personne 4) |
| `styleRegion(feature)` | Définit le style visuel d'une région (couleur, bordure, opacité) | `feature` (objet GeoJSON) |
| `highlightRegion(layer)` | Change le style d'une région au survol de la souris | `layer` (objet Leaflet layer) |
| `resetRegionStyle(layer)` | Remet le style par défaut quand la souris quitte la région | `layer` (objet Leaflet layer) |

**Travaille avec** : `data/mock_regions.geojson` (fichier factice fourni au démarrage) en attendant que Personne 1 finisse son vrai fichier. Le remplacement se fait en une ligne à la fin.

**Aucune dépendance bloquante envers les autres** : le callback de clic (`onRegionClickCallback`) est juste une fonction vide au début — Personne 4 la remplira dans son propre fichier.

---

## PERSONNE 4 — Panneau d'information (affichage des données)

**Fichier(s) à livrer** : `js/info-panel.js`, `css/panel.css`

**Dépendances à télécharger** : aucune (JS natif)

**Fonctions à créer** :

| Fonction | Utilité | Arguments |
|---|---|---|
| `renderInfoPanel(regionName, faunaFloreData)` | Affiche les données d'une région dans le panneau latéral (ou popup) | `regionName` (string), `faunaFloreData` (objet JSON de la région) |
| `getRegionData(regionName, dataSource)` | Récupère les données d'une région précise dans le fichier JSON chargé | `regionName` (string), `dataSource` (objet JSON complet) |
| `showConservationBadge(statut)` | Génère un badge coloré selon le statut de conservation (rouge/orange/vert) | `statut` (string : "critique", "vulnerable", "stable") |
| `closePanel()` | Ferme/vide le panneau d'information | aucun |
| `handleRegionClick(feature, layer)` | Fonction "callback" à transmettre à Personne 3 — orchestre l'appel à `getRegionData` puis `renderInfoPanel` | `feature` (objet GeoJSON), `layer` (objet Leaflet layer) |

**Travaille avec** : `data/mock_faune_flore.json` (fichier factice) en attendant Personne 2.

**Aucune dépendance bloquante** : développe et teste avec les mocks, branche son `handleRegionClick` à la carte de Personne 3 seulement à la fin (une ligne de code).

---

## PERSONNE 5 — Fonctionnalités avancées (filtres, recherche, légende)

**Fichier(s) à livrer** : `js/features.js`, `css/features.css`

**Dépendances à télécharger** : aucune (JS natif)

**Fonctions à créer** :

| Fonction | Utilité | Arguments |
|---|---|---|
| `buildLegend(map, colorScale)` | Ajoute une légende visuelle sur la carte | `map` (objet Leaflet), `colorScale` (objet de correspondance couleur/valeur) |
| `filterByCategory(category, allRegionsData)` | Filtre/recolore les régions selon une thématique (faune, flore, aires protégées) | `category` (string), `allRegionsData` (objet JSON complet) |
| `searchSpecies(query, allRegionsData)` | Cherche une espèce dans toutes les régions et retourne la liste des régions correspondantes | `query` (string), `allRegionsData` (objet JSON complet) |
| `compareRegions(regionA, regionB, allRegionsData)` | Retourne un objet comparatif entre deux régions (pour affichage côte à côte) | `regionA`, `regionB` (strings), `allRegionsData` (objet JSON) |
| `getColorByEndemisme(tauxEndemisme)` | Calcule une couleur en fonction du taux d'endémisme (pour la choroplèthe) | `tauxEndemisme` (string ou number) |

**Travaille avec** : `data/mock_faune_flore.json`, complètement indépendant de la carte tant que les fonctions restent pures (prennent des données en entrée, retournent un résultat, sans toucher au DOM directement au début).

**Aucune dépendance bloquante** : ces fonctions peuvent être testées seules dans la console du navigateur avant intégration finale.

---

## PERSONNE 6 — Structure du projet, déploiement, intégration finale, documentation

**Fichier(s) à livrer** : `index.html`, `README.md`, dépôt GitHub configuré, page déployée

**Dépendances à télécharger** :
- Git (https://git-scm.com/)
- Compte GitHub

**Tâches** (celles-ci arrivent surtout en fin de projet, donc cette personne peut aussi aider les autres en cours de route) :
1. Créer le dépôt GitHub et la structure de dossiers dès le jour 1 (voir arborescence ci-dessous)
2. Créer les fichiers `mock_regions.geojson` et `mock_faune_flore.json` **en tout premier**, avec 2-3 régions factices, pour débloquer immédiatement Personnes 3, 4 et 5
3. Rédiger le `README.md` (comment lancer le projet, structure, contributeurs)
4. En fin de projet, assembler tous les fichiers dans `index.html` (les balises `<script>` dans le bon ordre)
5. Remplacer les fichiers mock par les vrais fichiers de Personnes 1 et 2
6. Tester l'ensemble, corriger les bugs d'intégration
7. Déployer sur GitHub Pages
8. Vérifier le rendu sur mobile (responsive)

**Arborescence à créer dès le départ** :
```
projet-sig-madagascar/
├── index.html
├── README.md
├── css/
│   ├── map.css
│   ├── panel.css
│   └── features.css
├── js/
│   ├── map-init.js
│   ├── info-panel.js
│   └── features.js
└── data/
    ├── regions_madagascar.geojson       (Personne 1, à la fin)
    ├── faune_flore.json                  (Personne 2, à la fin)
    ├── mock_regions.geojson              (Personne 6, dès le jour 1)
    └── mock_faune_flore.json             (Personne 6, dès le jour 1)
```

---

## Ordre logique pour démarrer sans bloquer personne

1. **Jour 1 (30 minutes en groupe)** : tout le monde valide ensemble le contrat d'interface (noms des régions, schéma JSON, noms des fonctions). Personne 6 crée le dépôt et les fichiers mock.
2. **Jour 1 à J-2** : chacun travaille sur son fichier isolé avec les mocks.
3. **Avant la fin** : Personne 6 assemble tout dans `index.html`, remplace les mocks par les vraies données.
4. **Dernière étape** : tests globaux et déploiement.

Cette organisation garantit qu'aucune personne n'attend le travail d'une autre pour avancer, à l'exception d'une synchronisation unique de 30 minutes au tout début.