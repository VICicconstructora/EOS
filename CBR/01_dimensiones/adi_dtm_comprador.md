# `adi_dtm_comprador`

> **Power BI:** `ADI_DTM Comprador`  ·  **Rol:** Dimensión  ·  **Filas:** 2,548  ·  **Columnas:** 76

## Propósito

Catálogo de compradores (personas/empresas que adquieren unidades o participan en negocios).

## Reglas de Negocio (¡IMPORTANTE!)

*   **Identificación y Unicidad:** Cada comprador es único a nivel de sistema (`idcomprador`). Sinco previene duplicidades, por lo que se asume que cada fila es una persona/empresa distinta. 
*   **Relación Comprador-Negocio (Agrupación):** Esta tabla tiene una lógica *muchos a muchos* frente a los negocios operativos (los cuales en SINCO se llaman formalmente **"Agrupaciones"**). 
    *   Una agrupación / negocio puede tener múltiples compradores registrados.
    *   Un comprador puede participar o tener múltiples agrupaciones (ventas).
*   **Confiabilidad de los Datos Demográficos:** Aunque existen 76 campos pidiendo un nivel de detalle inmenso (mascotas, vehículos, etc.) que actualmente tienen problemas de diligenciamiento desde sala de ventas, las variables que verdaderamente se usan activamente y son confiables/críticas para gerencia son:
    *   **Género (`compradorgenero`)**
    *   **Edad** (calculada vía `compradorfechanacimiento`)
    *   **Lugar de Procedencia** (`compradorciudadresidencia`, barrio, etc.)
    *   **Tamaño de la familia** (`compradorpersonascargo`, `compradornumerohijos`)
    *   **Ingresos demostrados** (`compradoringresosmensuales`, `compradoringresoprommensual`).
*   **Personas Naturales vs Jurídicas:** Todos entran en esta misma tabla como compradores. Para los compradores corporativos, se habilitan los bloques de campos con sufijo `_rl` (Representante Legal). A nivel contable y de reportes se manejan de manera indistinta como clientes.

## Descripción

Una fila por comprador. Incluye datos de identificación, contacto, ubicación, ocupación, ingresos declarados, scoring y atributos demográficos.

## Columnas clave

- `idcomprador` — PK del comprador (llave única en Sinco).
- `doccomprador` — Número de identificación (Cédula o NIT).
- `compradornombres` / `compradorapellidos` — Nombres de personas naturales.
- `compradornombre_rl` — Razón Social / Representante Legal.

## Relaciones

_Sin FKs salientes._

**Referenciada por (FKs entrantes):**

- `adi_dtm_venta.idcomprador` → `adi_dtm_comprador` — Cada venta/agrupación está a nombre de un comprador principal (aunque operativamente existan varios vinculados a la agrupación final).

## Preguntas típicas que responde

- ¿Cuál es el perfil demográfico (género, edad, estrato) de los compradores de un proyecto específico?
- ¿Cuáles son los ingresos demostrados promedio de los compradores agrupados por ciudad?
- ¿Cuántos compradores con perfil jurídico tenemos en el modelo?

## Esquema completo (76 columnas)

