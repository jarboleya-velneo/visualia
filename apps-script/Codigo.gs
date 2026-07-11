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

// ID de la hoja de calculo. Vacio = hoja activa (script vinculado desde
// Extensiones > Apps Script). Con ID, el script puede ser un proyecto standalone.
var SHEET_ID = '';

function ss() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

var SHEET_MOV = 'Movimientos';
var SHEET_PRE = 'Presupuesto';
var SHEET_MAS = 'Maestros';
var SHEET_CAN = 'Canales';
var SHEET_MSG = 'Mensajes';
var SHEET_TAR = 'Tareas';
var CAN_HEADERS = ['id','nombre','cliente','desc','v'];
var MSG_HEADERS = ['id','canal','autor','texto','ts','reacciones','tareaId','del','v'];
var TAR_HEADERS = ['id','canal','cliente','titulo','detalle','estado','persona','prioridad','fecha','vence','del','v'];
var HEADERS = ['id','tipo','freq','periodicidad','categoria','concepto','cliente','proveedor','persona','importe','naturaleza','desde','hasta','mes'];
var PRE_HEADERS = ['ejercicio','categoria','importe_anual','m01','m02','m03','m04','m05','m06','m07','m08','m09','m10','m11','m12'];
var MAS_HEADERS = ['tipo','nombre','nif','email','telefono','rol','categoria','naturaleza','proveedor','notas'];

function setup() {
  var s = ss();
  var mov = s.getSheetByName(SHEET_MOV) || s.insertSheet(SHEET_MOV);
  if (mov.getLastRow() === 0) mov.appendRow(HEADERS);
  var pre = s.getSheetByName(SHEET_PRE) || s.insertSheet(SHEET_PRE);
  if (pre.getLastRow() === 0) pre.appendRow(PRE_HEADERS);
  var mas = s.getSheetByName(SHEET_MAS) || s.insertSheet(SHEET_MAS);
  if (mas.getLastRow() === 0) mas.appendRow(MAS_HEADERS);
  var can = s.getSheetByName(SHEET_CAN) || s.insertSheet(SHEET_CAN);
  if (can.getLastRow() === 0) can.appendRow(CAN_HEADERS);
  var msg = s.getSheetByName(SHEET_MSG) || s.insertSheet(SHEET_MSG);
  if (msg.getLastRow() === 0) msg.appendRow(MSG_HEADERS);
  var tar = s.getSheetByName(SHEET_TAR) || s.insertSheet(SHEET_TAR);
  if (tar.getLastRow() === 0) tar.appendRow(TAR_HEADERS);
}

function doGet() {
  return json({
    items: readItems(), budget: readBudget(), masters: readMasters(),
    canales: readRows(SHEET_CAN, CAN_HEADERS),
    mensajes: readRows(SHEET_MSG, MSG_HEADERS),
    tareas: readRows(SHEET_TAR, TAR_HEADERS)
  });
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
    if (body.action === 'replaceHub') {
      writeRows(SHEET_CAN, CAN_HEADERS, body.canales || []);
      writeRows(SHEET_MSG, MSG_HEADERS, body.mensajes || []);
      writeRows(SHEET_TAR, TAR_HEADERS, body.tareas || []);
      return json({ ok: true, mensajes: (body.mensajes || []).length, tareas: (body.tareas || []).length });
    }
    return json({ error: 'accion desconocida' });
  } catch (err) {
    return json({ error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function sheet(name) {
  var s = ss();
  return s.getSheetByName(name) || s.insertSheet(name);
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
// El valor es un anual (importe_anual) o, si hay detalle mensual, un array de 12 (m01..m12).
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
    if (!r[1]) return;
    var meses = r.slice(3, 15).map(function (v) { return Number(v) || 0; });
    var hayMeses = meses.some(function (v) { return v > 0; });
    out[ej][r[1]] = hayMeses ? meses : (Number(r[2]) || 0);
  });
  return out;
}

function writeBudget(budget) {
  var sh = sheet(SHEET_PRE);
  sh.clear();
  var rows = [PRE_HEADERS];
  Object.keys(budget).sort().forEach(function (ej) {
    Object.keys(budget[ej] || {}).forEach(function (cat) {
      var v = budget[ej][cat];
      if (Object.prototype.toString.call(v) === '[object Array]') {
        var total = v.reduce(function (a, x) { return a + (Number(x) || 0); }, 0);
        rows.push([ej, cat, total].concat(v.map(function (x) { return Number(x) || 0; })));
      } else {
        rows.push([ej, cat, Number(v) || 0].concat(['','','','','','','','','','','','']));
      }
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

// Colecciones del hub (Canales/Mensajes/Tareas): filas planas con cabecera fija.
// "reacciones" viaja como JSON; ts y v son numéricos.
function readRows(name, headers) {
  var sh = sheet(name);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var head = values[0].map(String);
  return values.slice(1).filter(function (r) { return String(r[0]).length; }).map(function (r) {
    var o = {};
    head.forEach(function (h, i) {
      var v = r[i];
      if (v == null || v === '') return;
      if (h === 'ts' || h === 'v') o[h] = Number(v) || 0;
      else if (h === 'del') o[h] = 1;
      else if (h === 'reacciones') { try { o[h] = JSON.parse(v); } catch (e) { o[h] = {}; } }
      else o[h] = v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(v);
    });
    return o;
  });
}

function writeRows(name, headers, rows) {
  var sh = sheet(name);
  sh.clear();
  var out = [headers];
  rows.forEach(function (rec) {
    out.push(headers.map(function (h) {
      var v = rec[h];
      if (v == null) return '';
      if (h === 'reacciones') return JSON.stringify(v);
      return v;
    }));
  });
  var rng = sh.getRange(1, 1, out.length, headers.length);
  rng.setNumberFormat('@');
  rng.setValues(out);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
