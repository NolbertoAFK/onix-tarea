"use client";

import { CalendarDays, LogIn, MailPlus } from "lucide-react";
import { useState } from "react";
import {
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
} from "@/app/auth/actions";

type AuthPanelProps = {
  message?: string;
};

export function AuthPanel({ message }: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const hasBlockedSession = message?.startsWith("Sesion bloqueada") ?? false;

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-5 sm:py-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white shadow-sm sm:mb-8">
              <CalendarDays aria-hidden="true" size={24} />
            </div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-accent sm:text-sm">
              Recursos humanos
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-5xl">
              Sistema de vacaciones
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-600 sm:mt-5 sm:text-base sm:leading-7">
              Solicitudes claras para usuarios y autorizaciones rapidas para administradores.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-6">
            <div className="mb-5 grid grid-cols-2 rounded-lg border border-border bg-surface-muted p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`min-h-11 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  mode === "login" ? "bg-surface text-primary shadow-sm" : "text-neutral-600"
                }`}
              >
                Ingresar
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`min-h-11 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  mode === "register" ? "bg-surface text-primary shadow-sm" : "text-neutral-600"
                }`}
              >
                Crear cuenta
              </button>
            </div>

            {message ? (
              <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {message}
              </div>
            ) : null}

            <form action={mode === "login" ? signInWithPassword : signUpWithPassword} className="space-y-4">
              {mode === "register" ? (
                <label className="block text-sm font-medium text-neutral-700">
                  Nombre
                  <input
                    required
                    name="nombre"
                    type="text"
                    autoComplete="name"
                    className="mt-1 min-h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-base outline-none ring-primary/20 transition focus:border-primary focus:ring-4 sm:text-sm"
                  />
                </label>
              ) : null}

              <label className="block text-sm font-medium text-neutral-700">
                Correo
                <input
                  required
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="mt-1 min-h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-base outline-none ring-primary/20 transition focus:border-primary focus:ring-4 sm:text-sm"
                />
              </label>

              <label className="block text-sm font-medium text-neutral-700">
                Contrasena
                <input
                  required
                  name="password"
                  type="password"
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="mt-1 min-h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-base outline-none ring-primary/20 transition focus:border-primary focus:ring-4 sm:text-sm"
                />
              </label>

              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
              >
                {mode === "login" ? <LogIn aria-hidden="true" size={18} /> : <MailPlus aria-hidden="true" size={18} />}
                {mode === "login" ? "Iniciar sesion" : "Registrar usuario"}
              </button>

              {mode === "login" && hasBlockedSession ? (
                <button
                  type="submit"
                  name="force_previous_session"
                  value="1"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                >
                  <LogIn aria-hidden="true" size={18} />
                  Cerrar sesion anterior e ingresar
                </button>
              ) : null}
            </form>

            <div className="my-5 h-px bg-border" />

            <form action={signInWithGoogle}>
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-surface-muted"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs font-bold text-primary">
                  G
                </span>
                Continuar con Google
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
