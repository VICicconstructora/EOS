# ADPRO Datamart - Schema Diagram

**Descripción:** Diagrama de relaciones del datamart ADPRO en Supabase (Star Schema).

---

## Vista General

```
                          ┌─────────────────────────────────────┐
                          │      DIMENSIONES (11 tablas)        │
                          └─────────────────────────────────────┘

    DIM_Fecha (365)          DIM_Empresa (1-10)          DIM_Proyecto (100+)
    ┌──────────────┐        ┌────────────────┐          ┌─────────────────┐
    │ sk_id_fecha  │────┐   │ sk_id_empresa  │──┬───────│ sk_id_proyecto  │
    │ fecha        │    │   │ nombre_empresa │  │       │ nombre_proyecto │
    │ año, mes     │    │   │ nit            │  │       │ codigo_proyecto │
    │ nombre_mes   │    │   │ direccion      │  │       │ macroproyecto   │
    └──────────────┘    │   └────────────────┘  │       │ sk_id_empresa ──┼──►
                        │                       │       │ ciudad          │
                        │                       │       └─────────────────┘
                        │                       │              ▲
                        │                       │              │
    DIM_Tercero         │   DIM_ControlClaseOrigen  DIM_Capitulo    DIM_Items (32K+)
    ┌────────────────┐  │   ┌──────────────────┐   ┌──────────┐   ┌──────────────┐
    │ sk_id_tercero  │  │   │ sk_id_clase_or.  │   │sk_id_cap.│   │ sk_id_items  │
    │ nombre         │  │   │ clase            │   │ capitulo │   │ item_no      │
    │ nit            │  │   │ clase_descripción│   │ descr.   │   │ item_descr.  │
    │ tipo (P/A/C)   │  │   │ origen           │   │sk_id_emp.│   │ sk_id_empresa│
    │ naturaleza (N/J)   │   └──────────────────┘   └──────────┘   └──────────────┘
    └────────────────┘  │
                        │
                        │
    DIM_Insumo (32K)    │   DIM_TipoContrato   DIM_EstadoPorDoc  DIM_Usuario
    ┌────────────────┐  │   ┌──────────────┐   ┌──────────────┐  ┌────────────┐
    │ sk_id_insumo   │  │   │sk_id_tipo_c. │   │ sk_id_estado │  │sk_id_usuar.│
    │ insumo_descr.  │  │   │ tipo_codigo  │   │ estado_desc. │  │ nombre     │
    │ tipo_descripc. │  │   │ descripción  │   │tipo_documento   │ cargo      │
    │ agrupacion     │  │   │ sk_id_empresa    └──────────────┘  │ nivel_acc. │
    │ valor_unitario │  │   └──────────────┘                     └────────────┘
    │ sk_id_empresa  │  │
    └────────────────┘  │
                        │
                        └──────────────────────────────┐
                                                       │
                                                       ▼
                        ┌─────────────────────────────────────────────┐
                        │   TABLAS DE HECHOS (14 tablas FACT)         │
                        │   Todas con RLS: company_id = 'ic-construc' │
                        └─────────────────────────────────────────────┘

┌─ CONTROL & PRESUPUESTO ──────────────────────────────────────────────────────┐
│                                                                               │
│  FACT_ControlProyecto (Principal)        FACT_Proyeccion (Reformas)          │
│  ┌──────────────────────────┐            ┌────────────────────────┐          │
│  │ sk_id_fact_control_proy. │            │sk_id_fact_proyeccion   │          │
│  │ sk_id_empresa ───────────┼────┬──────►│ sk_id_empresa          │          │
│  │ sk_id_proyecto ─────────►│    │       │ sk_id_proyecto ───────►│          │
│  │ sk_id_fecha ────────────┬┼────┼──────►│ sk_id_fecha ───────────┼──┐       │
│  │ sk_id_clase_origen ─────┼┼────┼──────►│ sk_id_clase_origen     │  │       │
│  │ sk_id_insumo ──────────┬┼┼────┼──────►│ sk_id_insumo ──────────┼──┤       │
│  │ sk_id_capitulo ────────┼┼┼────┼──────►│ sk_id_items ───────────┼──┤       │
│  │ sk_id_items ───────────┼┼┼────┼──────►│ cantidad               │  │       │
│  │ cantidad               │ │    │       │ valor_total            │  │       │
│  │ valor_total (IVA) ◄───┘ │    │       │ sk_id_usuario          │  │       │
│  │ valor_sin_iva          │ │    │       │ sk_id_estado           │  │       │
│  │ origen_documento       │ │    │       └────────────────────────┘  │       │
│  └──────────────────────────┘ │    │                                 │       │
│                               │    └─────────────────────────────────┘       │
└───────────────────────────────┼─────────────────────────────────────────────┘
                                │
┌─ COMPRAS & CONTRATOS ─────────┼───────────────────────────────────────────┐
│                               │                                           │
│  FACT_Compras               FACT_Contratos                FACT_Anticipo  │
│  ┌─────────────────────┐    ┌────────────────────┐       ┌────────────┐  │
│  │ sk_id_fact_compra   │    │sk_id_fact_contrato │       │sk_id_anticipo
│  │ sk_id_empresa ──────┼───►│ sk_id_empresa ─────┼──────►│sk_id_empresa
│  │ sk_id_proyecto ─────┼───►│ sk_id_proyecto     │       │sk_id_proyecto
│  │ sk_id_tercero ──────┼───►│ sk_id_tercero      │       │sk_id_tercero
│  │ sk_id_fecha_compra ─┼───►│ sk_id_insumo ──────┼──┐    │sk_id_fecha_a.
│  │ sk_id_estado ───────┼───►│ sk_id_items        │  │    │sk_id_fecha_p.
│  │ sk_id_insumo ───────┼───►│ sk_id_tipo_contrato    │    │sk_id_usuario
│  │ sk_id_items ────────┼───►│ sk_id_estado ──────┼──┤    │sk_id_estado
│  │ cantidad_comprada   │    │ clase_contrato     │  │    │valor_anticipo
│  │ valor_total ◄──────┘    │ no_contrato        │  │    │porcentaje_amort
│  │ iva, descuento         │ cantidad_inicial    │  │    └────────────┘
│  └─────────────────────┘    │ cantidad (vigente) │  │
│                             │ valor_total ◄─────┘  │
│                             │ valor_sin_iva        │
│                             └────────────────────┘  │
└──────────────────────────────────────────────────────┘

┌─ ACTAS & FACTURAS ────────────────────────────────────────────────────┐
│                                                                         │
│  FACT_Actas (Cobro a contratistas)     FACT_NotasEnValor (Ajustes)    │
│  ┌──────────────────────────┐          ┌──────────────────────┐        │
│  │ sk_id_fact_acta          │          │ sk_id_fact_nota      │        │
│  │ sk_id_empresa ───────────┼─────────►│ sk_id_empresa        │        │
│  │ sk_id_proyecto ──────────┼─────────►│ sk_id_proyecto       │        │
│  │ sk_id_fecha ──────────────┼────────►│ sk_id_fecha          │        │
│  │ sk_id_estado ─────────────┼────────►│ sk_id_estado         │        │
│  │ sk_id_insumo ─────────────┼────────►│ sk_id_insumo         │        │
│  │ sk_id_items ──────────────┼────────►│ sk_id_tercero        │        │
│  │ cantidad_acta            │          │ total_devolucion     │        │
│  │ valor_unitario           │          │ (Neg: nota débito)   │        │
│  │ valor_total_acta         │          └──────────────────────┘        │
│  │ valor_anticipo (desc.)   │                                          │
│  │ valor_retencion_garantia │                                          │
│  │ valor_total_neto (pago)  │                                          │
│  │ no_factura               │                                          │
│  └──────────────────────────┘                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─ ALMACÉN & INVENTARIO ────────────────────────────────────────────────┐
│                                                                        │
│  FACT_EntradasAlmacen      FACT_SalidasAlmacen    FACT_Devoluciones  │
│  ┌─────────────────────┐   ┌──────────────────┐   ┌────────────────┐ │
│  │sk_id_fact_entrada   │   │sk_id_fact_salida │   │sk_id_fact_dev. │ │
│  │ sk_id_empresa ──────┼──►│ sk_id_empresa    │   │ sk_id_empresa  │ │
│  │ sk_id_proyecto ─────┼──►│ sk_id_proyecto   │   │sk_id_proyecto  │ │
│  │ sk_id_insumo ───────┼──►│ sk_id_insumo     │   │ sk_id_insumo   │ │
│  │ sk_id_fecha_entrada ┼──►│ sk_id_fecha_salida   │ sk_id_tercero  │ │
│  │ sk_id_tercero ──────┼──►│ sk_id_tercero    │   │ sk_id_fecha    │ │
│  │ entrada_cantidad    │   │ bodega_codigo    │   │ sk_id_estado   │ │
│  │ total_entrada ◄─────┘   │ salida_cantidad  │   │ total (-)      │ │
│  │ compra_numero (FK)     │ salida_valor_total   └────────────────┘ │
│  │ entrada_numero         │ salida_item            Saldo:            │
│  │ bodega_codigo          │ salida_numero          Entrada - Salida  │
│  │ remision               │ salida_usuario         - Devoluciones    │
│  │ entrada_factura        │ remision               + Reintegros      │
│  │ entrada_valor_iva      │ bodega_descripcion     + Traslados (ent) │
│  │ entrada_valor_sin_iva  │ bodega_codigo          - Traslados (sal) │
│  └─────────────────────┘   └──────────────────────┘                  │
│                                                                        │
│  FACT_InventarioResumido (Consolidado: todos los movimientos)        │
│  ┌───────────────────────────────────────────────┐                   │
│  │ sk_id_fact_inventario                         │                   │
│  │ sk_id_empresa, sk_id_proyecto ────────────►   │                   │
│  │ sk_id_insumo, sk_id_fecha ────────────────┐   │                   │
│  │ tipo (AI/EP/SA/DP/DO/TE/TS/etc) ◄────────┤   │                   │
│  │ documento, bodega                     │   │   │                   │
│  │ cantidad (+ entrada, - salida)        │   │   │                   │
│  │ total (valor del movimiento)          │   │   │                   │
│  │ NOTA: Saldo = SUM(cantidad) sin filtrar    │   │                   │
│  │       por tipo (suma todos los movimientos)    │                   │
│  └───────────────────────────────────────────────┘                   │
│                                                                        │
│  FACT_Reintegro (Devolución de obra a almacén)                       │
│  ┌──────────────────────┐                                            │
│  │ sk_id_fact_reintegro │                                            │
│  │ sk_id_empresa ───────┼───┐                                        │
│  │ sk_id_proyecto ──────┼───┤                                        │
│  │ sk_id_insumo ────────┼───┤ Revierte salidas previas              │
│  │ sk_id_tercero ───────┼───┤ (aumenta inventario)                  │
│  │ sk_id_fecha ─────────┼───┤                                        │
│  │ cantidad (positiva)  │   │                                        │
│  │ valor_total (+)      │   │                                        │
│  └──────────────────────┘   │                                        │
│                            └─ Reflejado en InventarioResumido        │
│                               tipo = 'DR' (Devolución Reintegro)     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

┌─ CICLO DE PEDIDOS ────────────────────────────────────────────────────┐
│                                                                        │
│  FACT_Pedidos (Solicitud)  ──► FACT_Compras (Orden)                 │
│  ┌──────────────────┐           ┌──────────────┐                    │
│  │ sk_id_fact_ped.  │           │ sk_id_fact_c.│                    │
│  │ sk_id_proyecto   │──────┐    │ sk_id_proyecto
│  │ sk_id_insumo ────┼────┬─┼───►│ sk_id_insumo │                    │
│  │ sk_id_items ─────┼────┼─┼───►│ sk_id_items  │                    │
│  │ sk_id_fecha_ped. │    │ │    │ sk_id_fecha_c
│  │ sk_id_fecha_req. │    │ │    │ cantidad     │                    │
│  │ sk_id_estado ────┼────┼─┼───►│ valor_total  │                    │
│  │ pedido_urgente   │    │ │    │ compra_no    │                    │
│  │ tipo_pedido      │    │ │    │ sk_id_tercero│                    │
│  │ código_OC ◄──────┴────┘ │    │ sk_id_estado │                    │
│  └──────────────────┘      │    └──────────────┘                    │
│                            │         │                              │
│                            │         └──► FACT_EntradasAlmacen      │
│                            │              (Liquidación)             │
│                            │                                        │
│                            └─ Ciclo de Abastecimiento Completo      │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

┌─ TRASLADOS ENTRE PROYECTOS ───────────────────────────────────────────┐
│                                                                        │
│  FACT_Traslados (Doble Registro: Salida + Entrada)                   │
│  ┌──────────────────────────────────────────────────┐               │
│  │ sk_id_fact_traslado                              │               │
│  │ sk_id_empresa                                    │               │
│  │ sk_id_proyecto_traslado (origen) ─────┐         │               │
│  │ sk_id_proyecto_entrada (destino) ─────┼────┐    │               │
│  │ sk_id_insumo ──────────────────────────┼────┼──►│               │
│  │ numero_traslado (salida)               │    │    │               │
│  │ cantidad_traslado, valor_total_traslado    │    │               │
│  │ numero_entrada_traslado (entrada)      │    │    │               │
│  │ cantidad_entrada_traslado, valor_entrada   │    │               │
│  │ NOTA: Diferencias de cantidad/valor        │    │               │
│  │       indican inconsistencias               │    │               │
│  └──────────────────────────────────────────────────┘               │
│                                                                        │
│  Efecto en FACT_InventarioResumido:                                 │
│    - Salida (TS): cantidad negativa en origen                       │
│    - Entrada (TE): cantidad positiva en destino                     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

                        ┌──────────────────────────────┐
                        │      VISTA DENORMALIZADA     │
                        └──────────────────────────────┘

                        adpro_vfact_control_proyecto
                        ┌────────────────────────────┐
                        │ Todos los campos de FACT   │
                        │ + Dimensión Proyecto       │
                        │ + Dimensión Fecha          │
                        │ + Dimensión Insumo         │
                        │ + Dimensión Capitulo       │
                        │ + Dimensión Items          │
                        │ + Dimensión ClaseOrigen    │
                        │                            │
                        │ PARA: Power BI & Reportes  │
                        └────────────────────────────┘
```

