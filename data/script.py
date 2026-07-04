import json

# Charger le fichier
with open('gadm41_MDG_2.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

regions = {}

for feature in data['features']:
    nom = feature['properties'].get('NAME_2', '')
    
    # 🔥 Séparer Vatovavy Fitovinany (quel que soit le nom exact)
    if "Vatovavy" in nom and "Fitovinany" in nom:
        f1 = feature.copy()
        f1['properties'] = feature['properties'].copy()
        f1['properties']['nom_region'] = "Vatovavy"
        regions["Vatovavy"] = f1
        
        f2 = feature.copy()
        f2['properties'] = feature['properties'].copy()
        f2['properties']['nom_region'] = "Fitovinany"
        regions["Fitovinany"] = f2
        print(f"✅ Séparé: {nom} → Vatovavy + Fitovinany")
        continue
    
    # Corriger les noms
    if nom == "Amoron'imania":
        nom = "Amoron'i Mania"
    elif nom == "Atsimo-Atsinana":
        nom = "Atsimo-Atsinanana"
    elif nom == "Hautematsiatra":
        nom = "Haute Matsiatra"
    
    feature['properties']['nom_region'] = nom
    regions[nom] = feature
    print(f"✅ {nom}")

# Sauvegarder
resultat = {"type": "FeatureCollection", "features": list(regions.values())}

with open('regions_madagascar.json', 'w', encoding='utf-8') as f:
    json.dump(resultat, f, ensure_ascii=False, indent=2)

print(f"\n✅ {len(regions)} régions créées")