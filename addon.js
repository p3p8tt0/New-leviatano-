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

// Carica il core del tuo addon
// (Assumo che il file originale del progetto sia "index.js" o simile)
// Se il tuo file principale ha un altro nome, dimmelo e lo sistemo.
try {
  require("./index.js"); 
  console.log("📦 Modulo Leviatano caricato correttamente.");
} catch (err) {
  console.error("❌ Errore nel caricare il core del progetto:", err);
}

// =========================
// PORTA COMPATIBILE HF
// =========================
const PORT = process.env.PORT || 7000;

// =========================
// ENDPOINT BASE
// =========================
app.get("/", (req, res) => {
  res.send("🦑 Leviatano è attivo e funzionante su Hugging Face!");
});

// =========================
// AVVIO SERVER
// =========================
app.listen(PORT, () => {
  console.log(`🚀 Leviatano attivo
