(function () {
  "use strict";

  const DATA_URLS = ["data/mock_faune_flore.json", "data/faune_flore.json"];
  let cachedFaunaFloreData = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeText(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function getPanelElement() {
    let panel = document.getElementById("info-panel");

    if (!panel) {
      panel = document.createElement("aside");
      panel.id = "info-panel";
      panel.className = "info-panel";
      panel.setAttribute("aria-live", "polite");
      document.body.appendChild(panel);
    }

    return panel;
  }

  function listItems(items, emptyLabel) {
    if (!Array.isArray(items) || items.length === 0) {
      return `<p class="panel-empty">${escapeHtml(emptyLabel)}</p>`;
    }

    return `
      <ul class="panel-list">
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    `;
  }

  // Fonction 1 
  function renderInfoPanel(regionName, faunaFloreData) {
    const panel = getPanelElement();
    panel.classList.add("info-panel--open");

    if (!faunaFloreData) {
      panel.innerHTML = `
        <div class="panel-header">
          <div>
            <p class="panel-kicker">Region selectionnee</p>
            <h2>${escapeHtml(regionName || "Region inconnue")}</h2>
          </div>
          <button class="panel-close" type="button" aria-label="Fermer le panneau">&times;</button>
        </div>
        <p class="panel-empty panel-empty--notice">
          Aucune donnee faune/flore disponible pour cette region.
        </p>
      `;
      panel.querySelector(".panel-close").addEventListener("click", closePanel);
      return;
    }

    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <p class="panel-kicker">Region selectionnee</p>
          <h2>${escapeHtml(regionName)}</h2>
        </div>
        <button class="panel-close" type="button" aria-label="Fermer le panneau">&times;</button>
      </div>

      <div class="panel-status">
        <span>Statut de conservation</span>
        ${showConservationBadge(faunaFloreData.statut_conservation)}
      </div>

      <section class="panel-section">
        <h3>Especes emblematiques</h3>
        ${listItems(faunaFloreData.especes_emblematiques, "Aucune espece renseignee.")}
      </section>

      <section class="panel-section">
        <h3>Taux d'endemisme</h3>
        <p class="panel-highlight">${escapeHtml(faunaFloreData.taux_endemisme || "Non renseigne")}</p>
      </section>

      <section class="panel-section">
        <h3>Menaces principales</h3>
        ${listItems(faunaFloreData.menaces, "Aucune menace renseignee.")}
      </section>

      <section class="panel-section">
        <h3>Aires protegees</h3>
        ${listItems(faunaFloreData.aires_protegees, "Aucune aire protegee renseignee.")}
      </section>
    `;

    panel.querySelector(".panel-close").addEventListener("click", closePanel);
  }

  // Fonction 2 
  function getRegionData(regionName, dataSource) {
    if (!regionName || !dataSource) {
      return null;
    }

    if (Object.prototype.hasOwnProperty.call(dataSource, regionName)) {
      return dataSource[regionName];
    }

    const normalizedRegionName = normalizeText(regionName);
    const matchingKey = Object.keys(dataSource).find(
      (key) => normalizeText(key) === normalizedRegionName
    );

    return matchingKey ? dataSource[matchingKey] : null;
  }

  // Fonction 3 du TODO: showConservationBadge(statut)
  function showConservationBadge(statut) {
    const normalizedStatus = normalizeText(statut);
    const knownStatuses = {
      critique: "Critique",
      vulnerable: "Vulnerable",
      stable: "Stable",
    };
    const label = knownStatuses[normalizedStatus] || "Non renseigne";
    const className = knownStatuses[normalizedStatus] ? normalizedStatus : "inconnu";

    return `<span class="conservation-badge conservation-badge--${className}">${label}</span>`;
  }

  // Fonction 4 
  function closePanel() {
    const panel = getPanelElement();
    panel.classList.remove("info-panel--open");
    panel.innerHTML = "";
  }

  async function loadFaunaFloreData() {
    if (cachedFaunaFloreData) {
      return cachedFaunaFloreData;
    }

    for (const dataUrl of DATA_URLS) {
      try {
        const response = await fetch(dataUrl);

        if (response.ok) {
          cachedFaunaFloreData = await response.json();
          return cachedFaunaFloreData;
        }
      } catch (error) {
        console.warn(`Chargement impossible: ${dataUrl}`, error);
      }
    }

    throw new Error("Impossible de charger les donnees faune/flore.");
  }

  function getRegionNameFromFeature(feature) {
    const properties = feature?.properties || {};

    return (
      properties.nom_region ||
      properties.NAME_1 ||
      ""
    );
  }

  // Fonction 5 
  async function handleRegionClick(feature, layer) {
    const regionName = getRegionNameFromFeature(feature);

    try {
      const dataSource = await loadFaunaFloreData();
      const regionData = getRegionData(regionName, dataSource);
      renderInfoPanel(regionName, regionData);

      if (layer && typeof layer.bindPopup === "function") {
        layer.bindPopup(regionName || "Region inconnue").openPopup();
      }
    } catch (error) {
      console.error(error);
      renderInfoPanel(regionName, null);
    }
  }

  window.renderInfoPanel = renderInfoPanel;
  window.getRegionData = getRegionData;
  window.showConservationBadge = showConservationBadge;
  window.closePanel = closePanel;
  window.handleRegionClick = handleRegionClick;
})();
