-- Crea una tabla editable para ver y cambiar el rol visible de cada usuario.
-- Ejecuta este archivo en Supabase SQL Editor si tu base ya existe.

create schema if not exists private;

create table if not exists public.usuario_roles (
  usuario_id uuid primary key references public.perfiles(id) on delete cascade,
  email text,
  nombre text not null,
  rol text not null default 'usuario' check (rol in ('admin', 'usuario')),
  updated_at timestamptz not null default now()
);

create index if not exists usuario_roles_email_idx on public.usuario_roles(email);
create index if not exists usuario_roles_rol_idx on public.usuario_roles(rol);

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

grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

-- Para crear el primer admin desde esta tabla:
-- update public.usuario_roles
-- set rol = 'admin'
-- where email = 'admin@correo.com';
