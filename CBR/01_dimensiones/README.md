# Dimensiones

Tablas de catálogo / contexto. Cambian poco y se usan para segmentar y describir las ventas. Incluye también la dimensión de tiempo `mc_calendar`.

## Tablas

| Tabla | Filas | Cols | Propósito |
|---|---:|---:|---|
| [`adi_dtm_comprador`](adi_dtm_comprador.md) | 2,548 | 76 | Catálogo de compradores (personas/empresas que adquieren unidades). |
| [`adi_dtm_conceptospp`](adi_dtm_conceptospp.md) | 82 | 8 | Catálogo de conceptos de plan de pagos (Cuota inicial, Mensualidad, Saldo, etc.). |
| [`adi_dtm_inventarios`](adi_dtm_inventarios.md) | 4,402 | 44 | Inventario físico de unidades disponibles (apartamentos, casas, lotes). |
| [`adi_dtm_listadeprecios`](adi_dtm_listadeprecios.md) | 453 | 22 | Cabecera de listas de precios (una por proyecto / fecha de vigencia). |
| [`adi_dtm_macroproyectos`](adi_dtm_macroproyectos.md) | 9 | 19 | Catálogo de macroproyectos: agrupaciones de varios proyectos/etapas que pertenecen a un mismo desarrollo inmobiliario. |
| [`adi_dtm_proyectos`](adi_dtm_proyectos.md) | 28 | 48 | Catálogo de proyectos / etapas inmobiliarias. |
| [`adi_dtm_tiposventa`](adi_dtm_tiposventa.md) | 4 | 5 | Catálogo de tipos de venta (Normal, Promesa, Escrituración, etc.). |
| [`mc_calendar`](mc_calendar.md) | 18,627 | 0 | Dimensión de calendario (todos los días entre 2000-01-02 y 2050-12-31). |

---
[← Volver al índice principal](../README.md)