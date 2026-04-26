import { Port } from '../types';

export const ALL_PORTS: Port[] = [
  // Bretagne
  { id: 'brest', name: 'Brest', region: 'Bretagne', lat: 48.3833, lng: -4.4950, refMarnage: 5.4 },
  { id: 'roscoff', name: 'Roscoff', region: 'Bretagne', lat: 48.7237, lng: -3.9887, refMarnage: 4.5 },
  { id: 'baie-de-morlaix-carantec', name: 'Baie de Morlaix', region: 'Bretagne', lat: 48.6437, lng: -3.8150, refMarnage: 5.0 },
  { id: 'perros-guirec', name: 'Perros-Guirec', region: 'Bretagne', lat: 48.8119, lng: -3.4413, refMarnage: 5.5 },
  { id: 'paimpol', name: 'Paimpol', region: 'Bretagne', lat: 48.7813, lng: -3.0490, refMarnage: 6.0 },
  { id: 'saint-cast', name: 'Saint-Cast', region: 'Bretagne', lat: 48.6388, lng: -2.2617, refMarnage: 7.0 },
  { id: 'cancale', name: 'Cancale', region: 'Bretagne', lat: 48.6773, lng: -1.8521, refMarnage: 9.5 },
  { id: 'saint-malo', name: 'Saint-Malo', region: 'Bretagne', lat: 48.6494, lng: -2.0253, refMarnage: 8.6 },
  { id: 'dahouet', name: 'Dahouet', region: 'Bretagne', lat: 48.5632, lng: -2.5777, refMarnage: 7.0 },
  { id: 'binic', name: 'Binic', region: 'Bretagne', lat: 48.6012, lng: -2.8259, refMarnage: 7.0 },
  { id: 'camaret-sur-mer', name: 'Camaret-sur-Mer', region: 'Bretagne', lat: 48.2744, lng: -4.5918, refMarnage: 5.0 },
  { id: 'douarnenez', name: 'Douarnenez', region: 'Bretagne', lat: 48.0934, lng: -4.3272, refMarnage: 4.5 },
  { id: 'audierne', name: 'Audierne', region: 'Bretagne', lat: 48.0144, lng: -4.5386, refMarnage: 3.8 },
  { id: 'benodet', name: 'Bénodet', region: 'Bretagne', lat: 47.8699, lng: -4.1138, refMarnage: 3.8 },
  { id: 'concarneau', name: 'Concarneau', region: 'Bretagne', lat: 47.8736, lng: -3.9153, refMarnage: 3.8 },
  { id: 'le-guilvinec', name: 'Le Guilvinec', region: 'Bretagne', lat: 47.7933, lng: -4.2866, refMarnage: 3.8 },
  { id: 'lesconil', name: 'Lesconil', region: 'Bretagne', lat: 47.7886, lng: -4.2098, refMarnage: 3.8 },
  { id: 'lorient', name: 'Lorient', region: 'Bretagne', lat: 47.7559, lng: -3.3716, refMarnage: 4.0 },
  { id: 'port-louis-locmalo', name: 'Port-Louis', region: 'Bretagne', lat: 47.7079, lng: -3.3565, refMarnage: 4.0 },
  { id: 'etel', name: 'Étel', region: 'Bretagne', lat: 47.6564, lng: -3.2046, refMarnage: 4.0 },
  { id: 'quiberon-port-haliguen', name: 'Quiberon', region: 'Bretagne', lat: 47.4842, lng: -3.1011, refMarnage: 3.5 },
  { id: 'belle-ile-le-palais', name: 'Belle-Île', region: 'Bretagne', lat: 47.3469, lng: -3.1514, refMarnage: 3.5 },
  { id: 'la-trinite-sur-mer', name: 'La Trinité-sur-Mer', region: 'Bretagne', lat: 47.5891, lng: -3.0325, refMarnage: 3.8 },
  { id: 'port-navalo', name: 'Port-Navalo', region: 'Bretagne', lat: 47.5443, lng: -2.9143, refMarnage: 3.5 },
  { id: 'ile-de-groix-port-tudy', name: 'Île de Groix', region: 'Bretagne', lat: 47.6428, lng: -3.4580, refMarnage: 3.8 },

  // Normandie
  { id: 'granville', name: 'Granville', region: 'Normandie', lat: 48.8378, lng: -1.5975, refMarnage: 7.5 },
  { id: 'cherbourg', name: 'Cherbourg', region: 'Normandie', lat: 49.6451, lng: -1.6177, refMarnage: 4.3 },
  { id: 'saint-vaast-la-hougue', name: 'Saint-Vaast-la-Hougue', region: 'Normandie', lat: 49.5890, lng: -1.2714, refMarnage: 5.0 },
  { id: 'barfleur', name: 'Barfleur', region: 'Normandie', lat: 49.6720, lng: -1.2566, refMarnage: 4.5 },
  { id: 'ouistreham', name: 'Ouistreham', region: 'Normandie', lat: 49.2813, lng: -0.2518, refMarnage: 5.5 },
  { id: 'port-en-bessin', name: 'Port-en-Bessin', region: 'Normandie', lat: 49.3481, lng: -0.7545, refMarnage: 5.5 },
  { id: 'grandcamp', name: 'Grandcamp', region: 'Normandie', lat: 49.3872, lng: -1.0427, refMarnage: 5.5 },
  { id: 'honfleur', name: 'Honfleur', region: 'Normandie', lat: 49.4186, lng: 0.2332, refMarnage: 6.0 },
  { id: 'le-havre', name: 'Le Havre', region: 'Normandie', lat: 49.4938, lng: 0.1079, refMarnage: 5.5 },
  { id: 'fecamp', name: 'Fécamp', region: 'Normandie', lat: 49.7597, lng: 0.3694, refMarnage: 6.5 },
  { id: 'dieppe', name: 'Dieppe', region: 'Normandie', lat: 49.9258, lng: 1.0828, refMarnage: 6.5 },
  { id: 'trouville-deauville', name: 'Trouville-Deauville', region: 'Normandie', lat: 49.3655, lng: 0.0712, refMarnage: 5.5 },

  // Nord / Pas-de-Calais
  { id: 'boulogne-sur-mer', name: 'Boulogne-sur-Mer', region: 'Nord', lat: 50.7270, lng: 1.6070, refMarnage: 6.5 },
  { id: 'calais', name: 'Calais', region: 'Nord', lat: 50.9679, lng: 1.8521, refMarnage: 5.5 },
  { id: 'dunkerque', name: 'Dunkerque', region: 'Nord', lat: 51.0386, lng: 2.3667, refMarnage: 4.5 },
  { id: 'graveline', name: 'Gravelines', region: 'Nord', lat: 50.9866, lng: 2.1255, refMarnage: 5.0 },

  // Pays de la Loire
  { id: 'saint-nazaire', name: 'Saint-Nazaire', region: 'Pays de la Loire', lat: 47.2727, lng: -2.2058, refMarnage: 4.0 },
  { id: 'le-croisic', name: 'Le Croisic', region: 'Pays de la Loire', lat: 47.2933, lng: -2.5220, refMarnage: 4.0 },
  { id: 'noirmoutier-l-herbaudiere', name: 'Noirmoutier', region: 'Pays de la Loire', lat: 47.0183, lng: -2.2977, refMarnage: 3.8 },
  { id: 'fromentine', name: 'Fromentine', region: 'Pays de la Loire', lat: 46.8986, lng: -2.1491, refMarnage: 4.0 },
  { id: 'saint-gilles-croix-de-vie', name: 'Saint-Gilles-Croix-de-Vie', region: 'Pays de la Loire', lat: 46.6936, lng: -1.9435, refMarnage: 3.8 },
  { id: 'ile-d-yeu', name: "Île d'Yeu", region: 'Pays de la Loire', lat: 46.7197, lng: -2.3446, refMarnage: 3.5 },
  { id: 'les-sables-d-olonne', name: "Les Sables-d'Olonne", region: 'Pays de la Loire', lat: 46.4971, lng: -1.7834, refMarnage: 3.8 },

  // Nouvelle-Aquitaine
  { id: 'la-rochelle-pallice', name: 'La Rochelle', region: 'Nouvelle-Aquitaine', lat: 46.1591, lng: -1.1520, refMarnage: 3.8 },
  { id: 'ile-de-re-saint-martin', name: 'Île de Ré', region: 'Nouvelle-Aquitaine', lat: 46.2036, lng: -1.3582, refMarnage: 3.8 },
  { id: 'ile-d-oleron-la-cotiniere', name: "Île d'Oléron", region: 'Nouvelle-Aquitaine', lat: 45.9050, lng: -1.3140, refMarnage: 3.8 },
  { id: 'royan', name: 'Royan', region: 'Nouvelle-Aquitaine', lat: 45.6222, lng: -1.0264, refMarnage: 3.8 },
  { id: 'cap-ferret', name: 'Cap Ferret', region: 'Nouvelle-Aquitaine', lat: 44.6297, lng: -1.2420, refMarnage: 3.2 },
  { id: 'arcachon', name: 'Arcachon', region: 'Nouvelle-Aquitaine', lat: 44.6604, lng: -1.1735, refMarnage: 3.2 },
  { id: 'pauillac', name: 'Pauillac (Bordeaux)', region: 'Nouvelle-Aquitaine', lat: 45.1980, lng: -0.7490, refMarnage: 3.5 },
  { id: 'boucau-bayonne-biarritz', name: 'Bayonne / Biarritz', region: 'Nouvelle-Aquitaine', lat: 43.5350, lng: -1.5350, refMarnage: 2.8 },
  { id: 'saint-jean-de-luz', name: 'Saint-Jean-de-Luz', region: 'Nouvelle-Aquitaine', lat: 43.3894, lng: -1.6676, refMarnage: 2.8 },
];

export const POPULAR_PORTS: Port[] = [
  ALL_PORTS.find(p => p.id === 'brest')!,
  ALL_PORTS.find(p => p.id === 'saint-malo')!,
  ALL_PORTS.find(p => p.id === 'cherbourg')!,
  ALL_PORTS.find(p => p.id === 'lorient')!,
  ALL_PORTS.find(p => p.id === 'la-rochelle-pallice')!,
  ALL_PORTS.find(p => p.id === 'le-havre')!,
  ALL_PORTS.find(p => p.id === 'concarneau')!,
  ALL_PORTS.find(p => p.id === 'quiberon-port-haliguen')!,
];

export const PORTS_BY_REGION = ALL_PORTS.reduce<Record<string, Port[]>>((acc, port) => {
  if (!acc[port.region]) acc[port.region] = [];
  acc[port.region].push(port);
  return acc;
}, {});

export const REGIONS = ['Bretagne', 'Normandie', 'Nord', 'Pays de la Loire', 'Nouvelle-Aquitaine'];
