-- Ejecuta este SQL una sola vez para crear el primer admin.
-- Cambia el correo por el usuario registrado que quieras promover.

update public.perfiles
set rol_id = 1
where id = (
  select id
  from auth.users
  where email = 'admin@correo.com'
);

-- Verifica que el usuario quedo como admin.
select
  p.id,
  u.email,
  p.nombre,
  r.nombre as rol
from public.perfiles p
join auth.users u on u.id = p.id
join public.roles r on r.id = p.rol_id
where u.email = 'admin@correo.com';
