/**
 * ViMi · Backend de la hoja de cálculo (Google Apps Script)
 * -----------------------------------------------------------
 * Convierte una Google Sheet en una pequeña API REST para el dashboard:
 *   GET   -> devuelve movimientos + presupuesto (por ejercicio) + maestros
 *   POST  -> { action: "replace", items: [...], budget: {...}, masters: {...} }
 *
 * El dashboard usa "replace" (reescritura completa) en cada cambio: es simple
 * y fiable para un equipo pequeño. La hoja sigue siendo la fuente de verdad:
 * puedes editarla a mano y el dashboard lo leerá.
 *
 * DESPLIEGUE (una sola vez):
 *   1. Abre tu Google Sheet.
 *   2. Extensiones > Apps Script. Borra lo que haya y pega ESTE archivo.
 *   3. Guarda. Ejecuta la función `setup` una vez (crea las pestañas).
 *   4. Implementar > Nueva implementación > Aplicación web.
 *        - Ejecutar como: Yo
 *        - Quién tiene acceso: Cualquier usuario
 *   5. Copia la URL que acaba en /exec y pégala en el dashboard (menú ⋯).
 *
 * Si ya tenías una hoja de la versión anterior, vuelve a ejecutar `setup`:
 * conserva los datos y añade las columnas/pestañas nuevas al escribir.
 */

var SHEET_MOV = 'Movimientos';
var SHEET_PRE = 'Presupuesto';
var SHEET_MAS = 'Maestros';
var HEADERS = ['id','tipo','freq','periodicidad','categoria','concepto','cliente','proveedor','persona','importe','naturaleza','desde','hasta','mes'];
var PRE_HEADERS = ['ejercicio','categoria','importe_anual'];
var MAS_HEADERS = ['tipo','nombre','nif','email','telefono','rol','categoria','naturaleza','proveedor','notas'];

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mov = ss.getSheetByName(SHEET_MOV) || ss.insertSheet(SHEET_MOV);
  if (mov.getLastRow() === 0) mov.appendRow(HEADERS);
  var pre = ss.getSheetByName(SHEET_PRE) || ss.insertSheet(SHEET_PRE);
  if (pre.getLastRow() === 0) pre.appendRow(PRE_HEADERS);
  var mas = ss.getSheetByName(SHEET_MAS) || ss.insertSheet(SHEET_MAS);
  if (mas.getLastRow() === 0) mas.appendRow(MAS_HEADERS);
}

function doGet() {
  return json({ items: readItems(), budget: readBudget(), masters: readMasters() });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'replace') {
      writeItems(body.items || []);
      if (body.budget) writeBudget(body.budget);
      if (body.masters) writeMasters(body.masters);
      return json({ ok: true, count: (body.items || []).length });
    }
    return json({ error: 'accion desconocida' });
  } catch (err) {
    return json({ error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function sheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

// Si Sheets convirtió un mes "2026-03" en fecha, lo devolvemos a texto YYYY-MM
function toYm(v) {
  if (v instanceof Date) {
    return v.getFullYear() + '-' + ('0' + (v.getMonth() + 1)).slice(-2);
  }
  var s = String(v || '');
  return /^\d{4}-\d{2}/.test(s) ? s.slice(0, 7) : '';
}

function readItems() {
  var sh = sheet(SHEET_MOV);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var head = values[0];
  return values.slice(1).filter(function (r) { return String(r[0]).length; }).map(function (r) {
    var o = {};
    head.forEach(function (h, i) { o[h] = r[i]; });
    o.importe = Number(o.importe) || 0;
    o.periodicidad = Math.max(1, parseInt(o.periodicidad, 10) || 1);
    o.desde = toYm(o.desde); o.hasta = toYm(o.hasta); o.mes = toYm(o.mes);
    // compatibilidad con hojas antiguas (columna "nat" o freq "mensual")
    if (o.freq === 'mensual') o.freq = 'recurrente';
    if (!o.naturaleza && o.nat) o.naturaleza = o.nat;
    delete o.nat;
    return o;
  });
}

function writeItems(items) {
  var sh = sheet(SHEET_MOV);
  sh.clear();
  var rows = [HEADERS];
  items.forEach(function (it) {
    rows.push(HEADERS.map(function (h) { return it[h] != null ? it[h] : ''; }));
  });
  var rng = sh.getRange(1, 1, rows.length, HEADERS.length);
  rng.setNumberFormat('@'); // evita que Sheets convierta "2026-03" en fecha
  rng.setValues(rows);
}

// Presupuesto: una fila por (ejercicio, categoria) -> { "2026": { cat: importe } }
function readBudget() {
  var sh = sheet(SHEET_PRE);
  var values = sh.getDataRange().getValues();
  var out = {};
  values.slice(1).forEach(function (r) {
    if (!r[0]) return;
    // formato antiguo sin ejercicio: (categoria, importe)
    if (isNaN(Number(r[0])) && values[0][0] !== 'ejercicio') {
      var y = String(new Date().getFullYear());
      out[y] = out[y] || {};
      out[y][r[0]] = Number(r[1]) || 0;
      return;
    }
    var ej = String(r[0]);
    out[ej] = out[ej] || {};
    if (r[1]) out[ej][r[1]] = Number(r[2]) || 0;
  });
  return out;
}

function writeBudget(budget) {
  var sh = sheet(SHEET_PRE);
  sh.clear();
  var rows = [PRE_HEADERS];
  Object.keys(budget).sort().forEach(function (ej) {
    Object.keys(budget[ej] || {}).forEach(function (cat) {
      rows.push([ej, cat, budget[ej][cat]]);
    });
  });
  sh.getRange(1, 1, rows.length, PRE_HEADERS.length).setValues(rows);
}

// Maestros: una fila por ficha, con la union de columnas de todos los tipos.
// Tipos: clientes, proveedores, personas, conceptosIngreso, conceptosGasto,
// categoriasIngreso, categoriasGasto. Cada tipo usa solo sus columnas.
function readMasters() {
  var sh = sheet(SHEET_MAS);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return {};
  var head = values[0].map(String);
  var out = {};
  values.slice(1).forEach(function (r) {
    if (!r[0]) return;
    var k = String(r[0]);
    var rec = {};
    head.forEach(function (h, i) {
      if (h === 'tipo' || r[i] == null || r[i] === '') return;
      // compatibilidad con hojas antiguas (columna "valor" en vez de "nombre")
      rec[h === 'valor' ? 'nombre' : h] = String(r[i]);
    });
    if (rec.nombre) (out[k] = out[k] || []).push(rec);
  });
  return out;
}

function writeMasters(masters) {
  var sh = sheet(SHEET_MAS);
  sh.clear();
  var rows = [MAS_HEADERS];
  Object.keys(masters).forEach(function (k) {
    (masters[k] || []).forEach(function (rec) {
      if (typeof rec === 'string') rec = { nombre: rec };
      rows.push(MAS_HEADERS.map(function (h) { return h === 'tipo' ? k : (rec[h] != null ? rec[h] : ''); }));
    });
  });
  var rng = sh.getRange(1, 1, rows.length, MAS_HEADERS.length);
  rng.setNumberFormat('@');
  rng.setValues(rows);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
