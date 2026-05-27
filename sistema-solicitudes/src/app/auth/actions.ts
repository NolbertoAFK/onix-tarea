"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clearSingleBrowserSession, startSingleBrowserSession } from "@/lib/session-control";

function getFormValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function loginRedirect(message: string): never {
  redirect(`/login?message=${encodeURIComponent(message)}`);
}

export async function signInWithPassword(formData: FormData) {
  const email = getFormValue(formData, "email");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    loginRedirect("Correo o contrasena incorrectos.");
  }

  if (!data.user) {
    loginRedirect("No se pudo recuperar el usuario autenticado.");
  }

  const session = await startSingleBrowserSession(supabase);

  if (!session.ok) {
    loginRedirect(session.message);
  }

  redirect("/dashboard");
}

export async function signUpWithPassword(formData: FormData) {
  const nombre = getFormValue(formData, "nombre");
  const email = getFormValue(formData, "email");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: nombre,
        name: nombre,
      },
    },
  });

  if (error) {
    loginRedirect(error.message);
  }

  if (data.session && data.user) {
    const session = await startSingleBrowserSession(supabase);

    if (!session.ok) {
      loginRedirect(session.message);
    }

    redirect("/dashboard");
  }

  redirect(
    "/login?message=Cuenta creada. Inicia sesion o revisa tu correo si Supabase requiere confirmacion.",
  );
}

export async function signInWithGoogle() {
  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  const redirectUrl = data.url;

  if (error || !redirectUrl) {
    return loginRedirect("No se pudo iniciar sesion con Google.");
  }

  redirect(redirectUrl);
}

export async function signOut() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await clearSingleBrowserSession(supabase);
  }

  await supabase.auth.signOut();
  redirect("/login");
}
