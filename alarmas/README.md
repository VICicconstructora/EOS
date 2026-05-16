# 🚨 Alarma Automática de Ingesta - Traccion

Este módulo verifica que todos los proyectos tengan datos de ingesta cargados antes del 15 de cada mes.

## 📋 Estado Actual

**⏳ CONFIGURACIÓN EN PROGRESO - Falta Client Secret de Azure AD**

### ✅ Completado
- Script de verificación (`alarma_proyectos.py`)
- Lógica de detección de anomalías
- Mapeo de responsables (14 proyectos, 3 personas)
- Permisos en Azure AD
- App registrada: **Traccion-IC**

### ⏳ Próximo Paso: Obtener Client Secret

1. Ve a https://portal.azure.com
2. Busca "Aplicaciones registradas"
3. Abre "Traccion-IC"
4. Ve a "Certificados y secretos"
5. **Copia el VALOR** del secreto "Cliente" (cadena larga)
6. Proporciona ese valor para completar la configuración

---

## 🔧 Cómo Usar

### Verificar Estado
```bash
python alarma_proyectos.py --status
python alarma_proyectos.py --status --json
```

### Ejecutar Verificación Completa (cuando esté configurado)
```bash
python alarma_proyectos.py
```

---

## 📁 Archivos

- **alarma_proyectos.py** - Script principal de verificación
- **config_alarmas.json** - Configuración centralizada
- **ALARMAS_STATUS.md** - Estado detallado
- **README.md** - Este archivo

---

## 🔐 Credenciales Azure AD

```
App Name:      Traccion-IC
Tenant ID:     129cb8aa-2444-49b4-acc9-3f6a696f1ff0
Client ID:     a3e3e09a-9bcc-4c58-b6d7-3aefd8bbd744
Client Secret: ⏳ PENDIENTE
```

---

## 👥 Responsables

| Nombre | Email | Proyectos |
|--------|-------|-----------|
| Diego Benavides | dbenavides@icconstructora.co | 7 (Well, Madrid, Mitika, Verde/Azul) |
| Alida Ruiz | aruiz@icconstructora.co | 4 (Gaia, Castilla, Praia) |
| Jhon Manosalva | jmanosalva@icconstructora.co | 5 (Oporto, Hacienda, Primera Este) |

---

## ⚡ Quick Start

Una vez tengas el Client Secret:

1. Actualiza `config_alarmas.json` con el secret
2. Ejecuta `python alarma_proyectos.py --status` para verificar
3. Integra con Task Scheduler para ejecución automática diaria a las 08:00

---

**Fuente:** `C:\Users\jmacallister\OneDrive - IC CONSTRUCTORA SAS\Documentos\ICEOS\IC-EOS`
