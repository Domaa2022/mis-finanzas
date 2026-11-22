"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { signUp } from "@/lib/auth/actions";
import { registerSchema, type RegisterInput } from "@/lib/auth/schemas";
import { AuthCard } from "./AuthCard";
import { OAuthButtons } from "./OAuthButtons";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const footer = (
    <>
      ¿Ya tienes cuenta?{" "}
      <Link href="/login" className="font-semibold">
        Inicia sesión
      </Link>
    </>
  );

  if (sentTo) {
    return (
      <AuthCard title="Revisa tu correo" footer={footer}>
        <Alert tone="info" title="Ya casi está">
          {sentTo}
        </Alert>
      </AuthCard>
    );
  }

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      setError(null);
      const result = await signUp(values);
      if (!result) return;
      if (!result.ok) setError(result.error);
      else if (result.message) setSentTo(result.message);
    }),
  );

  return (
    <AuthCard title="Crea tu cuenta" subtitle="Empieza a ordenar tus cuentas y ahorros hoy." footer={footer}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4 lg:gap-5">
        {error && <Alert title="No pudimos crear tu cuenta">{error}</Alert>}
        <Field label="Nombre" error={formState.errors.name?.message}>
          <Input autoComplete="given-name" placeholder="Cómo quieres que te llamemos" {...register("name")} />
        </Field>
        <Field label="Correo electrónico" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="tu@correo.com" {...register("email")} />
        </Field>
        <Field label="Contraseña" hint="Al menos 8 caracteres." error={formState.errors.password?.message}>
          <PasswordInput autoComplete="new-password" {...register("password")} />
        </Field>
        <Button type="submit" block disabled={pending} aria-busy={pending}>
          {pending ? "Creando tu cuenta…" : "Crear cuenta"}
        </Button>
        <OAuthButtons verb="Registrarse" onError={setError} />
      </form>
    </AuthCard>
  );
}
