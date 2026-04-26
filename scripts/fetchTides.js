// fetchTides.js — Récupère les données de marée J→J+8 pour tous les ports
// Usage : node scripts/fetchTides.js
// Prérequis : Node 18+

import { writeFile, readFile, readdir, unlink, mkdir } from 'fs/promises';
// Note: generateTideCache supprimé — les données sont servies depuis public/tides/ via Vercel
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'public', 'tides');

const API_KEY = '84efb238e4a77a6e1ea52e82c537c1a3';
const BASE_URL = 'https://api-maree.fr/water-levels';
const DAYS_AHEAD = 8;
const STEP = 30; // minutes
const TIMEOUT_MS = 15_000;
const RETRY_COUNT = 2;
const THROTTLE_MS = 500; // délai entre chaque requête
const MAX_AGE_DAYS = 2; // suppression des fichiers plus vieux que J+2

const PORTS = [
  // Bretagne
  'brest',
  'roscoff',
  'baie-de-morlaix-carantec',
  'perros-guirec',
  'paimpol',
  'saint-cast',
  'cancale',
  'saint-malo',
  'dahouet',
  'binic',
  'camaret-sur-mer',
  'douarnenez',
  'audierne',
  'benodet',
  'concarneau',
  'le-guilvinec',
  'lesconil',
  'lorient',
  'port-louis-locmalo',
  'etel',
  'quiberon-port-haliguen',
  'belle-ile-le-palais',
  'la-trinite-sur-mer',
  'port-navalo',
  'ile-de-groix-port-tudy',
  // Normandie
  'granville',
  'cherbourg',
  'saint-vaast-la-hougue',
  'barfleur',
  'ouistreham',
  'port-en-bessin',
  'grandcamp',
  'honfleur',
  'le-havre',
  'fecamp',
  'dieppe',
  'trouville-deauville',
  // Nord / Pas-de-Calais
  'boulogne-sur-mer',
  'calais',
  'dunkerque',
  'graveline',
  // Pays de la Loire
  'saint-nazaire',
  'le-croisic',
  'noirmoutier-l-herbaudiere',
  'fromentine',
  'saint-gilles-croix-de-vie',
  'ile-d-yeu',
  'les-sables-d-olonne',
  // Nouvelle-Aquitaine
  'la-rochelle-pallice',
  'ile-de-re-saint-martin',
  'ile-d-oleron-la-cotiniere',
  'royan',
  'cap-ferret',
  'arcachon',
  'pauillac',
  'boucau-bayonne-biarritz',
  'saint-jean-de-luz',
];

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T00:00`;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= RETRY_COUNT + 1; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (response.status === 401 || response.status === 403) {
        throw new Error('Clé API invalide ou expirée');
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      lastError = err;
      if (attempt <= RETRY_COUNT) {
        const delay = attempt * 2000;
        console.warn(`  Tentative ${attempt} échouée (${err.message}), retry dans ${delay / 1000}s...`);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

async function fetchPort(siteId) {
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + DAYS_AHEAD);

  const url =
    `${BASE_URL}` +
    `?site=${siteId}` +
    `&from=${encodeURIComponent(formatDate(from))}` +
    `&to=${encodeURIComponent(formatDate(to))}` +
    `&step=${STEP}` +
    `&tz=Europe%2FParis` +
    `&key=${API_KEY}`;

  const json = await fetchWithRetry(url);

  if (!json.data || !Array.isArray(json.data)) {
    throw new Error('Format de réponse inattendu (pas de champ data)');
  }

  return json.data;
}

async function cleanup() {
  console.log('\n── Nettoyage des fichiers > J+2 ──');
  let files;
  try {
    files = await readdir(DATA_DIR);
  } catch {
    return; // dossier pas encore créé
  }

  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  let deleted = 0;

  for (const file of files.filter(f => f.endsWith('.json'))) {
    const filePath = join(DATA_DIR, file);
    try {
      const raw = await readFile(filePath, 'utf8');
      const { updatedAt } = JSON.parse(raw);
      if (new Date(updatedAt).getTime() < cutoff) {
        await unlink(filePath);
        console.log(`  Supprimé : ${file}`);
        deleted++;
      }
    } catch {
      // fichier corrompu → on supprime aussi
      await unlink(filePath).catch(() => {});
      deleted++;
    }
  }

  console.log(deleted === 0 ? '  Rien à supprimer.' : `  ${deleted} fichier(s) supprimé(s).`);
}

async function generateTideCache(fetchedPorts) {
  const requires = fetchedPorts
    .map(id => `  '${id}': require('./tides/${id}.json'),`)
    .join('\n');

  const content = `// Généré automatiquement par scripts/fetchTides.js — ne pas modifier manuellement
import { TidePoint } from '../types';

interface CacheEntry {
  updatedAt: string;
  port: string;
  points: TidePoint[];
}

/* eslint-disable @typescript-eslint/no-var-requires */
const CACHE: Partial<Record<string, CacheEntry>> = {
${requires}
};

const MAX_CACHE_AGE_DAYS = ${MAX_AGE_DAYS};

function isCacheValid(entry: CacheEntry): boolean {
  const expiresAt = new Date(entry.updatedAt);
  expiresAt.setDate(expiresAt.getDate() + MAX_CACHE_AGE_DAYS);
  return new Date() < expiresAt;
}

// Retourne les points pour une date donnée (utilise le préfixe de date du timestamp)
export function getPointsForDate(portId: string, date: Date): TidePoint[] | null {
  const entry = CACHE[portId];
  if (!entry || !isCacheValid(entry)) return null;

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const prefix = \`\${y}-\${m}-\${d}\`;

  const points = entry.points.filter(p => p.time.startsWith(prefix));
  return points.length > 0 ? points : null;
}

// Retourne la liste des dates couvertes par le cache pour ce port
export function getAvailableDates(portId: string): Date[] {
  const entry = CACHE[portId];
  if (!entry || !isCacheValid(entry)) return [];

  const seen = new Set<string>();
  const dates: Date[] = [];

  for (const p of entry.points) {
    const dateStr = p.time.substring(0, 10); // "2026-04-26"
    if (!seen.has(dateStr)) {
      seen.add(dateStr);
      const [yr, mo, dy] = dateStr.split('-').map(Number);
      dates.push(new Date(yr, mo - 1, dy));
    }
  }

  return dates;
}
`;

  await writeFile(CACHE_FILE, content, 'utf8');
  console.log(`\n  tideCache.ts régénéré (${fetchedPorts.length} ports).`);
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  await cleanup();

  console.log(`\n── Fetch ${PORTS.length} ports (J → J+${DAYS_AHEAD}, step=${STEP}min) ──`);

  const fetchedPorts = [];
  let ok = 0;
  let ko = 0;

  for (let i = 0; i < PORTS.length; i++) {
    const portId = PORTS[i];
    process.stdout.write(`[${String(i + 1).padStart(2)}/${PORTS.length}] ${portId}... `);
    try {
      const points = await fetchPort(portId);
      const result = { updatedAt: new Date().toISOString(), port: portId, points };
      await writeFile(join(DATA_DIR, `${portId}.json`), JSON.stringify(result), 'utf8');
      console.log(`${points.length} points ✓`);
      fetchedPorts.push(portId);
      ok++;
    } catch (err) {
      console.error(`ERREUR: ${err.message}`);
      ko++;
    }

    if (i < PORTS.length - 1) await sleep(THROTTLE_MS);
  }

  console.log(`\n── Résultat : ${ok} OK, ${ko} erreur(s) ──`);
}

main();
