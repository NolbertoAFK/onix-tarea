-- Ejecuta este parche si ya tienes la base creada.
-- Corrige el seed de roles con identity y registra aparte los usuarios creados por formulario/email.

create schema if not exists private;

insert into public.roles (id, nombre)
overriding system value
values (1, 'admin'), (2, 'usuario')
on conflict (id) do update set nombre = excluded.nombre;

select setval(pg_get_serial_sequence('public.roles', 'id'), 2, true);

create table if not exists public.usuarios_formulario (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nombre text not null,
  metodo_registro text not null default 'formulario' check (metodo_registro = 'formulario'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists usuarios_formulario_email_idx on public.usuarios_formulario(email);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists usuarios_formulario_set_updated_at on public.usuarios_formulario;
create trigger usuarios_formulario_set_updated_at
before update on public.usuarios_formulario
for each row execute function private.set_updated_at();

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

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name text;
begin
  display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1),
    'Usuario'
  );

  insert into public.perfiles (id, nombre, rol_id)
  values (new.id, display_name, 2)
  on conflict (id) do nothing;

  if new.email is not null and (
    new.raw_app_meta_data ->> 'provider' = 'email'
    or coalesce(new.raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'email'
  ) then
    insert into public.usuarios_formulario (id, email, nombre)
    values (new.id, new.email::text, display_name)
    on conflict (id) do update
    set email = excluded.email,
        nombre = excluded.nombre,
        updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

insert into public.usuarios_formulario (id, email, nombre, updated_at)
select
  u.id,
  u.email::text,
  coalesce(
    p.nombre,
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(u.email, '@', 1),
    'Usuario'
  ),
  now()
from auth.users u
left join public.perfiles p on p.id = u.id
where u.email is not null
  and (
    u.raw_app_meta_data ->> 'provider' = 'email'
    or coalesce(u.raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'email'
  )
on conflict (id) do update
set email = excluded.email,
    nombre = excluded.nombre,
    updated_at = now();

alter table public.usuarios_formulario enable row level security;

drop policy if exists "usuarios_formulario visibles por dueno o admin" on public.usuarios_formulario;
create policy "usuarios_formulario visibles por dueno o admin"
on public.usuarios_formulario for select
to authenticated
using (id = auth.uid() or private.is_admin());

drop policy if exists "admins actualizan usuarios_formulario" on public.usuarios_formulario;
create policy "admins actualizan usuarios_formulario"
on public.usuarios_formulario for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

revoke all on public.usuarios_formulario from anon, authenticated;
grant usage on schema public to authenticated;
grant usage on schema private to authenticated;
grant select on public.usuarios_formulario to authenticated;
grant update (nombre) on public.usuarios_formulario to authenticated;
grant execute on function private.is_admin() to authenticated;

-- Si necesitas revisar usuarios creados por formulario:
-- select * from public.usuarios_formulario order by created_at desc;
