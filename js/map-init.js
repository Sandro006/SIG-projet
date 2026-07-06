function initMap() {
    const map = L.map('map').setView([-18.87, 47.5], 6);
    return map;
}

function loadBaseLayer(map) {
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
}

function styleRegion(feature) {
    return {
        fillColor: '#4CAF50',
        fillOpacity: 0.6,
        color: '#2E7D32',
        weight: 2
    };
}

function highlightRegion(layer) {
    layer.setStyle({
        fillOpacity: 0.9,
        weight: 3,
        color: '#FF6F00'
    });

    const nom = layer.feature.properties.nom_region || layer.feature.properties.NAME_2 || "Région";
    layer.bindPopup(`
        <div style="
            white-space: nowrap; 
            font-weight: bold; 
            font-size: 14px; 
            padding: 5px 10px;
            font-family: Arial, sans-serif;
        ">${nom}</div>
    `).openPopup();
}

function resetRegionStyle(layer) {
    // On restaure le dernier style "voulu" (celui posé par un filtre/recherche)
    // plutôt que le style par défaut, sinon le survol annule le filtre en cours.
    layer.setStyle(layer._currentStyle || styleRegion(layer.feature));
    layer.closePopup();
}

function loadRegionsLayer(map, geojsonUrl, onRegionClick) {
    return fetch(geojsonUrl)
        .then(response => response.json())
        .then(data => {
            const geoJsonLayer = L.geoJSON(data, {
                style: styleRegion,
                onEachFeature: function(feature, layer) {
                    layer.feature = feature;
                    layer._currentStyle = styleRegion(feature);

                    layer.on('mouseover', function() {
                        highlightRegion(this);
                    });

                    layer.on('mouseout', function() {
                        resetRegionStyle(this);
                    });

                    layer.on('click', function() {
                        if (typeof onRegionClick === 'function') {
                            onRegionClick(feature, layer);
                        }
                    });
                }
            }).addTo(map);

            map._regionsLayer = geoJsonLayer;
            console.log('Régions chargées:', data.features.length);
            return geoJsonLayer;
        })
        .catch(error => {
            console.error('Erreur chargement:', error);
        });
}