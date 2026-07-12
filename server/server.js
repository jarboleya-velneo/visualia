/**
 * ViMi · Servidor local de datos + estáticos
 * ------------------------------------------
 * Sustituye a la hoja de Google mientras no esté disponible: sirve el
 * dashboard y el hub por HTTP y expone la misma API que el Apps Script
 * (GET todo / POST action "replace" | "replaceHub"), guardando los datos
 * en un JSON en disco (server/data/vimi-data.json).
 *
 * Uso:  node server/server.js  [puerto]   (por defecto 8090)
 * Acceso desde el iPhone: http://IP-del-Mac:8090/dashboard/
 */
var http = require("http");
var fs = require("fs");
var path = require("path");

var PORT = parseInt(process.argv[2], 10) || 8090;
var ROOT = path.join(__dirname, "..");
var DATA_DIR = path.join(__dirname, "data");
var DATA_FILE = path.join(DATA_DIR, "vimi-data.json");

var VACIO = { items: [], budget: {}, masters: {}, canales: [], mensajes: [], tareas: [] };

function leerDatos() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch (e) { return JSON.parse(JSON.stringify(VACIO)); }
}

// Escritura atómica: tmp + rename, y copia de seguridad diaria rotada (7 días)
function guardarDatos(d) {
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
    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify(leerDatos()));
    }
    if (req.method === "POST") {
      var body = "";
      req.on("data", function (c) { body += c; if (body.length > 20e6) req.destroy(); });
      req.on("end", function () {
        var out;
        try {
          var b = JSON.parse(body || "{}");
          var d = leerDatos();
          if (b.action === "replace") {
            d.items = b.items || []; if (b.budget) d.budget = b.budget; if (b.masters) d.masters = b.masters;
            guardarDatos(d); out = { ok: true, count: d.items.length };
          } else if (b.action === "replaceHub") {
            d.canales = b.canales || []; d.mensajes = b.mensajes || []; d.tareas = b.tareas || [];
            guardarDatos(d); out = { ok: true, mensajes: d.mensajes.length, tareas: d.tareas.length };
          } else out = { error: "accion desconocida" };
        } catch (e) { out = { error: String(e) }; }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(out));
      });
      return;
    }
    res.writeHead(405); return res.end();
  }
  servirEstatico(req, res);
}).listen(PORT, "0.0.0.0", function () {
  console.log("ViMi servidor en http://0.0.0.0:" + PORT + "  (datos: " + DATA_FILE + ")");
});
