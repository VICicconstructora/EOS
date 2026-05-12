# Transacciones

Eventos relacionados con cada venta: pagos pactados, pagos recibidos, trámites legales, desistimientos y atributos extendidos.

## Tablas

| Tabla | Filas | Cols | Propósito |
|---|---:|---:|---|
| [`adi_dtm_acuerdos_pago`](adi_dtm_acuerdos_pago.md) | 65,291 | 22 | Plan de pagos pactado con el comprador, fila por cuota. |
| [`adi_dtm_desistimientosventa`](adi_dtm_desistimientosventa.md) | 811 | 28 | Ventas que fueron canceladas / desistidas por el comprador. |
| [`adi_dtm_listadeprecios_detalle`](adi_dtm_listadeprecios_detalle.md) | 85,043 | 14 | Renglones de precio por unidad dentro de una lista de precios. |
| [`adi_dtm_relacion_pagos`](adi_dtm_relacion_pagos.md) | 92,369 | 25 | Pagos efectivamente recibidos (consignaciones reales). |
| [`adi_dtm_tramites`](adi_dtm_tramites.md) | 186,322 | 27 | Trámites legales y operativos asociados a cada venta (escrituración, hipoteca, etc.). |
| [`adi_dtm_variablestextoventas`](adi_dtm_variablestextoventas.md) | 1,061 | 8 | Campos de texto personalizables que CBR define por venta (clausulas, notas, etc.). |

---
[← Volver al índice principal](../README.md)