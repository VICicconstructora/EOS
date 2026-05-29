-- =============================================
-- VIC Bot — Tabla wiki_documents
-- Ejecutar en Supabase Dashboard > SQL Editor
-- =============================================

-- Tabla para almacenar chunks del wiki con búsqueda full-text en español
CREATE TABLE IF NOT EXISTS public.wiki_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path    text NOT NULL,
  title        text,
  content      text NOT NULL,
  chunk_index  integer NOT NULL DEFAULT 0,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('spanish', coalesce(title, '') || ' ' || content)
  ) STORED,
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (file_path, chunk_index)
);

-- Índice GIN para búsqueda full-text (requerido para performance)
CREATE INDEX IF NOT EXISTS wiki_search_idx
  ON public.wiki_documents USING GIN (search_vector);

-- Índice adicional para filtrar por archivo
CREATE INDEX IF NOT EXISTS wiki_file_path_idx
  ON public.wiki_documents (file_path);

-- RLS: solo el service_role puede escribir; anon y authenticated pueden leer
ALTER TABLE public.wiki_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wiki_read_all"
  ON public.wiki_documents
  FOR SELECT
  USING (true);

-- Verificar que la tabla quedó bien
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size
FROM pg_tables
WHERE tablename = 'wiki_documents';
