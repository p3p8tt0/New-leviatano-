// =========================
// FIX PER NODE 18 (UNDICI)
// =========================
if (typeof File === "undefined") {
  globalThis.File = class File extends Blob {
    constructor(chunks, filename, options = {}) {
      super(chunks, options);
      this.name = filename;
      this.lastModified = options.lastModified || Date.now();
    }
  };
}

// =========================
// IMPORT NECESSARI
// =========================
const express = require("express");
const app = express();

// =========================
// LOG DI AVVIO
// =========================
console.log("===== Application Startup =====");
console.log("📂 Caricamento modulo db-helper (FIXED COLUMN ERROR)...");

// =========================
// CARICAMENTO MODULI CORE
// =========================
try {
  require("./db-helper.js");
  require("./leviathan-pack-resolver.js");
  require("./formatter.js");
  require("./ranking.js");
  require("./smart_parser.js");
  require("./p2p_handler.js");

  console.log("🦑 LEVIATHAN CORE: Caricato correttamente.");
} catch (err) {
  console
