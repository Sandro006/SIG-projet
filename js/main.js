(function () {
  "use strict";

  // Cette app est minimaliste :
  // - on charge la carte (map-init.js)
  // - info-panel gère clic + affichage
  // - features.js expose des fonctions avancées pures + une légende

  const GEOJSON_URL = "./data/regions_madagascar.json";
  const CENTER_COORDS = [-18.87, 47.5];
  const ZOOM = 6;

  function initApp() {
    if (!window.initMap || !window.loadBaseLayer || !window.loadRegionsLayer) {
      console.error("Map scripts manquants (initMap/loadBaseLayer/loadRegionsLayer)." );
      return;
    }

    const map = window.initMap();
    window.loadBaseLayer(map);

    // Expose callback clic (info-panel)
    const onRegionClick = function (feature, layer) {
      if (typeof window.handleRegionClick === "function") {
        window.handleRegionClick(feature, layer);
      }
    };

    window.loadRegionsLayer(map, GEOJSON_URL, onRegionClick);

    // Légende (dégradé simple basé sur endémisme)
    if (typeof window.buildLegend === "function") {
      window.buildLegend(map, {
        stops: [
          { label: "< 60%", min: 0, max: 60, color: "#2c7fb8" },
          { label: "60–75%", min: 60, max: 75, color: "#7fcdbb" },
          { label: "75–90%", min: 75, max: 90, color: "#fdae61" },
          { label: ">= 90%", min: 90, max: 100, color: "#d73027" },
        ],
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
})();

