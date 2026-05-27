import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

export const SESSION_COOKIE_NAME = "browser_session_token";

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export async function startSingleBrowserSession(supabase: SupabaseClient) {
  const cookieStore = await cookies();
  const browserToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const token = browserToken || crypto.randomUUID();

  const { data: allowed, error } = await supabase.rpc("start_browser_session", {
    browser_token: token,
  });

  if (error || !allowed) {
    await supabase.auth.signOut();
    cookieStore.delete(SESSION_COOKIE_NAME);

    return {
      ok: false,
      message: error
        ? `No se pudo validar la sesion unica: ${error.message}`
        : "Acceso denegado: ya existe una sesion activa en otro navegador.",
    };
  }

  cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);

  return { ok: true, message: "" };
}

export async function hasValidBrowserSession(
  supabase: SupabaseClient,
  userId: string,
) {
  const cookieStore = await cookies();
  const browserToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!browserToken) {
    return false;
  }

  const { data } = await supabase
    .from("perfiles")
    .select("active_session_token")
    .eq("id", userId)
    .single();

  return data?.active_session_token === browserToken;
}

export async function clearSingleBrowserSession(
  supabase: SupabaseClient,
) {
  const cookieStore = await cookies();
  const browserToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (browserToken) {
    await supabase.rpc("clear_browser_session", {
      browser_token: browserToken,
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
