# Sistema de Vacaciones

App Next.js + Supabase para solicitar y autorizar vacaciones.

## Configuracion

1. Crea `.env.local` usando `.env.example`.
2. Pega tus llaves de Supabase:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

3. Ejecuta `supabase/schema.sql` en el SQL Editor de Supabase.
   Si ya tenias la base creada antes de agregar control de sesion unica, ejecuta tambien `supabase/patch-session-control.sql`.
4. En Supabase Auth habilita Email y Google.
5. En Google OAuth agrega el callback de Supabase que muestra el panel del provider.
6. En Supabase Auth > URL Configuration agrega:

```text
http://localhost:3000/auth/callback
```

7. Para convertir un usuario en admin, ejecuta:

```sql
update public.perfiles
set rol_id = 1
where id = (select id from auth.users where email = 'admin@correo.com');
```

Tambien puedes usar el archivo `supabase/create-admin.sql` y cambiar el correo.

## Desarrollo

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Roles

- `usuario`: crea solicitudes de vacaciones y consulta su historial.
- `admin`: ve todas las solicitudes, puede aprobarlas o rechazarlas, gestiona perfiles, cambia roles y libera sesiones activas.

## Modulos del administrador

En `/dashboard`, cuando el usuario tiene rol `admin`, aparecen estos modulos:

- Gestion de perfiles y roles: lista todos los usuarios registrados, muestra su correo, nombre, rol y estado de sesion.
- Cambio de rol: muestra el rol actual en una tabla y permite convertir un perfil entre `admin` y `usuario`. La base evita que se elimine el ultimo admin.
- Control de sesion: permite liberar la sesion activa de un usuario para que pueda ingresar de nuevo desde otro navegador.
- Solicitudes recibidas: permite aprobar o rechazar vacaciones con comentario opcional.

## Control de sesion unica

El sistema guarda un token por navegador en una cookie HTTP-only y lo compara con `perfiles.active_session_token`.
Si una misma cuenta intenta ingresar desde otro navegador mientras existe una sesion activa, el login se bloquea y muestra una alerta.

Para liberar sesiones activas durante pruebas:

```sql
update public.perfiles
set active_session_token = null,
    active_session_started_at = null;
```

## Informe

El informe tecnico base esta en `INFORME_TECNICO.md`.
