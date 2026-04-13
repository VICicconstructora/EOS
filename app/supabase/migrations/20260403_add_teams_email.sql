-- Agregar teams_email a la tabla people para resolución de identidades desde Teams
ALTER TABLE public.people
ADD COLUMN IF NOT EXISTS teams_email text default '';

CREATE INDEX IF NOT EXISTS people_teams_email
ON public.people(teams_email)
WHERE teams_email != '';

COMMENT ON COLUMN public.people.teams_email IS
'Email usado en Microsoft Teams. Permite resolver participantes de transcripciones a people.id.';
