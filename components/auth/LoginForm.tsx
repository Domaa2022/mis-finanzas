"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { signIn } from "@/lib/auth/actions";
import { authErrorMessage } from "@/lib/auth/errors";
import { loginSchema, type LoginInput } from "@/lib/auth/schemas";
import { AuthCard } from "./AuthCard";
import { OAuthButtons } from "./OAuthButtons";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? undefined;
  const urlError = params.get("error");
  const [error, setError] = useState<string | null>(urlError ? authErrorMessage({ code: urlError }) : null);
  const [credentialsError, setCredentialsError] = useState(false);
  const [pending, startTransition] = useTransition();

  const { register, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      setError(null);
      setCredentialsError(false);
      const result = await signIn(values, next);
      if (result && !result.ok) {
        setError(result.error);
        setCredentialsError(result.error === authErrorMessage({ code: "invalid_credentials" }));
      }
    }),
  );

  const passwordError = formState.errors.password?.message ?? (credentialsError ? "Contraseña incorrecta" : undefined);

  return (
    <AuthCard
      title="Inicia sesión"
      subtitle="Retoma tus gastos y ahorros donde los dejaste."
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-semibold">
            Crea una gratis
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4 lg:gap-5">
        {error && <Alert title="No pudimos iniciar tu sesión">{error}</Alert>}

        <Field label="Correo electrónico" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="tu@correo.com" {...register("email")} />
        </Field>

        <div className="flex flex-col gap-1.5">
          <Field label="Contraseña" error={passwordError}>
            <PasswordInput autoComplete="current-password" placeholder="••••••••" {...register("password")} />
          </Field>
          <Link href="/recuperar" className="self-end py-1.5 text-sm font-medium">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <label className="flex min-h-6 cursor-pointer items-center gap-2.5 text-sm text-ink-2">
          <input type="checkbox" className="size-[18px] accent-primary" {...register("remember")} />
          Mantener la sesión iniciada
        </label>

        <Button type="submit" block disabled={pending} aria-busy={pending}>
          {pending ? "Iniciando sesión…" : "Iniciar sesión"}
        </Button>

        <OAuthButtons next={next} onError={setError} />
      </form>
    </AuthCard>
  );
}
