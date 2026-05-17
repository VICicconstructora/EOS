-- ============================================================================
-- SCRIPT SQL PARA SUPABASE - HISTÓRICO DE PROYECTOS IC CONSTRUCTORA
-- ============================================================================
-- Copia y pega este contenido en Supabase → SQL Editor
-- ============================================================================

-- Crear tabla principal
CREATE TABLE IF NOT EXISTS historico (
    id BIGSERIAL PRIMARY KEY,
    proyecto VARCHAR(255) NOT NULL,
    fecha_datos DATE NOT NULL,
    fuente VARCHAR(100),
    pg VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL,
    valor DECIMAL(18, 2),
    tipo_dato VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Clave única: Un registro por (fecha_datos, fecha, pg, proyecto)
    CONSTRAINT uk_historico_unique UNIQUE (fecha_datos, fecha, pg, proyecto)
);

-- Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_historico_proyecto
    ON historico(proyecto);

CREATE INDEX IF NOT EXISTS idx_historico_fecha_datos
    ON historico(fecha_datos);

CREATE INDEX IF NOT EXISTS idx_historico_pg
    ON historico(pg);

CREATE INDEX IF NOT EXISTS idx_historico_fecha
    ON historico(fecha);

CREATE INDEX IF NOT EXISTS idx_historico_tipo_dato
    ON historico(tipo_dato);

-- Índice compuesto para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_historico_proyecto_fecha_datos
    ON historico(proyecto, fecha_datos);

CREATE INDEX IF NOT EXISTS idx_historico_proyecto_pg
    ON historico(proyecto, pg);

-- ============================================================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE historico ENABLE ROW LEVEL SECURITY;

-- Política: Permitir lectura pública
CREATE POLICY "Allow public read" ON historico
    FOR SELECT
    USING (true);

-- Política: Permitir insert/update a usuarios autenticados
CREATE POLICY "Allow authenticated write" ON historico
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON historico
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- CREAR VISTAS ÚTILES
-- ============================================================================

-- Vista 1: Solo datos históricos (anteriores a fecha_datos)
CREATE OR REPLACE VIEW v_historico_datos AS
SELECT
    id,
    proyecto,
    fecha_datos,
    fuente,
    pg,
    fecha,
    valor,
    tipo_dato,
    created_at
FROM historico
WHERE tipo_dato = 'HISTORICO'
ORDER BY proyecto, fecha_datos, pg, fecha;

-- Vista 2: Solo proyecciones (desde fecha_datos en adelante)
CREATE OR REPLACE VIEW v_proyecciones_datos AS
SELECT
    id,
    proyecto,
    fecha_datos,
    fuente,
    pg,
    fecha,
    valor,
    tipo_dato,
    created_at
FROM historico
WHERE tipo_dato = 'PROYECCION'
ORDER BY proyecto, fecha_datos, pg, fecha;

-- Vista 3: Última película cargada por proyecto
CREATE OR REPLACE VIEW v_ultima_pelicula AS
SELECT
    proyecto,
    MAX(fecha_datos)::DATE as fecha_ultima_pelicula,
    COUNT(*) as num_registros,
    COUNT(DISTINCT pg) as lineas_pg
FROM historico
GROUP BY proyecto
ORDER BY proyecto;

-- Vista 4: Resumen de películas por proyecto
CREATE OR REPLACE VIEW v_resumen_peliculas AS
SELECT
    proyecto,
    fecha_datos,
    COUNT(*) as num_registros,
    COUNT(DISTINCT pg) as lineas_pg,
    COUNT(DISTINCT fecha) as fechas_diferentes,
    SUM(CASE WHEN tipo_dato = 'HISTORICO' THEN 1 ELSE 0 END) as historico,
    SUM(CASE WHEN tipo_dato = 'PROYECCION' THEN 1 ELSE 0 END) as proyeccion,
    MIN(fecha) as fecha_minima,
    MAX(fecha) as fecha_maxima
FROM historico
GROUP BY proyecto, fecha_datos
ORDER BY proyecto, fecha_datos DESC;

-- Vista 5: Flujo de Caja por Proyecto y Película
CREATE OR REPLACE VIEW v_flujo_caja AS
SELECT
    proyecto,
    fecha_datos,
    COUNT(DISTINCT fecha) as num_fechas,
    ROUND(SUM(CASE WHEN pg LIKE '16.0%' THEN valor ELSE 0 END)::NUMERIC, 2) as fcl,
    ROUND(SUM(CASE WHEN pg LIKE '16.1%' THEN valor ELSE 0 END)::NUMERIC, 2) as fcl_acumulado,
    ROUND(SUM(CASE WHEN pg LIKE '1.0%' THEN valor ELSE 0 END)::NUMERIC, 2) as ingresos,
    ROUND(SUM(CASE WHEN pg LIKE '9.0%' THEN valor ELSE 0 END)::NUMERIC, 2) as costos
