require('dotenv').config();
const express = require("express");
const cors = require("cors");
const compression = require('compression');
const path = require("path");
const axios = require("axios");
const crypto = require("crypto");
const Bottleneck = require("bottleneck");
const rateLimit = require("express-rate-limit");
const winston = require('winston');
const NodeCache = require("node-cache");
const ptt = require('parse-torrent-title'); 

// --- IMPORT ESTERNI ---
const { fetchExternalAddonsFlat } = require("./external-addons");
const PackResolver = require("./leviathan-pack-resolver");
const aioFormatter = require("./aiostreams-formatter.cjs");

// --- IMPORT NUOVO MODULO CACHE TORBOX ---
const TbCache = require("./debrid/tb_cache.js");

// --- IMPORT NUOVO FORMATTER (Skins & Logic) ---
const { formatStreamSelector, cleanFilename, formatBytes } = require("./formatter");

// ---  IMPORT GESTORE P2P  ---
const P2P = require("./p2p_handler");

// --- IMPORT GESTORE TRAILER (YouTube/Invidious) ---
const { getTrailerStreams } = require("./trailerProvider"); 


// --- 1. CONFIGURAZIONE LOGGER (Winston) ---
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// --- CACHE OTTIMIZZATA (NODE-CACHE) ---
const myCache = new NodeCache({ stdTTL: 1800, checkperiod: 120, maxKeys: 5000 });

const Cache = {
    getCachedMagnets: async (key) => { return myCache.get(`magnets:${key}`) || null; },
    cacheMagnets: async (key, value, ttl = 3600) => { myCache.set(`magnets:${key}`, value, ttl); },
    getCachedStream: async (key) => {
        const data = myCache.get(`stream:${key}`);
        if (data) logger.info(`⚡ CACHE HIT: ${key}`);
        return data || null;
    },
    cacheStream: async (key, value, ttl = 1800) => { myCache.set(`stream:${key}`, value, ttl); },
    listKeys: async () => myCache.keys(),
    deleteKey: async (key) => myCache.del(key),
    flushAll: async () => myCache.flushAll()
};

const { generateSmartQueries } = require("./ai_query");
const { smartMatch } = require("./smart_parser");
const { rankAndFilterResults } = require("./ranking");
const { tmdbToImdb, imdbToTmdb, getTmdbAltTitles } = require("./id_converter");
const RD = require("./debrid/realdebrid");
const AD = require("./debrid/alldebrid");
const TB = require("./debrid/torbox");
const dbHelper = require("./db-helper"); 
const { getManifest } = require("./manifest");

// Inizializza DB Locale
dbHelper.initDatabase();

// --- CONFIGURAZIONE CENTRALE ---
const CONFIG = {
  INDEXER_URL: process.env.INDEXER_URL || "", 
  CINEMETA_URL: "https://v3-cinemeta.strem.io",
  KITSU_URL: "https://anime-kitsu.strem.fun",
  REAL_SIZE_FILTER: 80 * 1024 * 1024,
  MAX_RESULTS: 70,
  TIMEOUTS: {
    TMDB: 2000,
    SCRAPER: 6000,
    REMOTE_INDEXER: 2500, 
    LOCAL_DB: 1500, 
    DB_QUERY: 3000,
    DEBRID: 10000, 
    PACK_RESOLVER: 4000,
    EXTERNAL: 20000 
  }
};

const REGEX_YEAR = /(19|20)\d{2}/;

const REGEX_QUALITY_FILTER = {
    "4K": /\b(?:2160p|4k|uhd|ultra[-.\s]?hd|2160i)\b/i,
    "1080p": /\b(?:1080p|1080i|fhd|full[-.\s]?hd|blu[-.\s]?ray|bd[-.\s]?rip)\b/i,
    "720p": /\b(?:720p|720i|hd[-.\s]?rip|hd)\b/i,
    "SD": /\b(?:480p|576p|sd|dvd|dvd[-.\s]?rip|dvd[-.\s]?scr|cd)\b/i
};

// --- LOGICA LINGUA ITA ---
const REGEX_STRONG_ITA = /\b(ITA|ITALIAN|ITALIANO)\b/i;
const REGEX_CONTEXT_IT = /\b(AUDIO|LINGUA|LANG|VO|AC-?3|AAC|MP3|DDP|DTS|TRUEHD)\W+(IT)\b/i;
const REGEX_ISOLATED_IT = /(?:^|[_\-.])(IT)(?:$|[_\-.])/;
const REGEX_MULTI_ITA = /\b(MULTI|DUAL|TRIPLE).*(ITA|ITALIAN)\b/i;
const REGEX_TRUSTED_GROUPS = /\b(iDN_CreW|CORSARO|MUX|WMS|TRIDIM|SPEEDVIDEO|EAGLE|TRL|MEA|LUX|DNA|LEST|GHIZZO|USAbit|Bric|Dtone|Gaiage|BlackBit|Pantry|Vics|Papeete|Lidri|MirCrew)\b/i;
const REGEX_FALSE_IT = /\b(10BIT|BIT|WIT|HIT|FIT|KIT|SIT|LIT|PIT)\b/i;
const REGEX_SUB_ONLY = /\b(SUB|SUBS|SUBBED|SOTTOTITOLI|VOST|VOSTIT)\s*[:.\-_]?\s*(ITA|IT|ITALIAN)\b/i;
const REGEX_AUDIO_CONFIRM = /\b(AUDIO|AC3|AAC|DTS|MD|LD|DDP|MP3|LINGUA)[\s.\-_]+(ITA|IT)\b/i;

