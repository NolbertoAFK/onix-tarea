-- Permite reemplazar la sesion activa anterior del mismo usuario autenticado.
-- Ejecuta este parche si ya tienes la base creada y el login se queda bloqueado.

create or replace function public.force_start_browser_session(browser_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or browser_token is null or length(browser_token) < 16 then
    return false;
  end if;

  update public.perfiles
  set active_session_token = browser_token,
      active_session_started_at = now()
  where id = auth.uid();

  return found;
end;
$$;

grant execute on function public.force_start_browser_session(text) to authenticated;

-- Solucion rapida para liberar todos los bloqueos actuales durante pruebas:
-- update public.perfiles
-- set active_session_token = null,
--     active_session_started_at = null;
