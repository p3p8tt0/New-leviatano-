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
// ENDPOINT BASE
// =========================
app.get("/", (req, res) => {
  res.send("🦑 Leviatano è attivo e funzionante su Hugging Face!");
});

// =========================
// AVVIO DEL CORE ORIGINALE
// =========================
try {
  console.log("📂 Avvio del core Leviatano...");
  require("./leviathan-pack-resolver.js");
  require("./formatter.js");
  require("./ranking.js");
  require("./smart_parser.js");
  require("./p2p_handler.js");
  require("./db-helper.js");
  require("./manifest.js");
  console.log("✅ Core Leviatano caricato correttamente.");
} catch (err) {
  console.error("❌ Errore nel caricare il core Leviatano:", err);
}

// =========================
// PORTA COMPATIBILE HF
// =========================
const PORT = process.env.PORT || 7000;

// =========================
// AVVIO SERVER
// =========================
app.listen(PORT, () => {
  console.log(`🚀 Leviatano attivo su porta ${PORT}`);
});
