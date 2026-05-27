"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createVacationRequest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fechaInicio = value(formData, "fecha_inicio");
  const fechaFin = value(formData, "fecha_fin");
  const motivo = value(formData, "motivo");

  if (!fechaInicio || !fechaFin || !motivo) {
    redirect("/dashboard?message=Completa todos los campos.");
  }

  if (new Date(fechaFin) < new Date(fechaInicio)) {
    redirect("/dashboard?message=La fecha final no puede ser anterior a la fecha inicial.");
  }

  const { error } = await supabase.from("vacaciones").insert({
    usuario_id: user.id,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    motivo,
  });

  if (error) {
    redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?message=Solicitud enviada.");
}

export async function resolveVacationRequest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const id = Number(formData.get("id"));
  const estado = value(formData, "estado");
  const comentario = value(formData, "comentario_admin");

  if (!id || !["aprobado", "rechazado"].includes(estado)) {
    redirect("/dashboard?message=No se pudo resolver la solicitud.");
  }

  const { error } = await supabase
    .from("vacaciones")
    .update({
      estado,
      comentario_admin: comentario || null,
      autorizado_por: user.id,
      fecha_respuesta: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?message=Solicitud actualizada.");
}

export async function updateUserProfile(formData: FormData) {
  const supabase = await createClient();
  const id = value(formData, "id");
  const nombre = value(formData, "nombre");
  const rolId = Number(formData.get("rol_id"));

  if (!id || !nombre || ![1, 2].includes(rolId)) {
    redirect("/dashboard?message=Datos de perfil invalidos.");
  }

  const { data: ok, error } = await supabase.rpc("admin_update_profile", {
    target_user_id: id,
    new_nombre: nombre,
    new_rol_id: rolId,
  });

  if (error || !ok) {
    redirect(
      `/dashboard?message=${encodeURIComponent(
        error?.message ?? "No tienes permisos para actualizar este perfil.",
      )}`,
    );
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?message=Perfil actualizado.");
}

export async function clearUserSession(formData: FormData) {
  const supabase = await createClient();
  const id = value(formData, "id");

  if (!id) {
    redirect("/dashboard?message=Usuario invalido.");
  }

  const { data: ok, error } = await supabase.rpc("admin_clear_user_session", {
    target_user_id: id,
  });

  if (error || !ok) {
    redirect(
      `/dashboard?message=${encodeURIComponent(
        error?.message ?? "No tienes permisos para liberar esta sesion.",
      )}`,
    );
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?message=Sesion de usuario liberada.");
}