FROM historico
WHERE tipo_dato = 'HISTORICO'
GROUP BY proyecto, fecha_datos
ORDER BY proyecto, fecha_datos DESC;

-- Vista 6: Análisis de Ingresos por Proyecto
CREATE OR REPLACE VIEW v_ingresos_por_proyecto AS
SELECT
    proyecto,
    fecha_datos,
    fecha,
    pg,
    valor,
    tipo_dato
FROM historico
WHERE pg LIKE '1.%' -- Líneas de ingresos
ORDER BY proyecto, fecha_datos DESC, fecha DESC;

-- Vista 7: Últimos datos por línea P&G y proyecto
CREATE OR REPLACE VIEW v_ultima_linea_pg AS
SELECT DISTINCT ON (proyecto, pg)
    proyecto,
    fecha_datos,
    fecha,
    pg,
    valor,
    tipo_dato
FROM historico
WHERE tipo_dato = 'HISTORICO'
ORDER BY proyecto, pg, fecha_datos DESC, fecha DESC;

-- ============================================================================
-- COMENTARIOS EN COLUMNAS (para documentación)
-- ============================================================================

COMMENT ON TABLE historico IS 'Histórico de películas mensuales de proyectos IC Constructora';
COMMENT ON COLUMN historico.proyecto IS 'Nombre del proyecto inmobiliario';
COMMENT ON COLUMN historico.fecha_datos IS 'Fecha de la película/corte mensual';
COMMENT ON COLUMN historico.fuente IS 'Origen de los datos (ej: Proyectos)';
COMMENT ON COLUMN historico.pg IS 'Línea de Presupuesto & Gestión';
COMMENT ON COLUMN historico.fecha IS 'Fecha del dato específico';
COMMENT ON COLUMN historico.valor IS 'Valor monetario del concepto';
COMMENT ON COLUMN historico.tipo_dato IS 'HISTORICO (antes de fecha_datos) o PROYECCION (desde fecha_datos)';

-- ============================================================================
-- FUNCIÓN AUXILIAR: Validar integridad de datos
-- ============================================================================

CREATE OR REPLACE FUNCTION validar_historico()
RETURNS TABLE (
    validacion TEXT,
    resultado TEXT
) AS $$
BEGIN
    -- Validación 1: Registros totales
    RETURN QUERY SELECT 'Total de registros'::TEXT,
                       COUNT(*)::TEXT FROM historico;

    -- Validación 2: Duplicados (no debería haber)
    RETURN QUERY SELECT 'Combinaciones duplicadas'::TEXT,
                       COUNT(*)::TEXT FROM (
                           SELECT fecha_datos, fecha, pg, proyecto, COUNT(*) as cnt
                           FROM historico
                           GROUP BY fecha_datos, fecha, pg, proyecto
                           HAVING COUNT(*) > 1
                       ) dup;

    -- Validación 3: Proyectos únicos
    RETURN QUERY SELECT 'Proyectos únicos'::TEXT,
                       COUNT(DISTINCT proyecto)::TEXT FROM historico;

    -- Validación 4: Películas únicas
    RETURN QUERY SELECT 'Películas (Fecha_Datos únicas)'::TEXT,
                       COUNT(DISTINCT fecha_datos)::TEXT FROM historico;

    -- Validación 5: Líneas P&G únicas
    RETURN QUERY SELECT 'Líneas P&G únicas'::TEXT,
                       COUNT(DISTINCT pg)::TEXT FROM historico;

    -- Validación 6: Tipo de dato
    RETURN QUERY SELECT 'Datos HISTORICO'::TEXT,
                       COUNT(*)::TEXT FROM historico WHERE tipo_dato = 'HISTORICO';

    RETURN QUERY SELECT 'Datos PROYECCION'::TEXT,
                       COUNT(*)::TEXT FROM historico WHERE tipo_dato = 'PROYECCION';

    -- Validación 7: Rango de fechas
    RETURN QUERY SELECT 'Fecha mínima'::TEXT,
                       MIN(fecha)::TEXT FROM historico;

    RETURN QUERY SELECT 'Fecha máxima'::TEXT,
                       MAX(fecha)::TEXT FROM historico;

    RETURN QUERY SELECT 'Película mínima'::TEXT,
                       MIN(fecha_datos)::TEXT FROM historico;

    RETURN QUERY SELECT 'Película máxima'::TEXT,
                       MAX(fecha_datos)::TEXT FROM historico;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- EJECUTAR VALIDACIÓN
-- ============================================================================
-- Descomenta la siguiente línea después de cargar los datos:
-- SELECT * FROM validar_historico();

-- ============================================================================
-- HABILITAR REALTIME (Opcional - para actualizaciones en tiempo real)
-- ============================================================================
-- Descomenta si necesitas Realtime:
-- ALTER PUBLICATION supabase_realtime ADD TABLE historico;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
