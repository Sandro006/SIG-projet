(function () {
  "use strict";

  const DATA_URLS = ["data/faune_flore.json", "data/faune_flore.json"];
  const DETAILS_URL = "data/especes_details.json";
  let cachedFaunaFloreData = null;
  let cachedDetailsData = null;

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

  function listItems(items, emptyLabel, isSpecies = false) {
    if (!Array.isArray(items) || items.length === 0) {
      return `<p class="panel-empty">${escapeHtml(emptyLabel)}</p>`;
    }

    if (isSpecies) {
      return `
        <ul class="panel-list">
          ${items.map((item) => {
            const nom = typeof item === 'object' ? item.nom : item;
            const photoKey = typeof item === 'object' ? (item.photos ? item.photos[0] : nom) : nom;
            return `<li><a href="#" class="species-link" data-species="${escapeHtml(photoKey)}" data-nom="${escapeHtml(nom)}">${escapeHtml(nom)}</a></li>`;
          }).join("")}
        </ul>
      `;
    }

    return `
      <ul class="panel-list">
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    `;
  }

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

    const speciesList = faunaFloreData.especes_emblematiques || [];

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
        ${listItems(speciesList, "Aucune espece renseignee.", true)}
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

    // Ajouter les écouteurs d'événements pour les liens d'espèces
    panel.querySelectorAll(".species-link").forEach((link) => {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        const speciesKey = this.dataset.species;
        const speciesNom = this.dataset.nom;
        showSpeciesDetails(speciesKey, speciesNom);
      });
    });
  }

  function renderSpeciesDetails(speciesKey, speciesNom, speciesData) {
    const panel = getPanelElement();

    if (!speciesData) {
      panel.innerHTML = `
        <div class="panel-header">
          <div>
            <p class="panel-kicker">Details de l'espece</p>
            <h2>${escapeHtml(speciesNom || speciesKey)}</h2>
          </div>
          <button class="panel-close" type="button" aria-label="Fermer le panneau">&times;</button>
        </div>
        <p class="panel-empty panel-empty--notice">
          Aucun detail disponible pour cette espece.
        </p>
      `;
      panel.querySelector(".panel-close").addEventListener("click", closePanel);
      
      // Ajouter un bouton retour
      addBackButton(panel);
      return;
    }

    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <p class="panel-kicker">Details de l'espece</p>
          <h2>${escapeHtml(speciesData.nom_commun || speciesNom || speciesKey)}</h2>
          <p class="panel-subtitle">${escapeHtml(speciesData.nom_scientifique || "")}</p>
        </div>
        <button class="panel-close" type="button" aria-label="Fermer le panneau">&times;</button>
      </div>

      <div class="panel-status">
        <span>Statut de conservation</span>
        ${showConservationBadge(speciesData.statut_conservation)}
      </div>
    
      <section class="panel-section">
        <h3>Photos disponibles</h3>
        ${speciesData.photos && speciesData.photos.length > 0 
          ? `<ul class="panel-list panel-photos">
              ${speciesData.photos.map((photo) => 
                `<li><img src="data/img/${escapeHtml(photo)}.png" alt="Photo de l'espece" width="200" height="200"></li>`
              ).join("")}
             </ul>`
          : `<p class="panel-empty">Aucune photo disponible.</p>`
        }
      </section>
      
      <section class="panel-section">
        <h3>Description</h3>
        <p class="panel-description">${escapeHtml(speciesData.description || "Aucune description disponible.")}</p>
      </section>

      <section class="panel-section">
        <h3>Type</h3>
        <p class="panel-highlight">${escapeHtml(speciesData.type || "Non renseigne")}</p>
      </section>

      <section class="panel-section">
        <h3>Regions presentes</h3>
        ${listItems(speciesData.regions_presentes, "Aucune region renseignee.")}
      </section>
    `;

    panel.querySelector(".panel-close").addEventListener("click", closePanel);
    addBackButton(panel);
  }

  function addBackButton(panel) {
    const backButton = document.createElement("button");
    backButton.className = "panel-back";
    backButton.type = "button";
    backButton.innerHTML = "← Retour";
    backButton.addEventListener("click", function () {
      // Recharger les données de la région précédente
      const currentRegion = panel.dataset.currentRegion;
      if (currentRegion && cachedFaunaFloreData) {
        const regionData = getRegionData(currentRegion, cachedFaunaFloreData);
        renderInfoPanel(currentRegion, regionData);
      } else {
        closePanel();
      }
    });
    panel.querySelector(".panel-header").appendChild(backButton);
  }

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

  function showConservationBadge(statut) {
    const normalizedStatus = normalizeText(statut);
    const knownStatuses = {
      critique: "Critique",
      vulnerable: "Vulnerable",
      stable: "Stable",
      "preoccupation mineure": "Préoccupation mineure",
    };
    const label = knownStatuses[normalizedStatus] || "Non renseigne";
    const className = knownStatuses[normalizedStatus] ? normalizedStatus.replace(/ /g, "-") : "inconnu";

    return `<span class="conservation-badge conservation-badge--${className}">${label}</span>`;
  }

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

  async function loadSpeciesDetails() {
    if (cachedDetailsData) {
      return cachedDetailsData;
    }

    try {
      const response = await fetch(DETAILS_URL);
      if (response.ok) {
        cachedDetailsData = await response.json();
        return cachedDetailsData;
      }
    } catch (error) {
      console.warn(`Chargement impossible: ${DETAILS_URL}`, error);
    }

    return null;
  }

  async function showSpeciesDetails(speciesKey, speciesNom) {
    const panel = getPanelElement();
    panel.classList.add("info-panel--open");

    // Sauvegarder la région actuelle pour le bouton retour
    const currentRegion = panel.dataset.currentRegion;

    try {
      const detailsData = await loadSpeciesDetails();
      
      if (!detailsData) {
        renderSpeciesDetails(speciesKey, speciesNom, null);
        return;
      }

      // Chercher l'espèce par son nom scientifique ou nom commun
      let speciesData = null;
      
      // Par la clé (nom scientifique)
      if (detailsData[speciesKey]) {
        speciesData = detailsData[speciesKey];
      } else {
        // Par recherche dans les noms communs
        for (const key in detailsData) {
          if (detailsData[key].nom_commun && 
              normalizeText(detailsData[key].nom_commun) === normalizeText(speciesNom)) {
            speciesData = detailsData[key];
            break;
          }
        }
      }

      renderSpeciesDetails(speciesKey, speciesNom, speciesData);
    } catch (error) {
      console.error(error);
      renderSpeciesDetails(speciesKey, speciesNom, null);
    }
  }

  function getRegionNameFromFeature(feature) {
    const properties = feature?.properties || {};

    return (
      properties.nom_region ||
      properties.NAME_2 ||
      properties.NAME_1 ||
      ""
    );
  }

  async function handleRegionClick(feature, layer) {
    const regionName = getRegionNameFromFeature(feature);

    try {
      const dataSource = await loadFaunaFloreData();
      const regionData = getRegionData(regionName, dataSource);
      
      const panel = getPanelElement();
      panel.dataset.currentRegion = regionName;
      
      renderInfoPanel(regionName, regionData);

      if (layer && typeof layer.bindPopup === "function") {
        layer.bindPopup(regionName || "Region inconnue").openPopup();
      }
    } catch (error) {
      console.error(error);
      renderInfoPanel(regionName, null);
    }
  }

  // Exposer les fonctions pour une utilisation globale
  window.renderInfoPanel = renderInfoPanel;
  window.getRegionData = getRegionData;
  window.showConservationBadge = showConservationBadge;
  window.closePanel = closePanel;
  window.handleRegionClick = handleRegionClick;
  window.getRegionNameFromFeature = getRegionNameFromFeature;
  window.loadFaunaFloreData = loadFaunaFloreData;
  window.loadSpeciesDetails = loadSpeciesDetails;
  window.showSpeciesDetails = showSpeciesDetails;
})();