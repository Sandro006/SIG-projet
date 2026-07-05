(function () {
  "use strict";

  // --- Pure helpers (pas de DOM) ---

  function normalizeText(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function parseEndemisme(tauxEndemisme) {
    if (tauxEndemisme === null || tauxEndemisme === undefined) return null;
    const s = String(tauxEndemisme);

    // Ex: "80-90%" => moyenne
    const range = s.match(/(\d+(?:[\.,]\d+)?)\s*[-–]\s*(\d+(?:[\.,]\d+)?)\s*%?/);
    if (range) {
      const a = Number(range[1].replace(",", "."));
      const b = Number(range[2].replace(",", "."));
      if (!Number.isNaN(a) && !Number.isNaN(b)) return (a + b) / 2;
    }

    // Ex: "85%" ou "85"
    const num = s.match(/(\d+(?:[\.,]\d+)?)/);
    if (num) {
      const v = Number(num[1].replace(",", "."));
      return Number.isNaN(v) ? null : v;
    }

    return null;
  }

  function getColorByEndemisme(tauxEndemisme) {
    const v = parseEndemisme(tauxEndemisme);
    if (v === null) return "#8a8a8a";

    // Palette simple (à ajuster si besoin)
    if (v < 60) return "#2c7fb8"; // bleu
    if (v < 75) return "#7fcdbb"; // cyan/vert
    if (v < 90) return "#fdae61"; // orange
    return "#d73027"; // rouge
  }

  /**
   * Extrait les noms d'espèces d'une région (supporte les deux formats)
   */
  function extractSpeciesNames(regionData) {
    if (!regionData) return [];
    const species = regionData.especes_emblematiques || [];
    return species.map((item) => {
      if (typeof item === 'object' && item.nom) return item.nom;
      if (typeof item === 'string') return item;
      return String(item);
    });
  }

  /**
   * Extrait les clés de photos d'une région
   */
  function extractPhotoKeys(regionData) {
    if (!regionData) return [];
    const species = regionData.especes_emblematiques || [];
    return species.map((item) => {
      if (typeof item === 'object' && item.photos && Array.isArray(item.photos)) {
        return item.photos[0] || item.nom;
      }
      if (typeof item === 'object' && item.nom) return item.nom;
      if (typeof item === 'string') return item;
      return String(item);
    });
  }

  // --- API demandée par le TODO ---

  /**
   * Ajoute une légende visuelle sur la carte.
   * @param {object} map Leaflet map
   * @param {{stops?: Array<{label?:string,min?:number,max?:number,color:string}>, defaultColor?:string}} colorScale
   */
function buildLegend(map, colorScale) {
  if (!map) return;

  const stops = Array.isArray(colorScale?.stops)
    ? colorScale.stops
    : [
        { label: "< 60%", min: 0, max: 60, color: "#2c7fb8" },
        { label: "60-75%", min: 60, max: 75, color: "#7fcdbb" },
        { label: "75-90%", min: 75, max: 90, color: "#fdae61" },
        { label: "≥ 90%", min: 90, max: 100, color: "#d73027" },
      ];

  const defaultColor = colorScale?.defaultColor || "#8a8a8a";

  // Empêche les doublons
  if (map._featuresLegendEl) {
    map._featuresLegendEl.remove();
    map._featuresLegendEl = null;
  }

  const legend = document.createElement("div");
  legend.className = "map-legend";

  // Générer le gradient
  const gradientColors = stops.map(s => s.color).join(', ');

  legend.innerHTML = `
    <div class="map-legend__title">🌿 Taux d'endémisme</div>
    
    <div class="map-legend__gradient">
      ${stops.map((s) => `
        <div class="map-legend__gradient-stop" style="background:${s.color}"></div>
      `).join('')}
    </div>
    <div class="map-legend__gradient-labels">
      <span>0%</span>
      <span>50%</span>
      <span>100%</span>
    </div>

    <div style="margin-top: 10px; border-top: 1px solid rgba(30,43,34,0.08); padding-top: 10px;">
      <div class="map-legend__items">
        ${stops
          .map(
            (s) => `
              <div class="map-legend__row">
                <span class="map-legend__swatch" style="background:${s.color || defaultColor}"></span>
                <span class="map-legend__label">${s.label || ""}</span>
                <span class="map-legend__value">${s.min || 0}–${s.max || 100}%</span>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;

  // Leaflet Control
  if (typeof window.L?.control === "object") {
    const control = window.L.control({ position: "bottomright" });
    control.onAdd = function () {
      map._featuresLegendEl = legend;
      return legend;
    };
    control.addTo(map);
    map._featuresLegendControl = control;
  } else {
    document.body.appendChild(legend);
    map._featuresLegendEl = legend;
  }
}

  /**
   * Filtre/recolore les régions selon une thématique.
   * @param {string} category "faune" | "flore" | "aires_protegees" | "menaces"
   * @param {object} allRegionsData JSON complet
   * @returns {{visibleRegions: string[], colorByRegion: Record<string,string>}}
   */
  function filterByCategory(category, allRegionsData) {
    const cat = normalizeText(category);
    const allKeys = allRegionsData && typeof allRegionsData === "object" ? Object.keys(allRegionsData) : [];

    // Mots-clés pour la faune et la flore (basés sur les noms d'espèces)
    const faunaHints = [
      "lemur", "indri", "sifaka", "aye", "pteropus", "pangolin", 
      "chameleon", "phelsuma", "fandranganana", "oustalet", "tangue",
      "tenrec", "maki", "catta", "propithecus", "daubentonia",
      "lepilemur", "heterixalus", "gecko", "grenouille"
    ];
    
    const floreHints = [
      "orchid", "baobab", "pachypodium", "ravenala", "angraecum",
      "foug", "euphor", "rosulatum", "lineata", "barbouri",
      "madagascariensis", "bambou", "bambusa", "cyathea", "adansonia"
    ];

    function containsAny(str, hints) {
      const s = normalizeText(str);
      return hints.some((h) => s.includes(normalizeText(h)));
    }

    function getSpeciesNames(regionData) {
      return extractSpeciesNames(regionData).join(" ");
    }

    const visible = [];
    const colorByRegion = {};

    for (const regionName of allKeys) {
      const d = allRegionsData[regionName] || {};
      const species = getSpeciesNames(d);
      const threats = Array.isArray(d.menaces) ? d.menaces.join(" ") : "";
      const protectedAreas = Array.isArray(d.aires_protegees) ? d.aires_protegees.join(" ") : "";

      let ok = true;

      if (cat.includes("faun")) {
        ok = containsAny(species, faunaHints);
      } else if (cat.includes("flor")) {
        ok = containsAny(species, floreHints);
      } else if (cat.includes("aire") || cat.includes("proteg")) {
        ok = protectedAreas && protectedAreas.trim().length > 0;
      } else if (cat.includes("menac")) {
        ok = threats && threats.trim().length > 0;
      }

      if (ok) {
        visible.push(regionName);
        colorByRegion[regionName] = getColorByEndemisme(d.taux_endemisme);
      }
    }

    return { visibleRegions: visible, colorByRegion };
  }

  /**
   * Cherche une espèce dans toutes les régions.
   * Supporte la recherche dans les noms d'espèces (objets ou chaînes)
   * @param {string} query
   * @param {object} allRegionsData
   * @returns {{species:string, matches: Array<{region:string, species: string}>}} 
   */
  function searchSpecies(query, allRegionsData) {
    const q = normalizeText(query);
    if (!q) return { species: query, matches: [] };

    const res = [];
    const keys = allRegionsData && typeof allRegionsData === "object" ? Object.keys(allRegionsData) : [];

    for (const regionName of keys) {
      const d = allRegionsData[regionName];
      const species = extractSpeciesNames(d);
      
      // Trouver les espèces qui correspondent
      const matchingSpecies = species.filter((sp) => normalizeText(sp).includes(q));
      
      if (matchingSpecies.length > 0) {
        matchingSpecies.forEach((sp) => {
          res.push({ 
            region: regionName, 
            species: sp 
          });
        });
      }
    }

    return { species: query, matches: res };
  }

  /**
   * Retourne un objet comparatif entre deux régions.
   * @param {string} regionA
   * @param {string} regionB
   * @param {object} allRegionsData
   */
  function compareRegions(regionA, regionB, allRegionsData) {
    function pick(name) {
      if (!name) return null;
      if (Object.prototype.hasOwnProperty.call(allRegionsData, name)) return allRegionsData[name];
      const n = normalizeText(name);
      const key = Object.keys(allRegionsData || {}).find((k) => normalizeText(k) === n);
      return key ? allRegionsData[key] : null;
    }

    const a = pick(regionA);
    const b = pick(regionB);

    // Extraire les espèces communes et uniques
    const speciesA = extractSpeciesNames(a);
    const speciesB = extractSpeciesNames(b);
    
    const setA = new Set(speciesA);
    const setB = new Set(speciesB);
    
    const common = speciesA.filter((s) => setB.has(s));
    const uniqueA = speciesA.filter((s) => !setB.has(s));
    const uniqueB = speciesB.filter((s) => !setA.has(s));

    return {
      regionA,
      regionB,
      dataA: a,
      dataB: b,
      taux_endemisme_A: a?.taux_endemisme ?? null,
      taux_endemisme_B: b?.taux_endemisme ?? null,
      couleurA: getColorByEndemisme(a?.taux_endemisme),
      couleurB: getColorByEndemisme(b?.taux_endemisme),
      // Ajout d'informations comparatives supplémentaires
      speciesCountA: speciesA.length,
      speciesCountB: speciesB.length,
      commonSpecies: common,
      uniqueSpeciesA: uniqueA,
      uniqueSpeciesB: uniqueB,
      statutA: a?.statut_conservation ?? null,
      statutB: b?.statut_conservation ?? null,
    };
  }

  /**
   * Récupère toutes les espèces uniques présentes dans les données
   * @param {object} allRegionsData
   * @returns {Array<{nom: string, regions: string[], photoKey: string}>}
   */
  function getAllUniqueSpecies(allRegionsData) {
    const speciesMap = new Map();
    const keys = allRegionsData && typeof allRegionsData === "object" ? Object.keys(allRegionsData) : [];

    for (const regionName of keys) {
      const d = allRegionsData[regionName];
      const speciesList = d?.especes_emblematiques || [];
      
      speciesList.forEach((item) => {
        const nom = typeof item === 'object' ? item.nom : item;
        const photoKey = typeof item === 'object' && item.photos?.length > 0 
          ? item.photos[0] 
          : nom;
        
        if (!speciesMap.has(nom)) {
          speciesMap.set(nom, {
            nom: nom,
            photoKey: photoKey,
            regions: []
          });
        }
        speciesMap.get(nom).regions.push(regionName);
      });
    }

    return Array.from(speciesMap.values());
  }

  // Exposition globale
  window.buildLegend = buildLegend;
  window.filterByCategory = filterByCategory;
  window.searchSpecies = searchSpecies;
  window.compareRegions = compareRegions;
  window.getColorByEndemisme = getColorByEndemisme;
  window.extractSpeciesNames = extractSpeciesNames;
  window.extractPhotoKeys = extractPhotoKeys;
  window.getAllUniqueSpecies = getAllUniqueSpecies;

})();