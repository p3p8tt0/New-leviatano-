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
console.log("📂 Avvio del core Leviatano...");

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

  console.log("🦑 Leviathan core caricato.");
} catch (err) {
  console.error("❌ Errore nel core:", err);
}

// =========================
// ENDPOINT BASE
// =========================
app.get("/", (req, res) => {
  res.send("🦑 Leviatano è attivo e funzionante su Hugging Face!");
});

// =========================
// PORTA COMPATIBILE HF
// =========================
const PORT = process.env.PORT || 7860;

// =========================
// AVVIO SERVER
// =========================
app.listen(PORT, () => {
  console.log(`🚀 Leviathan attivo su porta ${PORT}`);
});
