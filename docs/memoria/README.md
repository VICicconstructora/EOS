---
tipo: indice
version: 1.0
creado: 2026-05-09
ultima_actualizacion: 2026-05-09
actualizado_por: JPM
---

# Memoria Corporativa — IC Constructora

Sistema de documentación viva de la empresa. Cada archivo tiene versión, fecha de actualización y changelog. Para actualizar: editar el archivo correspondiente, incrementar la versión en el frontmatter y agregar una fila al changelog.

## Estructura

```
memoria/
├── _templates/          ← Plantillas estándar para cada tipo de documento
├── empresa/             ← Perfil e organigrama de IC Constructora
├── personas/            ← Una ficha por persona del equipo gerencial
├── procesos/            ← Procesos por área, referenciados desde personas
└── proyectos/           ← Una carpeta por proyecto activo + _pipeline/
```

## Empresa

| Documento | Descripción |
|-----------|-------------|
| [Organigrama](empresa/organigrama.md) | Estructura jerárquica y vacantes |
| [Perfil IC](empresa/perfil-ic.md) | Modelo de negocio, portafolio, stack tecnológico |

## Personas

| Nombre | Cargo | Ficha |
|--------|-------|-------|
| Juan Paulo McAllister | CEO | [→](personas/juan-paulo-mcallister.md) |
| Mónica Báez | Gerente Experiencia | [→](personas/monica-baez.md) |
| Andrés Arango | Gerente Construcción | [→](personas/andres-arango.md) |
| Juan José Leal | Gerente Financiero | [→](personas/juan-jose-leal.md) |
| Diana Olave | Gerente Talento Humano | [→](personas/diana-olave.md) |
| Marcela Arroyave | Gerente Control | [→](personas/marcela-arroyave.md) |
| Nataly Vinchira | Gerente Jurídica | [→](personas/nataly-vinchira.md) |
| Luis Miguel Serrano | Gerente TI | [→](personas/luis-miguel-serrano.md) |

## Procesos

| Área | Proceso | Archivo |
|------|---------|---------|
| Experiencia | Ventas activas | [→](procesos/experiencia/ventas-activas.md) |
| Experiencia | Gestión de trámites | [→](procesos/experiencia/gestion-tramites.md) |
| Experiencia | Cartera pre-escritura | [→](procesos/experiencia/cartera-pre-escritura.md) |
| Construcción | Control presupuesto de obra | [→](procesos/construccion/control-presupuesto-obra.md) |
| Construcción | Avance físico y cortes | [→](procesos/construccion/avance-fisico.md) |
| Financiero | Cierre contable mensual | [→](procesos/financiero/cierre-mensual.md) |
| Financiero | Gestión de tesorería | [→](procesos/financiero/tesoreria.md) |
| Control | Gestión de compras | [→](procesos/control/gestion-compras.md) |
| Control | Posventas y garantías | [→](procesos/control/posventa.md) |
| Jurídico | Escrituración | [→](procesos/juridico/escrituracion.md) |
| Jurídico | Gestión de litigios | [→](procesos/juridico/litigios.md) |
| RRHH | Selección y vinculación | [→](procesos/rrhh/seleccion-talento.md) |
| TI | Integraciones ERP → Supabase | [→](procesos/ti/integraciones-erp.md) |
| Dirección | Reunión L10 gerencial | [→](procesos/direccion/l10-gerencial.md) |

## Proyectos activos

### Propios (fuente: CRM Sinco)

| Proyecto | Etapas | Ventas acum. | Ficha |
|----------|--------|-------------|-------|
| Bosque Central | E1, E2, E3 | 545 | [→](proyectos/bosque-central/index.md) |
| Castilla Imperial | 2A, 2B, P | 271 | [→](proyectos/castilla-imperial/index.md) |
| Castilla Living | E1B, E2A | 503 | [→](proyectos/castilla-living/index.md) |
| Gaia | E1, E2 | 24 | [→](proyectos/gaia/index.md) |
| La Hacienda Jamundí | E1 | 147 | [→](proyectos/la-hacienda-jamundi/index.md) |
| Praia Natura | E1, E2, E3 | 265 | [→](proyectos/praia-natura/index.md) |
| Primera Este | E1, E2, E3 | 170 | [→](proyectos/primera-este/index.md) |
| Reserva de Oporto | E1, E2, E3, E4 | 742 | [→](proyectos/reserva-de-oporto/index.md) |

### Socios (fuente: Flujo Histórico)

| Proyecto | Etapas | Ficha |
|----------|--------|-------|
| Azul Celeste | E1–E4 | [→](proyectos/azul-celeste/index.md) |
| Azul Turquesa | E1–E4 | [→](proyectos/azul-turquesa/index.md) |
| Mitika | E1–E4 | [→](proyectos/mitika/index.md) |
| Verde Vivo | E1–E4 | [→](proyectos/verde-vivo/index.md) |
| Well | — | [→](proyectos/well/index.md) |

### Pipeline — ROCA Q2 2026: cerrar 3 antes del 30 jun 2026

| Proyecto | Etapas | Ficha |
|----------|--------|-------|
| Alpujarra | E1, E2 | [→](proyectos/_pipeline/alpujarra.md) |
| Anapoima | E1, E2 | [→](proyectos/_pipeline/anapoima.md) |
| BLVD 92 | — | [→](proyectos/_pipeline/blvd-92.md) |
| Consejo | — | [→](proyectos/_pipeline/consejo.md) |
| Fabricato | E1–E4 | [→](proyectos/_pipeline/fabricato.md) |
| Gran Manzana | E1, E2 | [→](proyectos/_pipeline/gran-manzana.md) |
| La Hacienda E2–E4 | E2, E3, E4 | [→](proyectos/_pipeline/la-hacienda-e2-e4.md) |
| Tierra Linda | E1–E3 | [→](proyectos/_pipeline/tierra-linda.md) |
| Valle de Ezquio | — | [→](proyectos/_pipeline/valle-de-ezquio.md) |

## Cómo actualizar este sistema

1. Abre el archivo correspondiente.
2. Edita la sección que cambió.
3. Actualiza `ultima_actualizacion`, `actualizado_por` y `version` en el frontmatter.
4. Añade una fila al `## Changelog` al final del archivo.
5. Haz commit en GitHub: `git commit -m "memoria: actualiza [nombre] — [qué cambió]"`

## Integración con Supabase / IA

Estos archivos se sincronizan a la tabla `documents` en Supabase IC con:
- `type = 'memoria'`
- `is_indexed = true`
- `slug = 'memoria/[ruta-relativa]'`

Esto permite que el asistente IA (Claude) use esta memoria como contexto en entrevistas de onboarding, preguntas ejecutivas y análisis de datos.