---

## Matriz de Relaciones

| FACT → | DIM_Fecha | DIM_Empresa | DIM_Proyecto | DIM_Tercero | DIM_Insumo | DIM_Items | DIM_CapituloP | DIM_ClaseOr | DIM_TipoC | DIM_Estado | DIM_Usuario |
|--------|-----------|-------------|--------------|-------------|-----------|----------|-------------|----------|---------|-----------|------------|
| **FACT_ControlProyecto** | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| **FACT_Contratos** | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ✗ |
| **FACT_Compras** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| **FACT_Actas** | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| **FACT_Anticipo** | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| **FACT_Devoluciones** | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| **FACT_EntradasAlmacen** | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **FACT_SalidasAlmacen** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **FACT_Reintegro** | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **FACT_Traslados** | ✗ | ✓ | ✓✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **FACT_Proyeccion** | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ |
| **FACT_Pedidos** | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| **FACT_InventarioResumido** | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **FACT_NotasEnValor** | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |

**✓ = Relación directa (FK)**  
**✓✓ = Dos relaciones (Traslados: origen + destino)**  
**✗ = Sin relación**

---

## Flujos de Negocio

### Ciclo de Compra
```
Pedido (FACT_Pedidos)
  │ código_orden_de_compra
  ▼
Orden de Compra (FACT_Compras)
  │ compra_numero
  ▼
Entrada de Almacén (FACT_EntradasAlmacen)
  │ compra_numero (FK)
  ▼
Inventario (FACT_InventarioResumido tipo='EP')
```

