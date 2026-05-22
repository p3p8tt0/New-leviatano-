// Fix per Node 18 (undici)
if (typeof File === "undefined") {
  globalThis.File = class File extends Blob {
    constructor(chunks, filename, options = {}) {
      super(chunks, options);
      this.name = filename;
      this.lastModified = options.lastModified || Date.now();
    }
  };
}

const express = require("express");
const app = express();

// Carica il core Leviatano
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

app.get("/", (req, res) => {
  res.send("🦑 Leviatano attivo su Hugging Face!");
});

const PORT = process.env.PORT || 7000;

app.listen(PORT, () => {
  console.log("🚀 Leviathan attivo su porta " + PORT);
});
