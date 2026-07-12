/**
 * ViMi · Servidor local: estáticos + proxy de la hoja de Google
 * --------------------------------------------------------------
 * Sirve el dashboard y el hub por HTTP en la red local y reenvía /api
 * a la web app de Apps Script (la Google Sheet es la fuente de verdad).
 * Así el iPhone y el Mac usan /api sin configurar nada, y producción
 * (GitHub Pages) usa la misma hoja pegando la URL /exec en el menú ⋯.
 *
 * La URL del Apps Script se lee de server/data/config.json (gitignorado):
 *   { "appsScriptUrl": "https://script.google.com/macros/s/…/exec" }
 * Sin config, funciona como antes: almacenamiento en vimi-data.json.
 *
 * Uso:  node server/server.js  [puerto]   (por defecto 8090)
 */
var http = require("http");
var fs = require("fs");
var path = require("path");

var PORT = parseInt(process.argv[2], 10) || 8090;
var ROOT = path.join(__dirname, "..");
var DATA_DIR = path.join(__dirname, "data");
var DATA_FILE = path.join(DATA_DIR, "vimi-data.json");
var CONFIG_FILE = path.join(DATA_DIR, "config.json");

var VACIO = { items: [], budget: {}, masters: {}, canales: [], mensajes: [], tareas: [] };

function config() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")); } catch (e) { return {}; }
}
function leerCache() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch (e) { return JSON.parse(JSON.stringify(VACIO)); }
}
// Copia local: caché de lectura si la hoja no responde + backup diario (7 días)
function guardarCache(d) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  var tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(d, null, 1));
  fs.renameSync(tmp, DATA_FILE);
  var dia = new Date().toISOString().slice(0, 10);
  var bak = path.join(DATA_DIR, "backup-" + dia + ".json");
  if (!fs.existsSync(bak)) {
    fs.writeFileSync(bak, JSON.stringify(d, null, 1));
    fs.readdirSync(DATA_DIR).filter(function (f) { return /^backup-\d{4}-\d{2}-\d{2}\.json$/.test(f); })
      .sort().slice(0, -7).forEach(function (f) { fs.unlinkSync(path.join(DATA_DIR, f)); });
  }
}

function apiGet(res) {
  var url = config().appsScriptUrl;
  if (!url) { return respondeJson(res, leerCache()); }
  fetch(url).then(function (r) { return r.json(); }).then(function (d) {
    guardarCache(d);
    respondeJson(res, d);
  }).catch(function () {
    respondeJson(res, leerCache()); // sin conexión: última copia conocida
  });
}

function apiPost(res, body) {
  var url = config().appsScriptUrl;
  if (!url) { // modo antiguo: almacenamiento local
    try {
      var b = JSON.parse(body || "{}"), d = leerCache(), out;
      if (b.action === "replace") { d.items = b.items || []; if (b.budget) d.budget = b.budget; if (b.masters) d.masters = b.masters; guardarCache(d); out = { ok: true, count: d.items.length }; }
      else if (b.action === "replaceHub") { d.canales = b.canales || []; d.mensajes = b.mensajes || []; d.tareas = b.tareas || []; guardarCache(d); out = { ok: true }; }
      else out = { error: "accion desconocida" };
      return respondeJson(res, out);
    } catch (e) { return respondeJson(res, { error: String(e) }); }
  }
  fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body })
    .then(function (r) { return r.text(); })
    .then(function (t) {
      var out; try { out = JSON.parse(t); } catch (e) { out = { ok: true }; } // la redirección de Google a veces no devuelve JSON
      try { var b = JSON.parse(body || "{}"), d = leerCache();
        if (b.action === "replace") { d.items = b.items || []; d.budget = b.budget || d.budget; d.masters = b.masters || d.masters; }
        if (b.action === "replaceHub") { d.canales = b.canales || []; d.mensajes = b.mensajes || []; d.tareas = b.tareas || []; }
        guardarCache(d);
      } catch (e) {}
      respondeJson(res, out);
    })
    .catch(function (e) { respondeJson(res, { error: "sin conexión con la hoja: " + e.message }); });
}

function respondeJson(res, obj) {
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

var MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };

function servirEstatico(req, res) {
  var url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") url = "/dashboard/index.html";
  if (url.slice(-1) === "/") url += "index.html";
  var file = path.normalize(path.join(ROOT, url));
  if (file.indexOf(ROOT) !== 0 || url.indexOf("/server/") === 0) { res.writeHead(403); return res.end("Prohibido"); }
  fs.readFile(file, function (err, buf) {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("No encontrado"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(buf);
  });
}

http.createServer(function (req, res) {
  if (req.url.split("?")[0] === "/api") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
    if (req.method === "GET") return apiGet(res);
    if (req.method === "POST") {
      var body = "";
      req.on("data", function (c) { body += c; if (body.length > 20e6) req.destroy(); });
      req.on("end", function () { apiPost(res, body); });
      return;
    }
    res.writeHead(405); return res.end();
  }
  servirEstatico(req, res);
}).listen(PORT, "0.0.0.0", function () {
  console.log("ViMi servidor en http://0.0.0.0:" + PORT + (config().appsScriptUrl ? "  (proxy de la hoja de Google)" : "  (almacenamiento local)"));
});
