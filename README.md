# ViMi · Visual Inteligencia — Dashboard financiero + Hub de equipo

Herramientas de gestión de la división **Visual Inteligencia** (Jesús &amp; Bea). Objetivos: **break-even en 2026** y el **mejor ARR neto × ViMi del grupo en 2027**.

Piezas, sin backend propio ni base de datos:

1. **La hoja de cálculo** (Google Sheets) = **fuente de verdad** compartida para todo (finanzas, mensajes, tareas y maestros).
2. **El Hub** (`hub/index.html`) — el «Slack» de la división: **canales** (#general, #finanzas, #informes y uno por cliente, creados solos desde el maestro), **chat** con @menciones y reacciones, **convertir mensaje en tarea** (☑ al pasar el ratón), **panel de tareas** por canal (estado, responsable, prioridad, vencimiento; migradas desde la antigua hoja de tareas), **generador de informes por cliente** (tareas del periodo + resumen económico) y la tira de KPIs con ARR neto × ViMi y progreso hacia el break-even. Publicado en `/hub/`.
2. **El dashboard** (`dashboard/index.html`, un solo fichero, sin dependencias) que **lee y escribe** en la hoja: KPIs, gráficas interanuales, alta/edición/borrado/duplicado de movimientos (individual y **en lote con multiselección**), **editor de presupuesto por ejercicio**, **maestros** (clientes, proveedores, personas/ViMis, conceptos y categorías) y **resultado por cliente** — todo **sin abrir la hoja**. Filtros por **ejercicio y trimestre** más búsqueda de texto. Responsive (escritorio + iPhone), tema claro/oscuro.

## Estructura

```
visualia/
├── README.md
├── .gitignore
├── dashboard/
│   └── index.html          ← el dashboard (ábrelo en el navegador)
├── apps-script/
│   └── Codigo.gs           ← backend REST sobre la Google Sheet
└── plantilla/
    └── movimientos.csv     ← columnas de la hoja + datos de ejemplo
```

## Uso rápido (modo local, sin nada más)

Abre `dashboard/index.html` en el navegador. Funciona ya, con datos de ejemplo, guardando en tu dispositivo (`localStorage`). Prueba a **＋ Registrar**, editar (✎), duplicar (⧉) o borrar (✕) un movimiento.

## Puesta en marcha con la hoja compartida (Jesús + Bea, mismo dato en todos los dispositivos)

1. **Crea una Google Sheet** nueva en la cuenta compartida.
2. **Extensiones → Apps Script**. Borra lo que haya y pega `apps-script/Codigo.gs`. Guarda.
3. Ejecuta la función **`setup`** una vez (menú ▶). Crea las pestañas *Movimientos* y *Presupuesto*. Autoriza los permisos cuando lo pida.
4. **Implementar → Nueva implementación → Aplicación web**:
   - *Ejecutar como:* **Yo**
   - *Quién tiene acceso:* **Cualquier usuario**
   - Copia la **URL** que acaba en `/exec`.
5. Abre el dashboard, menú **⋯ (Datos y sincronización)**, pega la URL y pulsa **Conectar y sincronizar**.
6. A partir de ahí, cada alta/edición se guarda en la hoja y lo veis los dos. La hoja se puede editar a mano y el dashboard lo lee.

### Para el iPhone

Publica la carpeta `dashboard/` como sitio estático (GitHub Pages, o arrastra la carpeta a [Netlify Drop](https://app.netlify.com/drop)) y abre esa URL en el iPhone. Añádela a la pantalla de inicio para usarla como una app.

## El modelo de datos

Cada fila es un ingreso o gasto. Columnas (iguales en la hoja *Movimientos* y en el CSV):

| Columna | Contenido |
|---|---|
| `tipo` | `ingreso` · `gasto` |
| `freq` | `recurrente` · `puntual` (el valor antiguo `mensual` se acepta y se migra) |
| `periodicidad` | Meses entre apuntes de un recurrente: `1` mensual, `2` bimestral, `3` trimestral, `6` semestral, `12` anual |
| `categoria` | Del maestro de categorías (ingreso o gasto) |
| `concepto` | Del maestro de conceptos (o texto nuevo, que se añade al maestro) |
| `cliente` | Del maestro de clientes (opcional) |
| `proveedor` | Del maestro de proveedores (opcional, gastos) |
| `persona` | Del maestro de personas/ViMis (opcional, gastos: nóminas…) |
| `importe` | Recurrente: por periodo · Puntual: total |
| `naturaleza` | `directo` · `indirecto` (solo gastos) |
| `desde` / `hasta` | Recurrente: rango de meses `YYYY-MM` (`hasta` vacío = indefinido) |
| `mes` | Puntual: mes del apunte `YYYY-MM` |

- **Recurrente** = una sola fila que cuenta un apunte **cada `periodicidad` meses** dentro del rango: no se mete mes a mes. Un gasto trimestral es `freq=recurrente, periodicidad=3`.
- **Puntual con «repetir N»** = genera N apuntes de golpe, separados según la periodicidad elegida (p. ej. 6 cuotas mensuales o 4 pagos trimestrales), editables uno a uno.
- **Directo** (ligado a un cliente: AWS, Claude API, WealthReader) vs **Indirecto** (estructura: nóminas, Claude Max, Wispr). El panel **Resultado por cliente** reparte los indirectos entre clientes **en proporción a la facturación** de cada uno en el periodo.

Otras pestañas de la hoja:

- **Presupuesto**: una fila por (`ejercicio`, `categoria`, `importe_anual`, `m01`…`m12`). Un anual se **prorratea** en el seguimiento mensual/trimestral; con el botón **12** del editor se detalla **mes a mes** (las columnas `m01`…`m12`; el anual pasa a ser la suma). Se edita desde el dashboard (✎ Presupuesto) o a mano.
- **Canales / Mensajes / Tareas**: colecciones del Hub (una fila por registro; `reacciones` viaja como JSON). El Hub sincroniza contra la misma URL del Apps Script que el dashboard.
- **Maestros**: una fila por ficha con columnas `tipo`, `nombre`, `nif`, `email`, `telefono`, `rol`, `categoria`, `naturaleza`, `proveedor`, `notas` (cada tipo usa sus columnas). Tipos: `clientes`, `proveedores`, `personas`, `conceptosIngreso`, `conceptosGasto`, `categoriasIngreso`, `categoriasGasto`. Se gestionan desde el dashboard (botón **Maestros**: pestañas por maestro, crear/editar/eliminar fichas). Renombrar una ficha propaga el cambio a los movimientos y al presupuesto; no se puede eliminar una ficha en uso. Los conceptos admiten valores por defecto (categoría, proveedor) que se autorrellenan al elegirlos. La **naturaleza definida en la ficha del concepto de gasto es la que manda**: reclasifica automáticamente todos sus movimientos (el toggle del formulario se bloquea) y los indirectos se reparten solos entre clientes por facturación. Lo que escribas nuevo en un movimiento crea la ficha sola.

## Trabajar con la tabla de movimientos

- **Filtros**: ejercicio (segmento de años) + periodo (Año / T1–T4 / **12m**) + búsqueda de texto + tipo + naturaleza. El periodo recalcula KPIs, gráficas, desglose, conceptos, clientes y presupuesto. **12m = vista interanual**: los próximos 12 meses desde hoy manteniendo los ingresos y gastos actuales (cruza ejercicios; el presupuesto mezcla los dos años que toca).
- **Multiselección**: marca las casillas (o «seleccionar todo») y aparece la barra de acciones: **✎ Editar** (en lote: categoría, cliente, proveedor, naturaleza — solo se aplican los campos que cambies), **⧉ Duplicar** y **✕ Eliminar**.

## Los KPIs

- **ARR neto × ViMi** (KPI principal) = (ARR de ingresos − costes recurrentes activos anualizados, **excluyendo nóminas**) ÷ nº de ViMis del maestro de personas. Qué es nómina no depende del nombre: se marca con el campo **«Coste de personal»** en la ficha de la categoría de gasto (Maestros). Es la métrica de referencia de la división.
- **Gastos por concepto**: tabla + gráfico de barras con el coste de cada cosa (Velneo Cloud, APIs por cliente…) en mensual equivalente y total del periodo, con proveedor y naturaleza.
- **ARR** = ingresos recurrentes activos anualizados según su periodicidad (`importe × 12 / periodicidad`).
- **Resultado neto** = Ingresos − Costes directos − Costes indirectos, con **margen %**.
- **Ingresos**, **Costes directos**, **Costes indirectos**, todos con variación interanual.
- **Presupuesto vs. real** por categoría, con semáforo de desvío.

## Notas

- No hay secretos en el repo. La URL del Apps Script se pega en el dashboard al usarlo (se guarda en `localStorage`), no en el código.
- Los importes que trae de fábrica son **de ejemplo**; cámbialos por los reales editando la hoja o con «Importar CSV».
