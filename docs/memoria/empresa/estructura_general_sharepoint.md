# Estructura General SharePoint: IC Constructora

Este documento centraliza la visión macro del entorno SharePoint de IC Constructora, sirviendo como mapa principal para el acceso automatizado a datos de gestión y operativos.

## 1. Nodos Principales (Sites)
La información está distribuida en varios sitios raíz según su propósito:

| Sitio | URL | Rol |
|---|---|---|
| **GND** | `/sites/GND` | **Gestión de Datos (CORE).** Punto de integración de Tracción/EOS. |
| **GeneralIC** | `/sites/GeneralIC` | Gestión administrativa y corporativa general. |

## 2. Direcciones Generales y Soporte (GND)
Estos sitios centralizan la normativa, archivos maestros y procesos transversales a toda la constructora. Se identifican por el prefijo **AA**.

| Dirección | URL | Propósito |
|---|---|---|
| **AA COMERCIAL** | `/sites/GND/COMER` | Estrategia comercial global. |
| **AA ESTRUCTURACION** | `/sites/GND/ESTRU` | Modelos de negocio y nuevos proyectos. |
| **AA OBRA** | `/sites/GND/OBRAS` | Estándares constructivos y seguimiento macro. |
| **AA COORDINACION** | `/sites/GND/COORD` | Gestión técnica centralizada. |
| **AA JURIDICO** | `/sites/GND/JURID` | Contratos y legal. |
| **AA General Edicion** | `/sites/GND/AAGENERALEDICION` | **Punto de guardado de Perfiles AI.** |

## 3. Jerarquía de Proyectos
Cada proyecto operativo cuelga de GND y posee una estructura departamental (subsitios).

### Proyectos Identificados (13 Macros)
| Proyecto | Prefijo | URL Maestro | Detalle |
|---|---|---|---|
| **Reserva de Oporto** | `Ca-` | `/sites/GND/Ca-ROporto` | [sharepoint_ReservaOporto.md](sharepoint_ReservaOporto.md) |
| **Bosque Central** | `Bu-` | `/sites/GND/Bu-BOS-CENTRAL` | [sharepoint_BosqueCentral.md](sharepoint_BosqueCentral.md) |
| **Azul Celeste** | `MA-` | `/sites/GND/MA-AZULCELESTE` | [sharepoint_AzulCeleste.md](sharepoint_AzulCeleste.md) |
| **Azul Turquesa** | `MA-` | `/sites/GND/MA-AZULTURQUESA` | [sharepoint_AzulTurquesa.md](sharepoint_AzulTurquesa.md) |
| **Verde Vivo** | `MA-` | `/sites/GND/MA-VERDEVIVO` | [sharepoint_VerdeVivo.md](sharepoint_VerdeVivo.md) |
| **Well Calle 100** | `BO-` | `/sites/GND/BO-WELL` | [sharepoint_Well.md](sharepoint_Well.md) |
| **Gaia** | `PE-` | `/sites/GND/PE-GAIA` | [sharepoint_Gaia.md](sharepoint_Gaia.md) |
| **La Hacienda** | `JA-` | `/sites/GND/JAHacienda` | [sharepoint_LaHacienda.md](sharepoint_LaHacienda.md) |
| **Mitika** | `ZI-` | `/sites/GND/ZI-MITIKA` | [sharepoint_Mitika.md](sharepoint_Mitika.md) |
| **Primera Este** | `BO-` | `/sites/GND/BoPrimEste` | [sharepoint_PrimeraEste.md](sharepoint_PrimeraEste.md) |
| **Praia** | `SM-` | `/sites/GND/SmBRI` | [sharepoint_Praia.md](sharepoint_Praia.md) |
| **Castilla Imperial** | `BO-` | `/sites/GND/BOCASTIMP` | [sharepoint_CastillaImperial.md](sharepoint_CastillaImperial.md) |
| **Castilla Imperial VIS** | `BO-` | `/sites/GND/BOCASTVIS` | [sharepoint_CastillaImperialVIS.md](sharepoint_CastillaImperialVIS.md) |

---
## 4. Estándares de Carpeta
Los subsitios de departamentos (ej. COMERCIAL) tienden a seguir una estructura de carpetas lógica y replicable:
1. **Inventarios:** Estado de unidades.
2. **Lista de Precios:** Valores vigentes.
3. **Seguimiento Comercial:** Actas y reuniones.

---
*Última actualización: 2026-05-11*
