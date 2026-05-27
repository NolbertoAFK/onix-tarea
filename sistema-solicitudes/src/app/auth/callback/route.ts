import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startSingleBrowserSession } from "@/lib/session-control";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const session = await startSingleBrowserSession(supabase);

      if (!session.ok) {
        const url = new URL("/login", requestUrl.origin);
        url.searchParams.set("message", session.message);
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
