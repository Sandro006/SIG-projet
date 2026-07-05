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
    // colorScale attendu: { stops: [{min,max,color}], defaultColor }
    // Ici on supporte un format simple: critique/vulnerable/stable selon %.
    const v = parseEndemisme(tauxEndemisme);
    if (v === null) return "#8a8a8a";

    // Palette simple (à ajuster si besoin)
    if (v < 60) return "#2c7fb8"; // bleu
    if (v < 75) return "#7fcdbb"; // cyan/vert
    if (v < 90) return "#fdae61"; // orange
    return "#d73027"; // rouge
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
          { label: "< 60", min: 0, max: 60, color: "#2c7fb8" },
          { label: "60-75", min: 60, max: 75, color: "#7fcdbb" },
          { label: "75-90", min: 75, max: 90, color: "#fdae61" },
          { label: ">= 90", min: 90, max: 100, color: "#d73027" },
        ];

    const defaultColor = colorScale?.defaultColor || "#8a8a8a";

    // Empêche les doublons
    if (map._featuresLegendEl) {
      map._featuresLegendEl.remove();
      map._featuresLegendEl = null;
    }

    const legend = document.createElement("div");
    legend.className = "map-legend";

    legend.innerHTML = `
      <div class="map-legend__title">Endémisme</div>
      <div class="map-legend__items">
        ${stops
          .map(
            (s) => `
              <div class="map-legend__row">
                <span class="map-legend__swatch" style="background:${s.color || defaultColor}"></span>
                <span class="map-legend__label">${s.label || ""}</span>
              </div>
            `
          )
          .join("")}
      </div>
    `;

    // Leaflet Control (plus fiable que d'insérer directement)
    // On n'utilise pas L.control si absent (tests console)
    if (typeof window.L?.control?.position === "function" || typeof window.L?.control === "object") {
      const control = window.L.control({ position: "bottomright" });
      control.onAdd = function () {
        map._featuresLegendEl = legend;
        return legend;
      };
      control.addTo(map);
      map._featuresLegendControl = control;
    } else {
      // fallback: append body
      document.body.appendChild(legend);
      map._featuresLegendEl = legend;
    }
  }

  /**
   * Filtre/recolore les régions selon une thématique.
   * Fonction "logique" : renvoie la liste des régions visibles et une couleur par région.
   * @param {string} category "faune" | "flore" | "aires protégées" | "aires_protegees" | etc.
   * @param {object} allRegionsData JSON complet
   * @returns {{visibleRegions: string[], colorByRegion: Record<string,string>}}
   */
  function filterByCategory(category, allRegionsData) {
    const cat = normalizeText(category);
    const allKeys = allRegionsData && typeof allRegionsData === "object" ? Object.keys(allRegionsData) : [];

    // Sur les mocks, on ne distingue pas faune vs flore : on utilise un heuristique sur le champ.
    // - faune: présence des mots "Lémur" ou "Indri" etc.
    // - flore: présence de mots "Orchid" "Baobab" "Pachypodium" ...
    // - aires protégées: priorité à "aires_protegees" non vide

    const faunaHints = ["lemur", "indri", "sifaka", "aye", "pteropus", "pangolin", "chameleon", "phelsuma", "fandranganana", "oustalet"];
    const floreHints = ["orchid", "baobab", "pachypodium", "ravenala", "angraecum", "foug", "euphor" ,"rosulatum", "lineata", "barbouri", "madagascariensis"]; 

    function containsAny(str, hints) {
      const s = normalizeText(str);
      return hints.some((h) => s.includes(normalizeText(h)));
    }

    const visible = [];
    const colorByRegion = {};

    for (const regionName of allKeys) {
      const d = allRegionsData[regionName] || {};
      const species = Array.isArray(d.especes_emblematiques) ? d.especes_emblematiques.join(" ") : "";
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
   * @param {string} query
   * @param {object} allRegionsData
   * @returns {{species:string, matches: Array<{region:string}>}} 
   */
  function searchSpecies(query, allRegionsData) {
    const q = normalizeText(query);
    if (!q) return { species: query, matches: [] };

    const res = [];
    const keys = allRegionsData && typeof allRegionsData === "object" ? Object.keys(allRegionsData) : [];

    for (const regionName of keys) {
      const d = allRegionsData[regionName];
      const species = Array.isArray(d?.especes_emblematiques) ? d.especes_emblematiques : [];
      const hit = species.some((sp) => normalizeText(sp).includes(q));
      if (hit) res.push({ region: regionName });
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

    return {
      regionA,
      regionB,
      dataA: a,
      dataB: b,
      taux_endemisme_A: a?.taux_endemisme ?? null,
      taux_endemisme_B: b?.taux_endemisme ?? null,
      couleurA: getColorByEndemisme(a?.taux_endemisme),
      couleurB: getColorByEndemisme(b?.taux_endemisme),
    };
  }

  // Exposition globale (pour console + intégration tardive)
  window.buildLegend = buildLegend;
  window.filterByCategory = filterByCategory;
  window.searchSpecies = searchSpecies;
  window.compareRegions = compareRegions;
  window.getColorByEndemisme = getColorByEndemisme;

  // Export optionnel (CommonJS/ESM) non nécessaire ici.
})();