| # | columna | tipo | nullable |
|---|---|---|---|
| 1 | `idempresa` | `int4` | Sí |
| 2 | `nombreempresa` | `varchar` | Sí |
| 3 | `idcomprador` | `int4` | No |
| 4 | `doccomprador` | `varchar` | Sí |
| 5 | `compradornombres` | `varchar` | Sí |
| 6 | `compradorapellidos` | `varchar` | Sí |
| 7 | `compradorcorreo` | `varchar` | Sí |
| 8 | `compradortelefono` | `varchar` | Sí |
| 9 | `compradortel2` | `varchar` | Sí |
| 10 | `compradorcelular` | `varchar` | Sí |
| 11 | `compradorcel2` | `varchar` | Sí |
| 12 | `compradordireccion` | `varchar` | Sí |
| 13 | `compradorciudadresidencia` | `varchar` | Sí |
| 14 | `compradorpaisresidencia` | `varchar` | Sí |
| 15 | `compradorpersonascargo` | `int4` | Sí |
| 16 | `compradoringresosmensuales` | `numeric` | Sí |
| 17 | `compradorsalario` | `numeric` | Sí |
| 18 | `compradornacionalidad` | `varchar` | Sí |
| 19 | `compradortransporte` | `varchar` | Sí |
| 20 | `compradorestadocivil` | `varchar` | Sí |
| 21 | `compradorfechanacimiento` | `date` | Sí |
| 22 | `compradornumerohijos` | `varchar` | Sí |
| 23 | `compradorzona` | `varchar` | Sí |
| 24 | `compradorbarrio` | `varchar` | Sí |
| 25 | `compradorocupacion` | `varchar` | Sí |
| 26 | `compradorcargo` | `varchar` | Sí |
| 27 | `compradorprofesion` | `varchar` | Sí |
| 28 | `compradornivelacademico` | `varchar` | Sí |
| 29 | `compradortipodoc` | `varchar` | Sí |
| 30 | `compradordocexpedidoen` | `varchar` | Sí |
| 31 | `compradortipovivienda` | `varchar` | Sí |
| 32 | `compradorconyuguenombre` | `varchar` | Sí |
| 33 | `compradorconyuguedocumento` | `varchar` | Sí |
| 34 | `compradorautorizaenviosms` | `varchar` | Sí |
| 35 | `compradorautorizaenviocorreo` | `varchar` | Sí |
| 36 | `compradorfechacreacion` | `timestamp` | Sí |
| 37 | `compradorempleador` | `varchar` | Sí |
| 38 | `compradorentidadcesantias` | `varchar` | Sí |
| 39 | `compradorvalorcesantias` | `numeric` | Sí |
| 40 | `compradorentidadcajacompensacion` | `varchar` | Sí |
| 41 | `compradorvalorcajacompensacion` | `numeric` | Sí |
| 42 | `compradortiempopermanenciavivienda` | `varchar` | Sí |
| 43 | `compradordireccionoficina` | `varchar` | Sí |
| 44 | `compradorciudadoficina` | `varchar` | Sí |
| 45 | `compradortipocontrato` | `varchar` | Sí |
| 46 | `compradortiponegocio` | `varchar` | Sí |
| 47 | `compradortelefononegocio` | `varchar` | Sí |
| 48 | `compradordireccionnegocio` | `varchar` | Sí |
| 49 | `compradortiempoactividad` | `varchar` | Sí |
| 50 | `compradorciiucod` | `varchar` | Sí |
| 51 | `compradorciiudesc` | `varchar` | Sí |
| 52 | `compradorautorizamsnwhatsapp` | `varchar` | Sí |
| 53 | `compradorautorizallamada` | `varchar` | Sí |
| 54 | `compradorgenero` | `varchar` | Sí |
| 55 | `compradornombre_rl` | `varchar` | Sí |
| 56 | `compradoridentno_rl` | `varchar` | Sí |
| 57 | `compradorexpedidaen_rl` | `varchar` | Sí |
| 58 | `compradortelefono_rl` | `varchar` | Sí |
| 59 | `compradordireccion_rl` | `text` | Sí |
| 60 | `compradorciudad_rl` | `varchar` | Sí |
| 61 | `compradorcorreo_rl` | `varchar` | Sí |
| 62 | `compradormarca_rl` | `varchar` | Sí |
| 63 | `compradornomcortosigla_rl` | `varchar` | Sí |
| 64 | `compradorcargo_rl` | `varchar` | Sí |
| 65 | `compradoracatano_rl` | `varchar` | Sí |
| 66 | `compradoringresoprommensual` | `numeric` | Sí |
| 67 | `categoriasisben` | `varchar` | Sí |
| 68 | `compradortienevehiculo` | `int2` | Sí |
| 69 | `compradortipovehiculo` | `varchar` | Sí |
| 70 | `compradorvehiculoplacano` | `varchar` | Sí |
| 71 | `compradorinfoadicionalotrosingresos` | `numeric` | Sí |
| 72 | `compradoregresosmensual` | `numeric` | Sí |
| 73 | `compradormediotransporte` | `varchar` | Sí |
| 74 | `compradortienemascota` | `int4` | Sí |
| 75 | `compradortienecreditovivienda` | `int4` | Sí |
| 76 | `compradorvalorcreditovivienda` | `numeric` | Sí |

---

[← Volver al índice](../README.md)