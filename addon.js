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

// ====== MANIFEST ======
const manifest = {
  id: "org.leviathan",
  version: "1.0.0",
  name: "Leviathan Addon",
  description: "Replica dell'addon originale Leviatano",
  resources: ["catalog", "stream", "meta"],
  types: ["movie", "series"],
  catalogs: [
    {
      type: "movie",
      id: "leviathan_movies",
      name: "Leviathan Movies"
    },
    {
      type: "series",
      id: "leviathan_series",
      name: "Leviathan Series"
    }
  ]
};

// ====== ENDPOINT MANIFEST ======
app.get("/manifest.json", (req, res) => {
  res.json(manifest);
});

// ====== ENDPOINT CATALOGO ======
app.get("/catalog/:type/:id.json", async (req, res) => {
  const { type, id } = req.params;

  // Qui devi collegare il tuo motore di ricerca interno
  const results = []; // TODO: integra Leviathan

  res.json({ metas: results });
});

// ====== ENDPOINT META ======
app.get("/meta/:type/:id.json", async (req, res) => {
  const { type, id } = req.params;

  const meta = {}; // TODO: integra Leviathan

  res.json({ meta });
});

// ====== ENDPOINT STREAM ======
app.get("/stream/:type/:id.json", async (req, res) => {
  const { type, id } = req.params;

  const streams = []; // TODO: integra Leviathan

  res.json({ streams });
});

// ====== PORTA ======
const PORT = process.env.PORT || 7860;

app.listen(PORT, () => {
  console.log("🚀 Addon Stremio attivo su porta " + PORT);
});
