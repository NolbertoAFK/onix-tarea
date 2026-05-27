# Informe tecnico - Sistema de vacaciones

## Datos generales

- Curso: Seguridad de Informacion - FISI
- Semestre: 2026-I
- Entregable: Unidad II
- Proyecto: Sistema web para gestion de vacaciones
- Stack: Next.js, React, Supabase Auth, Supabase Postgres, Tailwind CSS

## Objetivo

Desarrollar e implementar un sistema web funcional con autenticacion segura, gestion de perfiles y roles, control de sesion unica por navegador, integracion con Google y diseno responsive para moviles, tablets y computadoras.

## Funcionalidades implementadas

| Requisito | Implementacion |
| --- | --- |
| Sistema web operativo y funcional | Aplicacion Next.js con rutas `/login`, `/dashboard` y `/auth/callback`. |
| Gestion de perfiles y roles | Modulo admin para listar perfiles, editar nombres, cambiar roles y liberar sesiones activas. |
| Control de sesion unica por navegador | Token por navegador en cookie HTTP-only y validacion contra `perfiles.active_session_token`. |
| Alerta por sesion activa previa | Login bloqueado con mensaje cuando otra sesion ya esta activa. |
| Contrasenas almacenadas de forma encriptada | Gestionadas por Supabase Auth en `auth.users`; la app no almacena contrasenas en tablas publicas. |
| Autenticacion con Google | Flujo OAuth con Supabase mediante `/auth/callback`. |
| Diseno responsive | Login y dashboard adaptados para movil; las solicitudes pasan de tabla a tarjetas en pantallas pequenas. |
| Administracion de vacaciones | Usuarios solicitan vacaciones; admins aprueban o rechazan con comentario. |

## Modelo de base de datos

El script completo se encuentra en:

```text
supabase/schema.sql
```

Tablas principales:

- `roles`: define `admin` y `usuario`.
- `perfiles`: relaciona usuarios de `auth.users` con nombre, rol y token de sesion activa.
- `usuario_roles`: tabla editable que muestra `admin` o `usuario` directamente y sincroniza cambios con `perfiles.rol_id`.
- `usuarios_formulario`: tabla separada para usuarios creados por email/contrasena; no incluye cuentas registradas con Google.
- `vacaciones`: almacena solicitudes de vacaciones, estado, comentario y responsable de autorizacion.
- `vacaciones_detalle`: vista segura para mostrar solicitudes con nombre de usuario.

Funciones administrativas:

- `admin_list_profiles()`: lista perfiles con correo, rol y estado de sesion.
- `admin_update_profile()`: actualiza nombre y rol, evitando eliminar el ultimo admin.
- `admin_clear_user_session()`: libera la sesion activa de un usuario.

El primer administrador se crea con el script `supabase/create-admin.sql`; luego ese admin puede gestionar los roles desde la tabla del panel.
Tambien existen los parches `supabase/patch-usuario-roles.sql` y `supabase/patch-usuarios-formulario.sql` para crear las tablas editables en bases ya desplegadas.

Campos clave para sesion unica:

```sql
active_session_token text
active_session_started_at timestamptz
```

## Seguridad aplicada

- Supabase Auth gestiona contrasenas hasheadas.
- No se guardan contrasenas en `public.perfiles` ni en `public.vacaciones`.
- RLS habilitado en tablas publicas.
- Politicas para que usuarios vean sus propias solicitudes y admins vean todas.
- Cookie de sesion de navegador con `httpOnly`, `sameSite=lax` y `secure` en produccion.
- Validacion server-side antes de entrar a `/dashboard`.
- Registro y limpieza de token mediante funciones SQL `security definer`: `start_browser_session` y `clear_browser_session`.
- OAuth de Google con callback controlado por la aplicacion.

## Flujo de sesion unica

1. El usuario inicia sesion por correo/contrasena o Google.
2. El servidor genera un token de navegador.
3. El token se guarda en cookie HTTP-only.
4. El mismo token se registra en `perfiles.active_session_token`.
5. Si otro navegador intenta ingresar con la misma cuenta y el token no coincide, el acceso se bloquea.
6. Cuando una sesion es bloqueada, la app limpia la sesion local y muestra la alerta en `/login`.
7. Al cerrar sesion, se limpia el token de la base de datos y la cookie.

Mensaje mostrado:

```text
Acceso denegado: ya existe una sesion activa en otro navegador.
```

## Despliegue en la nube

Preparado para Vercel:

1. Subir el repositorio a GitHub.
2. Importar el proyecto en Vercel.
3. Configurar variables de entorno:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

4. En Supabase Auth, agregar el callback de produccion:

```text
https://tu-dominio.vercel.app/auth/callback
```

5. Ejecutar el SQL de `supabase/schema.sql` en Supabase.

## Evidencias sugeridas

Capturas para anexar:

1. Pantalla de login responsive.
2. Registro de usuario por correo/contrasena.
3. Inicio de sesion con Google.
4. Dashboard de usuario creando solicitud.
5. Dashboard admin aprobando/rechazando solicitud.
6. Alerta por sesion activa previa.
7. Tablas `perfiles`, `roles` y `vacaciones` con datos.
8. Despliegue en Vercel con URL publica.

## Comandos de verificacion

```bash
npm run lint
npm run build
npm run dev
```

## Conclusiones

El sistema cumple con los requerimientos de autenticacion segura, roles, control de sesion unica, integracion OAuth con Google, gestion funcional de vacaciones, responsive design y preparacion para despliegue cloud.
