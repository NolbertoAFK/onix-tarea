import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/AuthPanel";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isBlockedMessage = params.message?.startsWith("Sesion bloqueada");

  if (user && !isBlockedMessage) {
    redirect("/dashboard");
  }

  return <AuthPanel message={params.message} />;
}
