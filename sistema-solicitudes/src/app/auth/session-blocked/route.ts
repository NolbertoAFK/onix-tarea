import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session-control";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_MESSAGE =
  "Sesion bloqueada: esta cuenta tiene una sesion activa previa en otro navegador.";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const message = requestUrl.searchParams.get("message") || DEFAULT_MESSAGE;
  const supabase = await createClient();
  const cookieStore = await cookies();

  await supabase.auth.signOut();
  cookieStore.delete(SESSION_COOKIE_NAME);

  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("message", message);

  return NextResponse.redirect(loginUrl);
}
