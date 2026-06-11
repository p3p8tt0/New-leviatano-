// ============================================================
//  Vavoo Italia – Provider per Nuvio
//  Mostra solo i canali TV italiani da vavoo.to
// ============================================================

var VAVOO_API   = "https://vavoo.to";
var USER_AGENT  = "VAVOO/2.6 CFNetwork/1206 Darwin/20.1.0";
var _token      = null;

// ── Ottieni token di autenticazione ─────────────────────────
function getToken() {
  if (_token) {
    return Promise.resolve(_token);
  }

  return fetch(VAVOO_API + "/auth", {
    method: "POST",
    headers: {
      "User-Agent":   USER_AGENT,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ type: "signup" })
  })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (!data.token) throw new Error("Token Vavoo non ricevuto");
      _token = data.token;
      return _token;
    });
}

// ── Scarica e filtra i canali italiani ──────────────────────
function getItalianChannels(token) {
  return fetch(VAVOO_API + "/channels", {
    headers: {
      "User-Agent":    USER_AGENT,
      "Authorization": "Bearer " + token
    }
  })
    .then(function (res) { return res.json(); })
    .then(function (channels) {
      return channels.filter(function (ch) {
        var country = (ch.country || "").toLowerCase();
        return country === "italy" || country === "it";
      });
    });
}

// ── Costruisce l'URL diretto dello stream ────────────────────
function buildStreamUrl(channelId, token) {
  return VAVOO_API + "/play/" + channelId + "?token=" + token;
}

// ── Funzione principale richiesta da Nuvio ───────────────────
// Nuvio chiama getStreams(tmdbId, mediaType, season, episode)
// Per i canali Live, tmdbId contiene l'ID canale passato dall'utente.
function getStreams(tmdbId, mediaType, season, episode) {
  console.log("[VavooItalia] Richiesta stream per:", mediaType, tmdbId);

  return getToken()
    .then(function (token) {
      return getItalianChannels(token).then(function (channels) {
        return { token: token, channels: channels };
      });
    })
    .then(function (ctx) {
      var token    = ctx.token;
      var channels = ctx.channels;

      // Se è una ricerca generica, restituisce tutti i canali italiani
      // come stream multipli (uno per canale)
      var streams = channels.map(function (ch) {
        var chId = ch.id || ch.name;
        return {
          name:    "Vavoo Italia",
          title:   "\uD83C\uDDEE\uD83C\uDDF9 " + ch.name + (ch.category ? " \u2022 " + ch.category : ""),
          url:     buildStreamUrl(chId, token),
          quality: "Live",
          headers: {
            "User-Agent":    USER_AGENT,
            "Authorization": "Bearer " + token
          }
        };
      });

      console.log("[VavooItalia] Canali italiani trovati:", streams.length);
      return streams;
    })
    .catch(function (err) {
      console.error("[VavooItalia] Errore:", err.message);
      return [];
    });
}

module.exports = { getStreams: getStreams };
