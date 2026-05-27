import {
  CalendarCheck,
  CalendarPlus,
  Check,
  Clock3,
  KeyRound,
  LogOut,
  Save,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { signOut } from "@/app/auth/actions";
import {
  clearUserSession,
  createVacationRequest,
  resolveVacationRequest,
  updateUserProfile,
} from "@/app/dashboard/actions";
import { hasValidBrowserSession } from "@/lib/session-control";
import { createClient } from "@/lib/supabase/server";
import type {
  AdminProfile,
  Profile,
  RoleName,
  VacationRequest,
  VacationStatus,
} from "@/lib/types";

type DashboardProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

const statusStyles: Record<VacationStatus, string> = {
  pendiente: "bg-amber-50 text-amber-800 border-amber-200",
  aprobado: "bg-emerald-50 text-emerald-800 border-emerald-200",
  rechazado: "bg-rose-50 text-rose-800 border-rose-200",
};

const statusLabel: Record<VacationStatus, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function resolveRole(profile: Profile | null): RoleName {
  const roles = profile?.roles;
  const roleName = Array.isArray(roles) ? roles[0]?.nombre : roles?.nombre;

  if (roleName) {
    return roleName;
  }

  return profile?.rol_id === 1 ? "admin" : "usuario";
}

function requestTotals(requests: VacationRequest[]) {
  return {
    pendientes: requests.filter((request) => request.estado === "pendiente").length,
    aprobadas: requests.filter((request) => request.estado === "aprobado").length,
    diasAprobados: requests
      .filter((request) => request.estado === "aprobado")
      .reduce((total, request) => total + request.dias, 0),
  };
}

function requesterName(request: VacationRequest) {
  if (request.usuario_nombre) {
    return request.usuario_nombre;
  }

  if (Array.isArray(request.perfiles)) {
    return request.perfiles[0]?.nombre ?? "Usuario";
  }

  return request.perfiles?.nombre ?? "Usuario";
}

export default async function Dashboard({ searchParams }: DashboardProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const validBrowserSession = await hasValidBrowserSession(supabase, user.id);

  if (!validBrowserSession) {
    redirect(
      "/auth/session-blocked?message=Sesion bloqueada: esta cuenta tiene una sesion activa previa en otro navegador.",
    );
  }

  const { data: profile } = await supabase
    .from("perfiles")
    .select("id, nombre, rol_id, roles(nombre)")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return (
      <main className="min-h-screen bg-background px-5 py-8 text-foreground">
        <section className="mx-auto max-w-2xl rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Perfil no encontrado</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Ejecuta el archivo SQL de Supabase para crear el trigger de perfiles.
          </p>
          <form action={signOut} className="mt-5">
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white">
              Cerrar sesion
            </button>
          </form>
        </section>
      </main>
    );
  }

  const currentProfile = profile as unknown as Profile;
  const role = resolveRole(currentProfile);
  const isAdmin = role === "admin";

  const vacationQuery = supabase
    .from("vacaciones_detalle")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: vacationData, error: vacationError } = await vacationQuery;
  const { data: rolesData } = isAdmin
    ? await supabase.from("roles").select("id, nombre").order("id", { ascending: true })
    : { data: [] };
  const { data: adminProfilesData } = isAdmin
    ? await supabase.rpc("admin_list_profiles")
    : { data: [] };

  const requests = (vacationData ?? []) as VacationRequest[];
  const adminProfiles = (adminProfilesData ?? []) as AdminProfile[];
  const roles = (rolesData ?? []) as Array<{ id: number; nombre: RoleName }>;
  const totals = requestTotals(requests);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent sm:text-sm">
              Sistema de vacaciones
            </p>
            <h1 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
              {isAdmin ? "Panel de autorizaciones" : "Mis vacaciones"}
            </h1>
          </div>
          <div className="flex w-full items-center gap-3 sm:w-auto sm:flex-wrap">
            <span className="min-w-0 flex-1 truncate rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-neutral-700 sm:flex-none">
              {currentProfile.nombre} · {isAdmin ? "Admin" : "Usuario"}
            </span>
            <form action={signOut}>
              <button
                title="Cerrar sesion"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-white text-neutral-700 transition hover:bg-surface-muted sm:h-10 sm:w-10"
              >
                <LogOut aria-hidden="true" size={18} />
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-5 sm:py-6">
        {params.message ? (
          <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {params.message}
          </div>
        ) : null}

        <div className="mb-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
          <Metric label="Pendientes" value={totals.pendientes} icon={<Clock3 size={18} />} />
          <Metric label="Aprobadas" value={totals.aprobadas} icon={<ShieldCheck size={18} />} />
          <Metric label="Dias aprobados" value={totals.diasAprobados} icon={<CalendarCheck size={18} />} />
        </div>

        {vacationError ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            No se pudieron cargar las solicitudes: {vacationError.message}
          </div>
        ) : isAdmin ? (
          <AdminView requests={requests} profiles={adminProfiles} roles={roles} />
        ) : (
          <UserView requests={requests} />
        )}
      </section>
    </main>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-600">{label}</span>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function UserView({ requests }: { requests: VacationRequest[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex items-center gap-2">
          <CalendarPlus className="text-primary" aria-hidden="true" size={20} />
          <h2 className="text-lg font-semibold">Nueva solicitud</h2>
        </div>
        <form action={createVacationRequest} className="space-y-4">
          <label className="block text-sm font-medium text-neutral-700">
            Inicio
            <input
              required
              name="fecha_inicio"
              type="date"
              className="mt-1 min-h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-base outline-none ring-primary/20 transition focus:border-primary focus:ring-4 sm:text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-neutral-700">
            Fin
            <input
              required
              name="fecha_fin"
              type="date"
              className="mt-1 min-h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-base outline-none ring-primary/20 transition focus:border-primary focus:ring-4 sm:text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-neutral-700">
            Motivo
            <textarea
              required
              name="motivo"
              rows={4}
              className="mt-1 w-full resize-none rounded-md border border-border bg-white px-3 py-2 text-base outline-none ring-primary/20 transition focus:border-primary focus:ring-4 sm:text-sm"
            />
          </label>
          <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark">
            <CalendarPlus aria-hidden="true" size={18} />
            Enviar solicitud
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="mb-5 text-lg font-semibold">Historial</h2>
        <VacationList requests={requests} />
      </section>
    </div>
  );
}