### Ciclo de Contratación
```
Contrato (FACT_Contratos)
  │ no_contrato, sk_id_tipo_contrato
  ▼
Acta de Cobro (FACT_Actas)
  │ no_contrato (FK), valor_total_acta
  ▼
Anticipo Amortizado (valor_anticipo en FACT_Actas)
  │ Descuento del anticipo (FACT_Anticipo)
  ▼
Pago Neto = valor_total_acta - retenciones - anticipo
```

### Ciclo de Inventario
```
Entrada (EP)  [FACT_EntradasAlmacen]
  │ +cantidad, +valor
  ▼
Saldo = EP - Salidas - Devoluciones + Reintegros + Traslados
  ◄─────────────────────────────────────────────────┘
  │
Salida (SA)   [FACT_SalidasAlmacen]  (↓ cantidad)
  │
Devolución (DP) [FACT_Devoluciones]   (↑ cantidad)
  │
Reintegro (DR)  [FACT_Reintegro]      (↑ cantidad)
  │
Traslado (TS→TE) [FACT_Traslados]     (↓ origen, ↑ destino)
```

### Ciclo de Presupuesto
```
Presupuesto Inicial [FACT_ControlProyecto, clase='Presupuesto Inicial']
  │
Reforma [FACT_Proyeccion]  ◄── sk_id_reforma
  │
Presupuesto Vigente [FACT_ControlProyecto + FACT_Proyeccion]
  │
Consumido [FACT_ControlProyecto, clase='Consumido']
  │
Invertido [FACT_ControlProyecto, clase='Invertido']
  │
Variación = Presupuesto - Invertido
```

