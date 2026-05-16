# 🚨 Estado del Proyecto: Alarma Automática de Ingesta

**Última actualización:** 2026-05-16  
**Estado General:** ⚠️ EN CONFIGURACIÓN (Falta Client Secret)

---

## ✅ Completado

- [x] Script principal de verificación (`alarma_proyectos.py`)
- [x] Lógica de detección de proyectos faltantes
- [x] Lógica de validación de líneas P&G
- [x] Validación TOTAL vs SUM(Valor)
- [x] Mapeo de responsables por proyecto
- [x] Permisos en Azure AD (`Chat.Create`, `Chat.ReadWrite.All`)
- [x] App registrada: **Traccion-IC**

### Credenciales Azure AD (Traccion-IC)
```
Tenant ID:     129cb8aa-2444-49b4-acc9-3f6a696f1ff0
Client ID:     a3e3e09a-9bcc-4c58-b6d7-3aefd8bbd744
Client Secret: ⏳ PENDIENTE
```

---

## 🔑 PASO CRÍTICO: Obtener Client Secret

1. Abre Azure Portal: https://portal.azure.com
2. Busca "Aplicaciones registradas"
3. Abre "Traccion-IC"
4. Ve a "Certificados y secretos"
5. En "Secretos de cliente", **copia el VALOR** del secreto "Cliente"
6. Proporciona ese valor para completar la configuración

---

## 🔧 Cómo Verificar Estado Desde Aquí

**Opción 1: Python**
```python
from alarma_proyectos import verificar_estado_alarmas
print(verificar_estado_alarmas())
```

**Opción 2: CLI**
```bash
python alarma_proyectos.py --status
python alarma_proyectos.py --status --json
```

---

**Archivos en esta carpeta:**
- `ALARMAS_STATUS.md` - Este archivo
- `alarma_proyectos.py` - Script principal de verificación
- `config_alarmas.json` - Configuración centralizada
