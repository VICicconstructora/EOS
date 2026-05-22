# Ejecución Concurrente — Python Script

## Resumen
Carga los 499 grupos SQL en paralelo (5 threads simultáneamente).
- **Tiempo estimado:** 2-5 minutos
- **Velocidad:** ~180,000 registros/minuto
- **Registros a cargar:** 892,856

## Paso 1: Obtener contraseña PostgreSQL

1. Abre: https://zbjwasufengayvmutypr.supabase.co/
2. Inicia sesión con tu cuenta
3. Selecciona proyecto "default"
4. Ve a **Settings → Database**
5. En la sección "Database password":
   - Copia la contraseña (está oculta detrás de ***)
   - O busca en "Connection pooler" o "Direct connection"
   - La cadena se ve como:
     ```
     postgresql://postgres:CONTRASEÑA@zbjwasufengayvmutypr.db.supabase.co:5432/postgres
     ```

## Paso 2: Ejecutar script

### Opción A: Script interactivo (recomendado)

```powershell
cd "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico"

python load_concurrent_v2.py
# Te pedirá la contraseña (no se mostrará mientras escribes)
```

El script:
1. Solicita la contraseña de forma segura
2. Verifica la conexión
3. Ejecuta los 499 grupos en paralelo
4. Muestra progreso en tiempo real
5. Genera `execution_log_concurrent.json`

### Opción B: Con variable de entorno

```powershell
$env:SUPABASE_DB_PASSWORD = "tu_contraseña"

python load_concurrent.py
```

## Paso 3: Monitorear ejecución

Mientras se ejecuta, verás:
```
[✓] 001/499 - Grupo 001: 100 rows en  0.45s
[✓] 002/499 - Grupo 002: 100 rows en  0.52s
[✓] 003/499 - Grupo 003: 100 rows en  0.48s
...
```

## Paso 4: Verificar resultados

En Supabase SQL Editor ejecuta:
```sql
SELECT COUNT(*) FROM flujo_historico;
-- Debe retornar: ~892,945
-- (892,901 + 45 de pruebas anteriores)
```

## Solución de problemas

### Error: "psycopg2 no encontrado"
```powershell
pip install psycopg2-binary
```

### Error: "conexión rechazada"
- Verifica la contraseña (está entre ** en Supabase Dashboard)
- Verifica que sea la contraseña de **postgres**, no de otro usuario

### Error: "statement_timeout"
- Los archivos son muy grandes para ejecutarse en 5 minutos
- Reduce a 3 workers en el script (`max_workers=3`)

### Error: "duplicated key value"
- Algunos registros ya existen
- Usa en SQL Editor:
  ```sql
  DELETE FROM flujo_historico WHERE id > 45;
  ```
  Luego intenta nuevamente.

## Archivos generados

Después de la ejecución encontrarás:

- `execution_log_concurrent.json` — log completo con tiempos
- `Historico/subbatches/execution_groups/group_*.sql` — archivos originales (sin cambios)

## Próximos pasos

Tras cargar exitosamente:

1. ✅ Verificar COUNT(*) = 892,901
2. Crear vistas SQL:
   ```sql
   CREATE VIEW flujo_real_vs_proyeccion AS
   SELECT 
     proyecto, fecha_periodo, linea_contable,
     SUM(CASE WHEN tipo_linea = 'HISTORICO' THEN valor ELSE 0 END) as real_ejecutado,
     SUM(CASE WHEN tipo_linea = 'PROYECCION' THEN valor ELSE 0 END) as proyectado
   FROM flujo_historico
   GROUP BY proyecto, fecha_periodo, linea_contable;
   ```
3. Crear dashboards KPI en app Tracción
4. Actualizar IC-EOS wiki con fecha de completación

---

**Duración estimada:** 5-10 minutos incluyendo obtención de credenciales
**Requiere:** Python 3.7+, psycopg2-binary, acceso a Supabase Dashboard
