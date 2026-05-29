-- =============================================
-- VIC Bot — Búsqueda híbrida (léxica + semántica) sobre wiki_documents
-- Ejecutar en Supabase Dashboard > SQL Editor DESPUÉS de wiki_schema.sql
--
-- Resuelve el problema de fragilidad léxica: antes el bot exigía que TODAS
-- las palabras de la pregunta coincidieran (AND estricto de websearch_to_tsquery),
-- por lo que "cuántos apartamentos tiene Reserva de Oporto" no encontraba la
-- ficha que usa la palabra "unidades". Ahora combina:
--   1. Ranking léxico con OR (ts_rank sobre to_tsquery con términos en |)
--   2. Similitud semántica por embeddings (pgvector) — "apartamentos" ≈ "unidades"
-- =============================================

-- 1. Extensión de vectores (idempotente)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Columna de embedding. Voyage voyage-3-lite → 512 dimensiones.
--    NULL hasta que el indexador la rellene; la búsqueda funciona sin ella
--    (cae a solo-léxico) mientras tanto.
ALTER TABLE public.wiki_documents
  ADD COLUMN IF NOT EXISTS embedding vector(512);

-- 3. Índice ANN para búsqueda semántica rápida (cosine).
--    IVFFlat necesita datos para entrenar; lo creamos pero Postgres lo usa
--    bien aun con pocos vectores. lists=100 es adecuado para ~3-10K filas.
CREATE INDEX IF NOT EXISTS wiki_embedding_idx
  ON public.wiki_documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. Función de búsqueda LÉXICA tolerante.
--    Convierte la consulta en términos OR para no exigir coincidencia total.
--    Devuelve ranking normalizado [0..1] aproximado vía ts_rank.
CREATE OR REPLACE FUNCTION public.search_wiki_lexical(
  query_text text,
  exclude_noise boolean DEFAULT true,
  match_count int DEFAULT 12
)
RETURNS TABLE (
  file_path text,
  title text,
  content text,
  chunk_index int,
  lexical_rank real
)
LANGUAGE plpgsql
AS $$
DECLARE
  ts_q tsquery;
BEGIN
  -- Construir un tsquery con los términos significativos unidos por OR.
  -- to_tsvector('spanish', ...) ya hace stemming, así que "apartamentos" y
  -- "apartamento" comparten lexema. El OR evita el AND estricto de websearch.
  SELECT to_tsquery(
    'spanish',
    string_agg(lexeme, ' | ')
  )
  INTO ts_q
  FROM (
    SELECT DISTINCT lexeme
    FROM unnest(to_tsvector('spanish', query_text)) AS t(lexeme)
  ) lexemes;

  IF ts_q IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    w.file_path,
    w.title,
    w.content,
    w.chunk_index,
    ts_rank(w.search_vector, ts_q) AS lexical_rank
  FROM public.wiki_documents w
  WHERE w.search_vector @@ ts_q
    AND (NOT exclude_noise OR (
      w.file_path NOT LIKE 'wiki/actas/%'
      AND w.file_path NOT LIKE 'wiki/raw/%'
    ))
  ORDER BY lexical_rank DESC
  LIMIT match_count;
END;
$$;

-- 5. Función de búsqueda HÍBRIDA.
--    Combina ranking léxico (OR) + similitud coseno del embedding mediante
--    Reciprocal Rank Fusion (RRF), robusto a escalas distintas.
--    Si query_embedding es NULL, degrada limpiamente a solo-léxico.
CREATE OR REPLACE FUNCTION public.search_wiki_hybrid(
  query_text text,
  query_embedding vector(512) DEFAULT NULL,
  exclude_noise boolean DEFAULT true,
  match_count int DEFAULT 8,
  rrf_k int DEFAULT 60
)
RETURNS TABLE (
  file_path text,
  title text,
  content text,
  chunk_index int,
  score real
)
LANGUAGE plpgsql
AS $$
DECLARE
  ts_q tsquery;
BEGIN
  SELECT to_tsquery('spanish', string_agg(lexeme, ' | '))
  INTO ts_q
  FROM (
    SELECT DISTINCT lexeme
    FROM unnest(to_tsvector('spanish', query_text)) AS t(lexeme)
  ) lexemes;

  RETURN QUERY
  WITH base AS (
    SELECT
      w.id, w.file_path, w.title, w.content, w.chunk_index,
      w.search_vector, w.embedding
    FROM public.wiki_documents w
    WHERE (NOT exclude_noise OR (
      w.file_path NOT LIKE 'wiki/actas/%'
      AND w.file_path NOT LIKE 'wiki/raw/%'
    ))
  ),
  lexical AS (
    SELECT b.id,
           ROW_NUMBER() OVER (ORDER BY ts_rank(b.search_vector, ts_q) DESC) AS rnk
    FROM base b
    WHERE ts_q IS NOT NULL AND b.search_vector @@ ts_q
    LIMIT 40
  ),
  semantic AS (
    SELECT b.id,
           ROW_NUMBER() OVER (ORDER BY b.embedding <=> query_embedding) AS rnk
    FROM base b
    WHERE query_embedding IS NOT NULL AND b.embedding IS NOT NULL
    ORDER BY b.embedding <=> query_embedding
    LIMIT 40
  ),
  fused AS (
    SELECT
      COALESCE(l.id, s.id) AS id,
      COALESCE(1.0 / (rrf_k + l.rnk), 0)
        + COALESCE(1.0 / (rrf_k + s.rnk), 0) AS rrf_score
    FROM lexical l
    FULL OUTER JOIN semantic s ON l.id = s.id
  )
  SELECT b.file_path, b.title, b.content, b.chunk_index, f.rrf_score::real AS score
  FROM fused f
  JOIN base b ON b.id = f.id
  ORDER BY f.rrf_score DESC
  LIMIT match_count;
END;
$$;

-- Permisos: el bot usa service_role (bypasa RLS), pero exponemos a authenticated/anon
-- por si se llama desde el cliente.
GRANT EXECUTE ON FUNCTION public.search_wiki_lexical TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_wiki_hybrid  TO anon, authenticated, service_role;
