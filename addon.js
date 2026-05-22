// Fix Node 18
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

// ====== MANIFEST STREMIO ======
const manifest = {
  id: "org.leviathan",
  version: "1.0.0",
  name: "Leviathan Addon",
  description: "Replica dell'addon originale Leviatano",
  resources: ["catalog", "stream", "meta"],
  types: ["movie", "series"],
  catalogs: [
    { type: "movie", id: "leviathan_movies", name: "Leviathan Movies" },
    { type: "series", id: "leviathan_series", name: "Leviathan Series" }
  ]
};

// Homepage solo informativa
app.get("/", (req, res) => {
  res.send(`
    <h1>🦑 Leviathan Addon</h1>
    <p>L'addon è attivo.</p>
    <p>Manifest: <a href="/manifest.json">/manifest.json</a></p>
  `);
});

// Manifest per Stremio
app.get("/manifest.json", (req, res) => {
  res.json(manifest);
});

// Catalog (stub per ora)
app.get("/catalog/:type/:id.json", async (req, res) => {
  res.json({ metas: [] });
});

// Meta (stub)
app.get("/meta/:type/:id.json", async (req, res) => {
  res.json({ meta: {} });
});

// Stream (stub)
app.get("/stream/:type/:id.json", async (req, res) => {
  res.json({ streams: [] });
});

const PORT = process.env.PORT || 7860;

app.listen(PORT, () => {
  console.log("🚀 Addon Stremio attivo su porta " + PORT);
});