function AdminView({
  requests,
  profiles,
  roles,
}: {
  requests: VacationRequest[];
  profiles: AdminProfile[];
  roles: Array<{ id: number; nombre: RoleName }>;
}) {
  const adminCount = profiles.filter((profile) => profile.rol_nombre === "admin").length;
  const userCount = profiles.filter((profile) => profile.rol_nombre === "usuario").length;
  const activeSessions = profiles.filter((profile) => profile.has_active_session).length;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex items-center gap-2">
          <Users aria-hidden="true" className="text-primary" size={20} />
          <h2 className="text-lg font-semibold">Gestion de perfiles y roles</h2>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <MiniMetric label="Admins" value={adminCount} />
          <MiniMetric label="Usuarios" value={userCount} />
          <MiniMetric label="Sesiones activas" value={activeSessions} />
        </div>

        <ProfileManager profiles={profiles} roles={roles} />
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="mb-5 text-lg font-semibold">Solicitudes recibidas</h2>
        <VacationList requests={requests} admin />
      </section>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-surface-muted px-3 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ProfileManager({
  profiles,
  roles,
}: {
  profiles: AdminProfile[];
  roles: Array<{ id: number; nombre: RoleName }>;
}) {
  if (profiles.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface-muted px-4 py-8 text-center text-sm text-neutral-600">
        No hay perfiles para mostrar o el usuario actual no tiene permisos de administrador.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {profiles.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} roles={roles} />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-[0.08em] text-neutral-500">
              <th className="border-b border-border px-3 py-3">Usuario</th>
              <th className="border-b border-border px-3 py-3">Nombre</th>
              <th className="border-b border-border px-3 py-3">Rol actual</th>
              <th className="border-b border-border px-3 py-3">Nuevo rol</th>
              <th className="border-b border-border px-3 py-3">Sesion</th>
              <th className="border-b border-border px-3 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.id} className="align-top">
                <td className="border-b border-border px-3 py-4">
                  <p className="max-w-[220px] truncate font-medium text-foreground">
                    {profile.email ?? "Sin correo"}
                  </p>
                  <p className="mt-1 max-w-[220px] truncate font-mono text-xs text-neutral-500">
                    {profile.id}
                  </p>
                </td>
                <td className="border-b border-border px-3 py-4">
                  <ProfileNameInput profile={profile} />
                </td>
                <td className="border-b border-border px-3 py-4">
                  <RoleBadge role={profile.rol_nombre} />
                </td>
                <td className="border-b border-border px-3 py-4">
                  <ProfileRoleSelect profile={profile} roles={roles} />
                </td>
                <td className="border-b border-border px-3 py-4">
                  <SessionBadge profile={profile} />
                </td>
                <td className="space-y-2 border-b border-border px-3 py-4">
                  <SaveProfileButton profile={profile} />
                  <ClearSessionForm profile={profile} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ProfileCard({
  profile,
  roles,
}: {
  profile: AdminProfile;
  roles: Array<{ id: number; nombre: RoleName }>;
}) {
  return (
    <article className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{profile.email ?? "Sin correo"}</p>
          <p className="mt-1 truncate font-mono text-xs text-neutral-500">{profile.id}</p>
        </div>
        <RoleBadge role={profile.rol_nombre} />
      </div>

      <div className="mt-4">
        <ProfileForm profile={profile} roles={roles} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
        <SessionBadge profile={profile} />
        <ClearSessionForm profile={profile} />
      </div>
    </article>
  );
}

function ProfileForm({
  profile,
  roles,
}: {
  profile: AdminProfile;
  roles: Array<{ id: number; nombre: RoleName }>;
}) {
  return (
    <form action={updateUserProfile} className="space-y-3">
      <input type="hidden" name="id" value={profile.id} />
      <input
        required
        name="nombre"
        defaultValue={profile.nombre}
        className="min-h-10 flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
      />
      <select
        name="rol_id"
        defaultValue={profile.rol_id}
        className="min-h-10 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
      >
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.nombre}
          </option>
        ))}
      </select>
      <button
        title="Guardar perfil"
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
      >
        <Save aria-hidden="true" size={16} />
        Guardar
      </button>
    </form>
  );
}