---

## Índices Disponibles

```sql
-- DIMENSIONES (búsqueda rápida)
idx_adpro_dim_fecha_fecha (fecha)
idx_adpro_dim_fecha_año_mes (año, mes)
idx_adpro_dim_empresa_nit (nit)
idx_adpro_dim_proyecto_empresa (sk_id_empresa)
idx_adpro_dim_proyecto_codigo (codigo_proyecto)
idx_adpro_dim_proyecto_macroproyecto (macroproyecto)
idx_adpro_dim_tercero_nit (nit)
idx_adpro_dim_tercero_tipo (tipo)

-- HECHOS (filtros comunes)
idx_adpro_fact_control_proyecto (sk_id_proyecto, sk_id_fecha, sk_id_clase_origen)
idx_adpro_fact_contratos_proyecto (sk_id_proyecto)
idx_adpro_fact_compras_proyecto (sk_id_proyecto)
idx_adpro_fact_actas_proyecto (sk_id_proyecto)
idx_adpro_fact_entradas_fecha (sk_id_fecha_entrada)
idx_adpro_fact_salidas_fecha (sk_id_fecha_salida)
idx_adpro_fact_inventario_proyecto (sk_id_proyecto)
... (30+ índices estratégicos en total)
```

---

**Diagrama actualizado:** 2026-05-16  
**Responsable:** Andrés Arango (Construcción)
