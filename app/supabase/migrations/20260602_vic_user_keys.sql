-- =====================================================================
-- Migración: VIC — API key de Anthropic por usuario
-- Fecha: 2026-06-02
--
-- Objetivo: que cada usuario que habla con VIC en Teams consuma SU PROPIA
-- cuota de Anthropic, no la del CEO. Cada usuario registra su key una vez
-- (comando /registrar-key en el chat); VIC la resuelve por su email AAD en
-- cada mensaje. Sin key registrada → VIC no responde (sin fallback).
--
-- Seguridad:
--   * La key se guarda CIFRADA con pgcrypto (pgp_sym_encrypt). La clave
--     maestra de cifrado vive solo en una variable de entorno del bot
--     (VIC_KEYS_SECRET) y se pasa como parámetro a las RPC; NUNCA se guarda
--     en la tabla. Aunque se filtre la tabla, las keys quedan cifradas.
--   * RPC SECURITY DEFINER; grants solo a service_role (la usa el bot).
--   * RLS habilitado y sin políticas → nadie llega a la tabla por PostgREST
--     directo; el único camino es vía las RPC.
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists public.vic_user_keys (
  company_id   text        not null default 'ic-constructora',
  user_email   text        not null,
  key_cipher   bytea       not null,           -- pgp_sym_encrypt(api_key, master)
  key_hint     text,                            -- últimos 4 chars, para mostrar sin descifrar
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (company_id, user_email)
);

alter table public.vic_user_keys enable row level security;
-- Sin políticas: PostgREST directo queda bloqueado. Solo las RPC (definer) entran.

-- ── Registrar / actualizar la key de un usuario ──────────────────────
-- Cifra con la clave maestra y guarda solo el ciphertext + una pista (4 últimos).
create or replace function public.vic_set_user_key(
  p_email  text,
  p_apikey text,
  p_master text
)
returns void
-- pgcrypto vive en el esquema "extensions" en Supabase; se incluye en search_path.
language plpgsql security definer set search_path to 'public', 'extensions'
as $$
begin
  if p_email is null or btrim(p_email) = '' then
    raise exception 'Email vacío';
  end if;
  if p_apikey is null or btrim(p_apikey) = '' then
    raise exception 'API key vacía';
  end if;
  if p_master is null or btrim(p_master) = '' then
    raise exception 'Clave maestra de cifrado no provista';
  end if;

  insert into public.vic_user_keys (company_id, user_email, key_cipher, key_hint, updated_at)
  values (
    'ic-constructora',
    lower(btrim(p_email)),
    pgp_sym_encrypt(btrim(p_apikey), p_master),
    right(btrim(p_apikey), 4),
    now()
  )
  on conflict (company_id, user_email) do update
    set key_cipher = excluded.key_cipher,
        key_hint   = excluded.key_hint,
        updated_at = now();
end;
$$;

-- ── Resolver la key descifrada de un usuario ─────────────────────────
-- Devuelve la API key en claro (la usa el bot en memoria para llamar a Anthropic).
-- Si el usuario no tiene key registrada, devuelve null.
create or replace function public.vic_get_user_key(
  p_email  text,
  p_master text
)
returns text
language plpgsql security definer set search_path to 'public', 'extensions'
as $$
declare
  cipher bytea;
begin
  if p_master is null or btrim(p_master) = '' then
    raise exception 'Clave maestra de cifrado no provista';
  end if;

  select key_cipher into cipher
  from public.vic_user_keys
  where company_id = 'ic-constructora'
    and user_email = lower(btrim(p_email));

  if cipher is null then
    return null;
  end if;

  return pgp_sym_decrypt(cipher, p_master);
end;
$$;

-- ── ¿Tiene key registrada? (sin descifrar) ───────────────────────────
-- Útil para mensajes/diagnóstico sin exponer la key. Devuelve la pista o null.
create or replace function public.vic_user_key_hint(p_email text)
returns text
language sql security definer set search_path to 'public'
as $$
  select key_hint
  from public.vic_user_keys
  where company_id = 'ic-constructora'
    and user_email = lower(btrim(p_email));
$$;

-- ── Borrar la key de un usuario ──────────────────────────────────────
create or replace function public.vic_delete_user_key(p_email text)
returns void
language sql security definer set search_path to 'public'
as $$
  delete from public.vic_user_keys
  where company_id = 'ic-constructora'
    and user_email = lower(btrim(p_email));
$$;

-- Solo el bot (service_role). No exponer a anon ni authenticated.
revoke all on function public.vic_set_user_key(text, text, text)   from public, anon, authenticated;
revoke all on function public.vic_get_user_key(text, text)         from public, anon, authenticated;
revoke all on function public.vic_user_key_hint(text)              from public, anon, authenticated;
revoke all on function public.vic_delete_user_key(text)            from public, anon, authenticated;

grant execute on function public.vic_set_user_key(text, text, text) to service_role;
grant execute on function public.vic_get_user_key(text, text)       to service_role;
grant execute on function public.vic_user_key_hint(text)            to service_role;
grant execute on function public.vic_delete_user_key(text)          to service_role;