function ProfileNameInput({ profile }: { profile: AdminProfile }) {
  return (
    <input
      required
      form={`profile-form-${profile.id}`}
      name="nombre"
      defaultValue={profile.nombre}
      className="min-h-10 w-full min-w-[180px] rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
    />
  );
}

function ProfileRoleSelect({
  profile,
  roles,
}: {
  profile: AdminProfile;
  roles: Array<{ id: number; nombre: RoleName }>;
}) {
  return (
    <select
      form={`profile-form-${profile.id}`}
      name="rol_id"
      defaultValue={profile.rol_id}
      className="min-h-10 w-full min-w-[140px] rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
    >
      {roles.map((role) => (
        <option key={role.id} value={role.id}>
          {role.nombre === "admin" ? "Admin" : "Usuario"}
        </option>
      ))}
    </select>
  );
}

function SaveProfileButton({ profile }: { profile: AdminProfile }) {
  return (
    <form id={`profile-form-${profile.id}`} action={updateUserProfile}>
      <input type="hidden" name="id" value={profile.id} />
      <button
        title="Guardar nombre y rol"
        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
      >
        <Save aria-hidden="true" size={16} />
        Guardar
      </button>
    </form>
  );
}

function ClearSessionForm({ profile }: { profile: AdminProfile }) {
  return (
    <form action={clearUserSession}>
      <input type="hidden" name="id" value={profile.id} />
      <button
        disabled={!profile.has_active_session}
        title="Liberar sesion activa"
        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-surface-muted disabled:hover:bg-white"
      >
        <KeyRound aria-hidden="true" size={16} />
        Liberar
      </button>
    </form>
  );
}

function RoleBadge({ role }: { role: RoleName }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
        role === "admin"
          ? "border-teal-200 bg-teal-50 text-teal-800"
          : "border-neutral-200 bg-neutral-50 text-neutral-700"
      }`}
    >
      {role === "admin" ? "Admin" : "Usuario"}
    </span>
  );
}

function SessionBadge({ profile }: { profile: AdminProfile }) {
  return (
    <div>
      <span
        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
          profile.has_active_session
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-neutral-200 bg-neutral-50 text-neutral-600"
        }`}
      >
        {profile.has_active_session ? "Activa" : "Libre"}
      </span>
      {profile.active_session_started_at ? (
        <p className="mt-1 text-xs text-neutral-500">
          {new Intl.DateTimeFormat("es-PE", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(profile.active_session_started_at))}
        </p>
      ) : null}
    </div>
  );
}

