-- Ejecuta este parche si ya tienes creada la base anterior.
-- Agrega el control de sesion unica por navegador y los modulos admin.

create schema if not exists private;

alter table public.perfiles
add column if not exists active_session_token text;

alter table public.perfiles
add column if not exists active_session_started_at timestamptz;

create table if not exists public.usuario_roles (
  usuario_id uuid primary key references public.perfiles(id) on delete cascade,
  email text,
  nombre text not null,
  rol text not null default 'usuario' check (rol in ('admin', 'usuario')),
  updated_at timestamptz not null default now()
);

create index if not exists usuario_roles_email_idx on public.usuario_roles(email);
create index if not exists usuario_roles_rol_idx on public.usuario_roles(rol);

grant select on public.perfiles to authenticated;
grant update (nombre) on public.perfiles to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.rol_id = 1
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create or replace function private.sync_usuario_roles_from_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_email text;
  role_name text;
begin
  if tg_op = 'UPDATE' and pg_trigger_depth() > 1 then
    return new;
  end if;

  select u.email::text
  into user_email
  from auth.users u
  where u.id = new.id;

  select r.nombre
  into role_name
  from public.roles r
  where r.id = new.rol_id;

  insert into public.usuario_roles (usuario_id, email, nombre, rol, updated_at)
  values (new.id, user_email, new.nombre, coalesce(role_name, 'usuario'), now())
  on conflict (usuario_id) do update
  set email = excluded.email,
      nombre = excluded.nombre,
      rol = excluded.rol,
      updated_at = now();

  return new;
end;
$$;

create or replace function private.apply_usuario_roles_to_perfiles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_role text;
  remaining_admins integer;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  normalized_role := lower(btrim(new.rol));

  if normalized_role not in ('admin', 'usuario') then
    raise exception 'Rol invalido. Usa admin o usuario.';
  end if;

  if tg_op = 'UPDATE' then
    if old.rol = 'admin' and normalized_role = 'usuario' then
      select count(*)
      into remaining_admins
      from public.perfiles
      where rol_id = 1
        and id <> new.usuario_id;

      if remaining_admins = 0 then
        raise exception 'No puedes quitar el ultimo admin del sistema.';
      end if;
    end if;
  end if;

  new.rol := normalized_role;
  new.nombre := btrim(new.nombre);
  new.email := (
    select u.email::text
    from auth.users u
    where u.id = new.usuario_id
  );
  new.updated_at := now();

  update public.perfiles
  set nombre = new.nombre,
      rol_id = case when new.rol = 'admin' then 1 else 2 end
  where id = new.usuario_id;

  if not found then
    raise exception 'No existe un perfil para este usuario.';
  end if;

  return new;
end;
$$;

drop trigger if exists perfiles_sync_usuario_roles on public.perfiles;
create trigger perfiles_sync_usuario_roles
after insert or update of nombre, rol_id on public.perfiles
for each row execute function private.sync_usuario_roles_from_perfil();

drop trigger if exists usuario_roles_apply_to_perfiles on public.usuario_roles;
create trigger usuario_roles_apply_to_perfiles
before insert or update of email, nombre, rol on public.usuario_roles
for each row execute function private.apply_usuario_roles_to_perfiles();

insert into public.usuario_roles (usuario_id, email, nombre, rol, updated_at)
select
  p.id,
  u.email::text,
  p.nombre,
  r.nombre,
  now()
from public.perfiles p
join public.roles r on r.id = p.rol_id
left join auth.users u on u.id = p.id
on conflict (usuario_id) do update
set email = excluded.email,
    nombre = excluded.nombre,
    rol = excluded.rol,
    updated_at = now();

alter table public.usuario_roles enable row level security;

drop policy if exists "usuario_roles visibles por dueno o admin" on public.usuario_roles;
create policy "usuario_roles visibles por dueno o admin"
on public.usuario_roles for select
to authenticated
using (usuario_id = auth.uid() or private.is_admin());

