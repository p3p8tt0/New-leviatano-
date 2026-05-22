// Fix per Node 18 (undici richiede File API)
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
const addon = require("./addon.js"); // importa il tuo addon

const app = express();
const PORT = process.env.PORT || 7860;

// Endpoint di test
app.get("/", (req, res) => {
  res.send("LVTHN Addon attivo su Hugging Face");
});

// Se il tuo addon esporta un'interfaccia HTTP, puoi aggiungerla qui
// app.use("/addon", addon.router);

app.listen(PORT, () => {
  console.log(`Server avviato su porta ${PORT}`);
});