function VacationList({ requests, admin = false }: { requests: VacationRequest[]; admin?: boolean }) {
  if (requests.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface-muted px-4 py-10 text-center text-sm text-neutral-600">
        No hay solicitudes registradas.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {requests.map((request) => (
          <VacationCard key={request.id} request={request} admin={admin} />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-[0.08em] text-neutral-500">
            {admin ? <th className="border-b border-border px-3 py-3">Usuario</th> : null}
            <th className="border-b border-border px-3 py-3">Rango</th>
            <th className="border-b border-border px-3 py-3">Dias</th>
            <th className="border-b border-border px-3 py-3">Motivo</th>
            <th className="border-b border-border px-3 py-3">Estado</th>
            {admin ? <th className="border-b border-border px-3 py-3">Decision</th> : null}
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id} className="align-top">
              {admin ? (
                <td className="border-b border-border px-3 py-4 font-medium text-foreground">
                  {requesterName(request)}
                </td>
              ) : null}
              <td className="border-b border-border px-3 py-4 text-neutral-700">
                {formatDate(request.fecha_inicio)} - {formatDate(request.fecha_fin)}
              </td>
              <td className="border-b border-border px-3 py-4 font-mono text-neutral-700">
                {request.dias}
              </td>
              <td className="max-w-[260px] border-b border-border px-3 py-4 text-neutral-700">
                {request.motivo}
                {request.comentario_admin ? (
                  <p className="mt-2 rounded-md bg-surface-muted px-2 py-1 text-xs text-neutral-600">
                    {request.comentario_admin}
                  </p>
                ) : null}
              </td>
              <td className="border-b border-border px-3 py-4">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[request.estado]}`}
                >
                  {statusLabel[request.estado]}
                </span>
              </td>
              {admin ? (
                <td className="border-b border-border px-3 py-4">
                  {request.estado === "pendiente" ? (
                    <form action={resolveVacationRequest} className="min-w-[260px] space-y-2">
                      <input type="hidden" name="id" value={request.id} />
                      <textarea
                        name="comentario_admin"
                        rows={2}
                        placeholder="Comentario opcional"
                        className="w-full resize-none rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                      />
                      <div className="flex gap-2">
                        <button
                          name="estado"
                          value="aprobado"
                          className="inline-flex min-h-9 items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark"
                        >
                          <Check aria-hidden="true" size={14} />
                          Aprobar
                        </button>
                        <button
                          name="estado"
                          value="rechazado"
                          className="inline-flex min-h-9 items-center gap-1 rounded-md bg-danger px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-800"
                        >
                          <X aria-hidden="true" size={14} />
                          Rechazar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <span className="text-sm text-neutral-500">Resuelta</span>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </>
  );
}

function VacationCard({ request, admin }: { request: VacationRequest; admin: boolean }) {
  return (
    <article className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {admin ? (
            <p className="truncate text-sm font-semibold text-foreground">{requesterName(request)}</p>
          ) : null}
          <p className="mt-1 text-sm text-neutral-700">
            {formatDate(request.fecha_inicio)} - {formatDate(request.fecha_fin)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[request.estado]}`}
        >
          {statusLabel[request.estado]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md bg-surface-muted px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Dias</p>
          <p className="mt-1 font-mono text-base text-foreground">{request.dias}</p>
        </div>
        <div className="rounded-md bg-surface-muted px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Estado</p>
          <p className="mt-1 text-sm font-medium text-foreground">{statusLabel[request.estado]}</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Motivo</p>
        <p className="mt-1 break-words text-sm leading-6 text-neutral-700">{request.motivo}</p>
        {request.comentario_admin ? (
          <p className="mt-3 rounded-md bg-surface-muted px-3 py-2 text-sm text-neutral-600">
            {request.comentario_admin}
          </p>
        ) : null}
      </div>

      {admin ? (
        <div className="mt-4 border-t border-border pt-4">
          {request.estado === "pendiente" ? (
            <form action={resolveVacationRequest} className="space-y-3">
              <input type="hidden" name="id" value={request.id} />
              <textarea
                name="comentario_admin"
                rows={3}
                placeholder="Comentario opcional"
                className="w-full resize-none rounded-md border border-border bg-white px-3 py-2 text-base outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  name="estado"
                  value="aprobado"
                  className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
                >
                  <Check aria-hidden="true" size={16} />
                  Aprobar
                </button>
                <button
                  name="estado"
                  value="rechazado"
                  className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md bg-danger px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
                >
                  <X aria-hidden="true" size={16} />
                  Rechazar
                </button>
              </div>
            </form>
          ) : (
            <span className="text-sm text-neutral-500">Resuelta</span>
          )}
        </div>
      ) : null}
    </article>
  );
}