function parseTitleDetails(filename) {
    if (!filename) return { quality: 'SD', tags: '', languages: [] };
    try {
        const info = ptt.parse(filename);
        const codec = info.codec ? info.codec.toUpperCase() : '';
        const audio = info.audio ? info.audio.toUpperCase() : '';
        const source = info.source ? info.source.toUpperCase() : '';
        let languages = [];
        if (info.languages && Array.isArray(info.languages)) {
            languages = info.languages.map(l => l.substring(0,3).toUpperCase());
        }
        return { quality: info.resolution || 'SD', tags: [source, codec, audio].filter(x => x).join(' '), languages, cleanTitle: info.title };
    } catch (e) { return { quality: 'SD', tags: '', languages: [] }; }
}

function extractInfoHash(magnet) {
    if (!magnet) return null;
    const match = magnet.match(/btih:([A-Fa-f0-9]{40}|[A-Za-z2-7]{32})/i);
    if (!match) return null;
    return match[1].toUpperCase();
}

function estimateVisualSize(knownSize, title, isSeries, isPack, infoHash) {
    if (knownSize && knownSize > 0) return knownSize;
    return 2 * 1024 * 1024 * 1024; // Default 2GB
}

const LIMITERS = {
  scraper: new Bottleneck({ maxConcurrent: 40, minTime: 10 }),
  rd: new Bottleneck({ maxConcurrent: 15, minTime: 200 }),
};

const SCRAPER_MODULES = [ require("./engines") ];

const app = express();
app.set('trust proxy', 1);
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function parseSize(sizeText) {
  if (!sizeText) return 0;
  if (typeof sizeText === 'number') return sizeText;
  const cleanStr = sizeText.toString().replace(/,/g, '.').replace(/[^\d.]/g, '');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : Math.floor(num * 1024 * 1024 * 1024);
}

function deduplicateResults(results) {
  const hashMap = new Map();
  for (const item of results) {
    const rawHash = item.infoHash || item.hash || extractInfoHash(item.magnet);
    if (!rawHash) continue;
    const finalHash = rawHash.toUpperCase();
    const existing = hashMap.get(finalHash);
    if (!existing || (item.seeders || 0) > (existing.seeders || 0)) {
      hashMap.set(finalHash, item);
    }
  }
  return Array.from(hashMap.values());
}

function isSafeForItalian(item) {
  if (!item || !item.title) return false;
  const t = item.title;
  return REGEX_TRUSTED_GROUPS.test(t) || REGEX_STRONG_ITA.test(t) || REGEX_MULTI_ITA.test(t) || REGEX_CONTEXT_IT.test(t);
}

async function getMetadata(id, type, config = {}) {
  const cleanType = (type === 'anime') ? 'series' : type;
  let imdbId = id; 
  let season = 0; 
  let episode = 0;
  if (cleanType === "series" && id.includes(":")) {
      const parts = id.split(":");
      imdbId = parts[0];
      season = parseInt(parts[1]);
      episode = parseInt(parts[2]);
  }
  const { data } = await axios.get(`${CONFIG.CINEMETA_URL}/meta/${cleanType}/${imdbId}.json`).catch(() => ({ data: {} }));
  return data?.meta ? { title: data.meta.name, year: data.meta.year?.split("–")[0], imdb_id: imdbId, isSeries: cleanType === "series", season, episode } : null;
}

// --- LOGICA DI RICERCA ---
async function generateStream(type, id, config, userConfStr, reqHost) {
  const cacheKey = `${type}:${id}:${crypto.createHash('md5').update(userConfStr).digest('hex')}`;
  const cachedResult = await Cache.getCachedStream(cacheKey);
  if (cachedResult) return cachedResult;

  const meta = await getMetadata(id, type, config);
  if (!meta) return { streams: [] };

  const { tmdbId } = await imdbToTmdb(meta.imdb_id, config.tmdb);
  const results = await queryRemoteIndexer(tmdbId || meta.imdb_id, type, meta.season, meta.episode, config);
  
  // Mappa solo i risultati Debrid/P2P
  const debridStreams = results.map(item => {
      const { name, title } = formatStreamSelector(item.title, item.source, item.sizeBytes, item.seeders, "RD", config, item.hash);
      return { name, title, url: `${reqHost}/${userConfStr}/play_lazy/rd/${item.hash}/-1` };
  });

  // UNIONE FINALE: Solo Debrid + Eventuali Trailer
  let finalStreams = [...debridStreams];

  if (config.filters && config.filters.enableTrailers) {
      try {
          const trailers = await getTrailerStreams(type, meta.imdb_id, meta.title, meta.season, tmdbId, 'it-IT');
          if (trailers) finalStreams.unshift(...trailers);
      } catch (e) {}
  }

  const resultObj = { streams: finalStreams };
  await Cache.cacheStream(cacheKey, resultObj);
  return resultObj;
}

async function queryRemoteIndexer(id, type, s, e, config) {
    if (!CONFIG.INDEXER_URL) return [];
    try {
        const url = `${CONFIG.INDEXER_URL}/api/get/${id}${s ? `?season=${s}&episode=${e}` : ''}`;
        const { data } = await axios.get(url);
        return data.torrents || [];
    } catch (e) { return []; }
}

function getConfig(configStr) {
  try { return JSON.parse(Buffer.from(configStr, "base64").toString()); } 
  catch (err) { return {}; }
}

// --- ROUTES ---
app.get("/:conf/manifest.json", (req, res) => {
    const manifest = getManifest();
    manifest.name = "L E V I A T H A N 🔱";
    res.json(manifest);
});

app.get("/:conf/stream/:type/:id.json", async (req, res) => {
    const { conf, type, id } = req.params;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = `${protocol}://${req.get('host')}`;
    const result = await generateStream(type, id.replace(".json", ""), getConfig(conf), conf, host);
    res.json(result);
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
    console.log(`🚀 Leviathan Core Online on port ${PORT}`);
});