drop policy if exists "admins actualizan usuario_roles" on public.usuario_roles;
create policy "admins actualizan usuario_roles"
on public.usuario_roles for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

revoke all on public.usuario_roles from anon, authenticated;
grant select on public.usuario_roles to authenticated;
grant update (nombre, rol) on public.usuario_roles to authenticated;

create or replace function public.start_browser_session(browser_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_token text;
begin
  if auth.uid() is null or browser_token is null or length(browser_token) < 16 then
    return false;
  end if;

  select p.active_session_token
  into current_token
  from public.perfiles p
  where p.id = auth.uid()
  for update;

  if not found then
    return false;
  end if;

  if current_token is not null and current_token <> browser_token then
    return false;
  end if;

  update public.perfiles
  set active_session_token = browser_token,
      active_session_started_at = now()
  where id = auth.uid();

  return true;
end;
$$;

create or replace function public.clear_browser_session(browser_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or browser_token is null then
    return false;
  end if;

  update public.perfiles
  set active_session_token = null,
      active_session_started_at = null
  where id = auth.uid()
    and active_session_token = browser_token;

  return true;
end;
$$;

grant execute on function public.start_browser_session(text) to authenticated;
grant execute on function public.clear_browser_session(text) to authenticated;

create or replace function public.admin_update_profile(
  target_user_id uuid,
  new_nombre text,
  new_rol_id smallint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_count integer;
begin
  if not private.is_admin() then
    return false;
  end if;

  if target_user_id is null
    or new_nombre is null
    or btrim(new_nombre) = ''
    or new_rol_id not in (1, 2) then
    return false;
  end if;

  if new_rol_id = 2 then
    select count(*)
    into admin_count
    from public.perfiles
    where rol_id = 1
      and id <> target_user_id;

    if admin_count = 0 then
      return false;
    end if;
  end if;

  update public.perfiles
  set nombre = btrim(new_nombre),
      rol_id = new_rol_id
  where id = target_user_id;

  return found;
end;
$$;

create or replace function public.admin_clear_user_session(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() or target_user_id is null then
    return false;
  end if;

  update public.perfiles
  set active_session_token = null,
      active_session_started_at = null
  where id = target_user_id;

  return found;
end;
$$;

create or replace function public.admin_list_profiles()
returns table (
  id uuid,
  email text,
  nombre text,
  rol_id smallint,
  rol_nombre text,
  active_session_started_at timestamptz,
  has_active_session boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    u.email::text,
    p.nombre,
    p.rol_id,
    r.nombre as rol_nombre,
    p.active_session_started_at,
    p.active_session_token is not null as has_active_session,
    p.created_at
  from public.perfiles p
  join public.roles r on r.id = p.rol_id
  left join auth.users u on u.id = p.id
  where private.is_admin()
  order by p.created_at desc;
$$;

grant execute on function public.admin_update_profile(uuid, text, smallint) to authenticated;
grant execute on function public.admin_clear_user_session(uuid) to authenticated;
grant execute on function public.admin_list_profiles() to authenticated;

drop view if exists public.vacaciones_detalle;

create view public.vacaciones_detalle
with (security_invoker = true)
as
select
  v.id,
  v.usuario_id,
  p.nombre as usuario_nombre,
  v.fecha_inicio,
  v.fecha_fin,
  v.dias,
  v.motivo,
  v.estado,
  v.comentario_admin,
  v.autorizado_por,
  admin.nombre as autorizado_por_nombre,
  v.fecha_respuesta,
  v.created_at,
  v.updated_at
from public.vacaciones v
join public.perfiles p on p.id = v.usuario_id
left join public.perfiles admin on admin.id = v.autorizado_por;

grant select on public.vacaciones_detalle to authenticated;

-- Opcional para liberar todas las sesiones activas durante pruebas:
-- update public.perfiles
-- set active_session_token = null,
--     active_session_started_at = null;
